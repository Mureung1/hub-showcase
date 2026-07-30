import type { AiProvider } from "@decision-log/shared";

import {
  ManagerCallError,
  type AgendaDraft,
  type DraftSourceRef,
  type ManagerQualityMetrics,
} from "../agendas.types.js";
import { getConflictComparator } from "../adapters/conflictComparator.registry.js";
import type { ComparableSection } from "../ports/conflictComparator.port.js";
import {
  buildCodeStances,
  groundStances,
  type RejectedQuote,
} from "./grounding.js";
import {
  finalizeAgenda,
  mapDisagreementToKind,
  type FinalizedAgenda,
  type JudgedDraft,
} from "./finalize.js";
import { mapWithConcurrency } from "./concurrency.js";
import { fnv1a } from "./pickPivot.js";
import { seededShuffle } from "./shuffle.js";

/**
 * 단계 6 · 합의/충돌 판정 오케스트레이션 (SPEC-AI-002 §8) + 단계 7 마감 호출.
 *
 * - **쟁점별 개별 호출 + 병렬**(동시성 `MANAGER_CONCURRENCY`). 쟁점끼리 독립이므로 나눈다(§8.2).
 * - 참여 provider가 1개인 쟁점은 **호출하지 않는다**(§7.3). 그래도 단계 7은 거친다(§7.6).
 * - **판정이 끝난 쟁점부터 즉시** `onJudged`로 흘린다(§2.3·§12.2). 모아서 보내지 않는다 —
 *   전부 끝나고 한 번에 보내면 조기 표시가 사라져 체감 지연이 그대로 남는다.
 */

/** confidence는 관측용이다(결정 9). 계약(0~1)을 벗어난 값은 형식 오차로 보고 잘라 담는다. */
function clampConfidence(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * §8.3 — 이 쟁점의 입력 섹션. provider 순서는 `fnv1a(questionId + agendaId)`로 셔플한다.
 * 같은 provider의 여러 섹션은 원래 순서를 유지한 채 묶어서 함께 움직인다.
 */
function buildComparableSections(
  refs: DraftSourceRef[],
  questionId: string,
  agendaId: string,
): ComparableSection[] {
  const byProvider = new Map<AiProvider, DraftSourceRef[]>();
  for (const ref of refs) {
    const list = byProvider.get(ref.provider) ?? [];
    list.push(ref);
    byProvider.set(ref.provider, list);
  }
  // provider 키를 알파벳순으로 고정한 뒤 셔플한다 — Map 삽입 순서에 결과가 흔들리지 않게(AC1).
  const providers = [...byProvider.keys()].sort();
  const shuffled = seededShuffle(providers, fnv1a(questionId + agendaId));

  return shuffled.flatMap((provider) =>
    (byProvider.get(provider) ?? []).map((ref) => ({
      provider: ref.provider,
      sectionId: ref.sectionId,
      title: ref.title,
      content: ref.content,
    })),
  );
}

export interface JudgeDraftsInput {
  questionId: string;
  /** 원 질문. 판정의 맥락이자 비신뢰 입력(§16.1). */
  questionMessage: string;
  drafts: AgendaDraft[];
  pivotProvider: AiProvider;
  /** 판정 시점의 `MANAGER_CONFLICT_TYPES`(결정 6). */
  conflictTypes: string[];
  concurrency: number;
  /** 쟁점 하나가 마감될 때마다 즉시 호출된다(조기 표시). 저장·SSE를 여기에 건다. */
  onJudged?: (agenda: FinalizedAgenda) => Promise<void> | void;
}

export interface JudgeDraftsResult {
  /** 마감된 쟁점. §11-4로 폐기된 것은 빠져 있다. */
  agendas: FinalizedAgenda[];
  /** §11-4로 폐기된 쟁점의 임시 라벨. `agendaDropRate` 분자. */
  droppedAgendaIds: string[];
  quality: ManagerQualityMetrics;
  /**
   * 폐기된 quote 내역 — `quoteRejectRate`가 임계를 넘었을 때 원인을 가르는 관측값이다.
   * ⚠️ Manager 출력 조각이므로 **저장하지 않는다**(§16.3). 검증 스크립트에서만 읽는다.
   */
  rejectedQuotes: RejectedQuote[];
  /**
   * quote 검증 전에 통째로 버려진 stance의 사유별 합계.
   * `agendaDropRate`가 튀었는데 `quoteRejectRate`가 0%일 때 원인이 여기 있다.
   */
  stancesDiscarded: Record<string, number>;
  /** 병렬 wall-clock(ms). 쟁점당 지연은 quality.stage6DurationsMs. */
  wallClockMs: number;
}

export async function judgeDrafts(
  input: JudgeDraftsInput,
): Promise<JudgeDraftsResult> {
  const {
    questionId,
    questionMessage,
    drafts,
    pivotProvider,
    conflictTypes,
    concurrency,
    onJudged,
  } = input;

  const comparator = getConflictComparator();

  const quality: ManagerQualityMetrics = {
    quoteRejectRate: null,
    agendaDropRate: null,
    judgeFailRate: null,
    disagreementTypeDist: {},
    confidences: [],
    stage6OutputTokens: [],
    stage6DurationsMs: [],
    // 저장되는 지표 안에 둔다 — manager_meta 까지 도달해야 사후 진단이 된다.
    stancesDiscarded: { empty_output: 0, empty_quotes: 0, not_participant: 0, duplicate_provider: 0 },
  };

  let quotesTotal = 0;
  let quotesRejected = 0;
  let judgedCount = 0;
  let judgeFailedCount = 0;
  const droppedAgendaIds: string[] = [];
  const rejectedQuotes: RejectedQuote[] = [];

  const startedAt = performance.now();

  const settle = async (
    draft: AgendaDraft,
  ): Promise<FinalizedAgenda | null> => {
    const participants = [
      ...new Set(draft.sourceRefs.map((ref) => ref.provider)),
    ].sort();

    let judged: JudgedDraft;

    if (draft.participantCount <= 1) {
      // §7.3 — 비교할 상대가 없다. 단계 6을 건너뛰고 stance는 코드가 만든다(§7.6).
      // 판정 실패(§2.5)와 형식은 같지만 kind가 다르다. 두 경로를 섞지 않는다.
      judged = {
        draft,
        kind: "single_source",
        stances: buildCodeStances(draft.sourceRefs),
        disagreementType: null,
        confidence: null,
        judgeFailed: false,
      };
    } else {
      judgedCount += 1;
      const callStart = performance.now();
      try {
        const result = await comparator.compare({
          question: questionMessage,
          agendaTitle: draft.title,
          sections: buildComparableSections(
            draft.sourceRefs,
            questionId,
            draft.id,
          ),
          participants,
        });
        quality.stage6DurationsMs.push(
          Math.round(performance.now() - callStart),
        );
        if (result.outputTokens !== null) {
          quality.stage6OutputTokens.push(result.outputTokens);
        }

        // §11 — 저장 전에 근거를 검증한다. 날조된 인용은 여기서 사라진다.
        const grounded = groundStances(
          result.output,
          draft.sourceRefs,
          participants,
        );
        quotesTotal += grounded.quotesTotal;
        quotesRejected += grounded.quotesRejected;
        rejectedQuotes.push(...grounded.rejected);
        for (const [reason, count] of Object.entries(grounded.stancesDiscarded)) {
          quality.stancesDiscarded[reason] =
            (quality.stancesDiscarded[reason] ?? 0) + count;
        }

        if (grounded.stances.length === 0) {
          // §11-4 — stance가 0개가 된 쟁점은 통째로 폐기한다.
          droppedAgendaIds.push(draft.id);
          return null;
        }

        const type = result.output.disagreementType;
        quality.disagreementTypeDist[type] =
          (quality.disagreementTypeDist[type] ?? 0) + 1;
        const confidence = clampConfidence(result.output.confidence);
        if (confidence !== null) quality.confidences.push(confidence);

        judged = {
          draft,
          kind: mapDisagreementToKind(type, conflictTypes),
          stances: grounded.stances,
          disagreementType: type,
          confidence,
          judgeFailed: false,
        };
      } catch (error) {
        // §B — 구조화 출력 거부는 우회·강등하지 않고 즉시 드러낸다.
        if (
          error instanceof ManagerCallError &&
          error.structuredOutputUnsupported
        ) {
          throw error;
        }
        quality.stage6DurationsMs.push(
          Math.round(performance.now() - callStart),
        );
        judgeFailedCount += 1;
        // §2.5 — 판정에 실패했다고 쟁점을 폐기하면 정보가 사라진다.
        // 코드가 최소 stance를 만들고 안전 방향(conflict)으로 넘겨 사용자가 3열 원문으로 판단한다.
        judged = {
          draft,
          kind: "conflict",
          stances: buildCodeStances(draft.sourceRefs),
          disagreementType: null,
          confidence: null,
          judgeFailed: true,
        };
      }
    }

    if (judged.stances.length === 0) {
      // 코드 생성 stance마저 만들 수 없는 쟁점(원문이 비어 있는 경우) — §11-4로 폐기한다.
      droppedAgendaIds.push(draft.id);
      return null;
    }

    const finalized = finalizeAgenda(judged, pivotProvider, questionId);
    // 조기 표시 — 이 쟁점만 즉시 저장·발신한다. 다른 쟁점을 기다리지 않는다.
    await onJudged?.(finalized);
    return finalized;
  };

  const settled = await mapWithConcurrency(drafts, concurrency, settle);
  const agendas = settled.filter(
    (item): item is FinalizedAgenda => item !== null,
  );

  quality.quoteRejectRate =
    quotesTotal > 0 ? quotesRejected / quotesTotal : null;
  quality.agendaDropRate =
    drafts.length > 0 ? droppedAgendaIds.length / drafts.length : null;
  quality.judgeFailRate =
    judgedCount > 0 ? judgeFailedCount / judgedCount : null;

  return {
    agendas,
    droppedAgendaIds,
    quality,
    rejectedQuotes,
    stancesDiscarded: quality.stancesDiscarded,
    wallClockMs: Math.round(performance.now() - startedAt),
  };
}
