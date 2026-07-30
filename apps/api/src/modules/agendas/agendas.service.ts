import type { SupabaseClient } from "@supabase/supabase-js";
import {
  NO_VALUE,
  type Agenda,
  type AgendaResolutionReason,
  type AiProvider,
  type SourceAnswer,
  type SourceRef,
} from "@decision-log/shared";

import { loadEnv } from "../../shared/config/env.js";
import { AppError } from "../../shared/http/appError.js";
import { getAdminClient } from "../../shared/supabase/adminClient.js";
import {
  ManagerCallError,
  type BuildAgendaDraftsResult,
  type Candidate,
  type ManagerMeta,
  type ManagerMetrics,
  type ManagerQualityMetrics,
  type PipelineSection,
  type PipelineTrace,
} from "./agendas.types.js";
import * as repo from "./agendas.repository.js";
import { judgeDrafts } from "./pipeline/judge.js";
import { getAgendaClassifier } from "./adapters/agendaClassifier.registry.js";
import type {
  AgendaRef,
  ClassifiableSection,
} from "./ports/agendaClassifier.port.js";
import { fnv1a, pickPivot } from "./pipeline/pickPivot.js";
import { seededShuffle } from "./pipeline/shuffle.js";
import { mapWithConcurrency } from "./pipeline/concurrency.js";
import { agendaLabel, isSuspiciousTitle } from "./pipeline/suspiciousTitle.js";
import { finalizeDrafts, firstSentence } from "./pipeline/postProcess.js";

/**
 * Manager 분류 파이프라인 단계 1~5 (SPEC-AI-002 §2~§7).
 * SourceAnswer 배열 → 균일 초안 배열 + 실행 메타. Manager를 실제로 호출한다(단계 3·4).
 * DB에 쓰지 않는다 — 저장·단계 6·7은 T-019.3.
 */

/** 성공한 SourceAnswer에서 파이프라인 섹션을 뽑는다(§3.1 대상 필터 포함). */
function toPipelineSections(sourceAnswers: SourceAnswer[]): PipelineSection[] {
  const sections: PipelineSection[] = [];
  for (const answer of sourceAnswers) {
    if (answer.status !== "succeeded" || answer.excludedFromComparison) continue;
    if (!answer.structuredContent) continue;
    for (const section of answer.structuredContent.sections) {
      sections.push({
        provider: answer.provider,
        sourceAnswerId: answer.id,
        sectionId: section.sectionId,
        title: section.title,
        content: section.content,
        order: section.order,
      });
    }
  }
  return sections;
}

function toAgendaRef(candidate: Candidate): AgendaRef {
  return { id: candidate.id, title: candidate.title };
}

/** 단계 6을 타지 않은 경로에서도 지표 형태를 동일하게 유지한다(소비 쪽 분기 제거). */
function emptyQualityMetrics(): ManagerQualityMetrics {
  return {
    quoteRejectRate: null,
    agendaDropRate: null,
    judgeFailRate: null,
    disagreementTypeDist: {},
    confidences: [],
    stage6OutputTokens: [],
    stage6DurationsMs: [],
    stancesDiscarded: {},
    stanceSurvival: [],
    stancesFilled: 0,
  };
}

function toClassifiableSection(section: PipelineSection): ClassifiableSection {
  return {
    id: section.sectionId,
    provider: section.provider,
    title: section.title,
    content: section.content,
  };
}

/**
 * Manager 진행 알림(§12.2). Service는 req/res를 모르므로 콜백으로만 노출한다.
 * 결과가 아니라 **경과**이며 저장하지 않는다 — 화면의 무음 구간을 없애는 것이 목적이다.
 */
export type StageProgress = (
  stage: "classify" | "leftover" | "finalize" | "judge",
  done: number | null,
  total: number | null,
) => void;

export async function buildAgendaDrafts(
  questionId: string,
  sourceAnswers: SourceAnswer[],
  onProgress?: StageProgress,
): Promise<BuildAgendaDraftsResult> {
  const env = loadEnv();
  const classifier = getAgendaClassifier();
  const startedAt = performance.now();

  const allSections = toPipelineSections(sourceAnswers);
  const byProvider = new Map<AiProvider, PipelineSection[]>();
  for (const section of allSections) {
    const list = byProvider.get(section.provider) ?? [];
    list.push(section);
    byProvider.set(section.provider, list);
  }
  const providers = [...byProvider.keys()];

  if (providers.length === 0) {
    // §3.1: 성공 0개는 상위(§6.2)에서 이미 종결된다. 여기 오면 안 되므로 명확히 실패시킨다.
    throw new ManagerCallError(
      "UNKNOWN_ERROR",
      false,
      "성공한 SourceAnswer가 없어 분류할 수 없습니다.",
    );
  }

  const shuffleSeed = fnv1a(questionId);
  const pivot = pickPivot(
    providers.map((provider) => ({
      provider,
      sectionCount: byProvider.get(provider)!.length,
    })),
    questionId,
  );

  const metrics: ManagerMetrics = {
    reassignmentRate: null,
    multiAssignRate: null,
    titleRevisionRate: null,
    leftoverRate: null,
    pivotProvider: pivot.provider,
    stage3OutputTokens: null,
    stageDurationsMs: { stage3: null, stage4: null, stage6: null, total: 0 },
    // 단계 6·7은 judgeDrafts가 채운다. 그 경로를 타지 않아도 형태는 유지한다.
    quality: emptyQualityMetrics(),
  };

  const trace: PipelineTrace = {
    leftoverSectionIds: [],
    reassignments: [],
    newAgendaIds: [],
    titleRevisions: [],
    stage3Calls: [],
    stage3bInvoked: false,
    stage3Failed: false,
    stage4Ran: false,
  };

  const baseMeta = (): ManagerMeta => ({
    pivotProvider: pivot.provider,
    pivotSelectionReason: pivot.reason,
    shuffleSeed,
    managerModel: env.MANAGER_MODEL,
    classifierVersion: classifier.version,
    comparatorVersion: env.COMPARATOR_PROMPT_VERSION,
    conflictTypes: env.MANAGER_CONFLICT_TYPES.split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0),
    metrics,
  });

  // --- §3.4 성공 1개 특수 경로 (LLM 0회) ---
  if (providers.length === 1) {
    const sections = byProvider.get(pivot.provider)!;
    const candidates: Candidate[] = sections.map((section, index) => ({
      id: agendaLabel(index),
      origin: "pivot",
      title: section.title,
      pivotOrder: section.order,
      createdOrder: 0,
      summarySource: section.content,
      sections: [section],
    }));
    metrics.stageDurationsMs.total = Math.round(performance.now() - startedAt);
    return { drafts: finalizeDrafts(candidates), managerMeta: baseMeta(), trace };
  }

  // --- 정상 경로 (2+ providers) ---
  const pivotSections = [...byProvider.get(pivot.provider)!].sort(
    (a, b) => a.order - b.order,
  );
  const nonPivotSections = allSections.filter(
    (s) => s.provider !== pivot.provider,
  );

  // 단계 2: pivot 섹션마다 쟁점 후보 하나(§4.1)
  const candidates: Candidate[] = pivotSections.map((section, index) => ({
    id: agendaLabel(index),
    origin: "pivot",
    title: section.title,
    pivotOrder: section.order,
    createdOrder: 0,
    summarySource: section.content,
    sections: [section],
  }));
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  let nextLabelIndex = candidates.length;

  const suspiciousCandidates = candidates.filter((c) =>
    isSuspiciousTitle(c.title),
  );

  const sectionById = new Map(nonPivotSections.map((s) => [s.sectionId, s]));

  // 단계 3: 섹션 정렬 (Manager 호출 1)
  const receivedIds = new Set<string>();
  const leftoverIds = new Set<string>();
  let multiAssignCount = 0;
  let stage3Failed = false;

  const applyAssignments = (
    assignments: {
      sectionId: string;
      agendaIds: string[];
    }[],
  ): void => {
    for (const a of assignments) {
      const section = sectionById.get(a.sectionId);
      if (!section) continue; // §7.1-3: 존재하지 않는 섹션 참조 폐기
      receivedIds.add(a.sectionId);
      const targets = a.agendaIds
        .map((id) => candidateById.get(id))
        .filter((c): c is Candidate => c !== undefined);
      if (targets.length === 0) {
        leftoverIds.add(a.sectionId); // 빈 배정 또는 전부 무효 ID → leftover
        continue;
      }
      if (a.agendaIds.length >= 2) multiAssignCount++;
      for (const target of targets) target.sections.push(section);
    }
  };

  // 쟁점 목록은 모든 provider 호출에 동일하게 넣는다(§5.1). 셔플은 한 번만(재현성).
  const shuffledAgendas = seededShuffle<AgendaRef>(
    candidates.map(toAgendaRef),
    shuffleSeed,
  );
  // provider를 알파벳순으로 고정 — 병합 순서를 결정론적으로(AC1).
  const nonPivotProviders = [
    ...new Set(nonPivotSections.map((s) => s.provider)),
  ].sort();

  interface ProviderStage3Result {
    provider: AiProvider;
    ok: boolean;
    tokens: number | null;
    durationMs: number;
    retried: boolean;
    assignments: { sectionId: string; agendaIds: string[] }[];
  }

  // provider 하나에 대한 단계 3 호출(+ 단계 3b). 공유 상태를 건드리지 않고 자기 배정만 모은다.
  const runProvider = async (
    provider: AiProvider,
  ): Promise<ProviderStage3Result> => {
    const secs = nonPivotSections.filter((s) => s.provider === provider);
    const callStart = performance.now();
    try {
      const first = await classifier.classifySections({
        agendas: shuffledAgendas,
        sections: seededShuffle<ClassifiableSection>(
          secs.map(toClassifiableSection),
          shuffleSeed,
        ),
      });
      let assignments = first.output.assignments;
      let tokens = first.outputTokens;
      let retried = false;

      // 단계 3b: 이 provider의 누락 섹션만 1회 재호출 (§5.6, provider 단위)
      const received = new Set(assignments.map((a) => a.sectionId));
      const missing = secs.filter((s) => !received.has(s.sectionId));
      if (missing.length > 0) {
        retried = true;
        try {
          const second = await classifier.classifySections({
            agendas: shuffledAgendas,
            sections: seededShuffle<ClassifiableSection>(
              missing.map(toClassifiableSection),
              shuffleSeed,
            ),
          });
          assignments = [...assignments, ...second.output.assignments];
          if (second.outputTokens !== null) {
            tokens = (tokens ?? 0) + second.outputTokens;
          }
        } catch {
          // 2차도 실패 → 이 provider의 누락 섹션은 leftover (§5.6)
        }
      }
      return {
        provider,
        ok: true,
        tokens,
        durationMs: Math.round(performance.now() - callStart),
        retried,
        assignments,
      };
    } catch (error) {
      // §B: 구조화 출력 거부는 즉시 보고(강등 금지).
      if (
        error instanceof ManagerCallError &&
        error.structuredOutputUnsupported
      ) {
        throw error;
      }
      // §2.5: 이 provider 호출 실패 → 그 섹션만 leftover, 다른 provider는 살린다.
      return {
        provider,
        ok: false,
        tokens: null,
        durationMs: Math.round(performance.now() - callStart),
        retried: false,
        assignments: [],
      };
    }
  };

  // 병렬 실행(동시성 MANAGER_CONCURRENCY). 결과는 입력(정렬) 순서를 보존한다.
  const stage3Start = performance.now();
  // §12.2 — 단계 3 시작. 여기부터 30~60초 무음이므로 먼저 알린다.
  onProgress?.("classify", null, null);

  const stage3Results = await mapWithConcurrency(
    nonPivotProviders,
    env.MANAGER_CONCURRENCY,
    runProvider,
  );
  // 병렬이므로 wall-clock ≈ 가장 느린 호출. (호출당 지연은 trace.stage3Calls에 있다.)
  metrics.stageDurationsMs.stage3 = Math.round(performance.now() - stage3Start);

  // 병합은 provider 정렬 순서대로 — 완료 순서와 무관하게 결정론적(AC1, 요구 4).
  let stage3TotalTokens = 0;
  for (const r of stage3Results) {
    trace.stage3Calls.push({
      provider: r.provider,
      ok: r.ok,
      tokens: r.tokens,
      durationMs: r.durationMs,
      retried: r.retried,
    });
    if (r.retried) trace.stage3bInvoked = true;
    if (r.tokens !== null) stage3TotalTokens += r.tokens;
    if (r.ok) applyAssignments(r.assignments);
  }
  // 합계는 §5.5의 800 가정과 비교하는 용도. 호출당 경고(1,500)는 스크립트가 stage3Calls로 본다.
  metrics.stage3OutputTokens = stage3Results.some((r) => r.ok)
    ? stage3TotalTokens
    : null;
  // §2.5: 모든 provider 호출이 실패했을 때만 완전 실패(전 섹션 leftover).
  stage3Failed =
    stage3Results.length > 0 && stage3Results.every((r) => !r.ok);

  // 단계 3에서 배정되지 못한 섹션 = leftover (빈 배정 + 누락 + 단계 3 전면 실패)
  const leftoverSections = nonPivotSections.filter(
    (s) => stage3Failed || leftoverIds.has(s.sectionId) || !receivedIds.has(s.sectionId),
  );
  trace.stage3Failed = stage3Failed;
  trace.leftoverSectionIds = leftoverSections.map((s) => s.sectionId);

  let reassignCount = 0;
  let titleRevisionCount = 0;
  let lastError: string | undefined;

  // 단계 4: leftover + 제목 중립화 (Manager 호출 2, 조건부, §6.1)
  // (진행 알림은 실제로 호출이 일어나는 분기 안에서 낸다 — 조건부라 밖에서 내면 거짓이 된다.)
  const needsStage4 =
    leftoverSections.length >= 1 || suspiciousCandidates.length >= 1;
  if (needsStage4) {
    trace.stage4Ran = true;
    onProgress?.("leftover", null, null);
    const stage4Start = performance.now();
    const consumed = new Set<string>();
    try {
      const result = await classifier.resolveLeftover({
        existingAgendas: candidates.map(toAgendaRef),
        leftoverSections: leftoverSections.map(toClassifiableSection),
        suspiciousAgendas: suspiciousCandidates.map(toAgendaRef),
      });

      // 1) 재배정 우선 (§7.1-1)
      for (const r of result.output.reassignments) {
        const section = leftoverSections.find(
          (s) => s.sectionId === r.sectionId,
        );
        const target = candidateById.get(r.agendaId);
        if (!section || !target) continue;
        target.sections.push(section);
        consumed.add(section.sectionId);
        reassignCount++;
        trace.reassignments.push({ sectionId: r.sectionId, agendaId: r.agendaId });
      }

      // 2) 새 쟁점 — 재배정된 섹션은 제외
      for (const na of result.output.newAgendas) {
        const secs = na.sectionIds
          .filter((id) => !consumed.has(id))
          .map((id) => leftoverSections.find((s) => s.sectionId === id))
          .filter((s): s is PipelineSection => s !== undefined);
        if (secs.length === 0) continue;
        const id = agendaLabel(nextLabelIndex++);
        const candidate: Candidate = {
          id,
          origin: "new",
          title: na.title,
          pivotOrder: null,
          createdOrder: nextLabelIndex,
          summarySource: na.topicRestated,
          sections: secs,
        };
        candidates.push(candidate);
        candidateById.set(id, candidate);
        trace.newAgendaIds.push(id);
        for (const s of secs) consumed.add(s.sectionId);
      }

      // 3) 제목 중립화
      for (const tr of result.output.titleRevisions) {
        const target = candidateById.get(tr.agendaId);
        if (!target) continue;
        trace.titleRevisions.push({
          agendaId: tr.agendaId,
          before: target.title,
          after: tr.newTitle,
        });
        target.title = tr.newTitle;
        titleRevisionCount++;
      }
    } catch (error) {
      // §B: 구조화 출력 거부는 즉시 보고한다(강등·완전실패 처리로 삼키지 않는다).
      if (
        error instanceof ManagerCallError &&
        error.structuredOutputUnsupported
      ) {
        throw error;
      }
      if (stage3Failed) {
        // §2.5: 단계 3·4 모두 실패 → Manager 완전 실패. 고정 문구 처리는 T-019.3.
        metrics.stageDurationsMs.stage4 = Math.round(
          performance.now() - stage4Start,
        );
        metrics.stageDurationsMs.total = Math.round(
          performance.now() - startedAt,
        );
        return {
          drafts: [],
          managerMeta: {
            ...baseMeta(),
            lastError: "단계 3·4 모두 실패 — Manager 분류 불가",
          },
          trace,
        };
      }
      // §2.5: 단계 4 실패(단계 3은 성공) → leftover를 각각 단일 소스 쟁점으로 승격(코드).
      lastError =
        error instanceof ManagerCallError
          ? `단계 4 실패 — leftover를 코드로 승격 (${error.errorCode})`
          : "단계 4 실패 — leftover를 코드로 승격";
    }

    // 소비되지 못한 leftover(LLM 누락 포함)는 조용히 버리지 않고 단일 소스 쟁점으로 승격한다.
    for (const section of leftoverSections) {
      if (consumed.has(section.sectionId)) continue;
      const id = agendaLabel(nextLabelIndex++);
      const candidate: Candidate = {
        id,
        origin: "new",
        title: section.title,
        pivotOrder: null,
        createdOrder: nextLabelIndex,
        summarySource: firstSentence(section.content),
        sections: [section],
      };
      candidates.push(candidate);
      candidateById.set(id, candidate);
      trace.newAgendaIds.push(id);
    }

    metrics.stageDurationsMs.stage4 = Math.round(
      performance.now() - stage4Start,
    );
  }

  // 단계 5: 후처리 → 균일 초안
  onProgress?.("finalize", null, null);
  const drafts = finalizeDrafts(candidates);

  // 지표 (§14.1) — 분모 0이면 null
  const nonPivotCount = nonPivotSections.length;
  metrics.leftoverRate =
    nonPivotCount > 0 ? leftoverSections.length / nonPivotCount : null;
  metrics.multiAssignRate =
    nonPivotCount > 0 ? multiAssignCount / nonPivotCount : null;
  metrics.reassignmentRate =
    leftoverSections.length > 0
      ? reassignCount / leftoverSections.length
      : null;
  metrics.titleRevisionRate =
    suspiciousCandidates.length > 0
      ? titleRevisionCount / suspiciousCandidates.length
      : null;
  metrics.stageDurationsMs.total = Math.round(performance.now() - startedAt);

  return { drafts, managerMeta: { ...baseMeta(), lastError }, trace };
}

// ---------------------------------------------------------------------------
// Manager 전체 실행 — 단계 1~7 + 저장 + 진행 알림 (SPEC-AI-002 §12.1)
// ---------------------------------------------------------------------------

/**
 * 진행 상황 알림. 전달 방식(SSE·동기)과 무관하게 콜백으로만 노출한다 —
 * Service는 req/res를 받지 않는다(CLAUDE.md 8장).
 */
export interface ManagerProgress {
  /** 단계 5 후 쟁점 목록이 draft로 확정됐을 때 1회. */
  onAgendasCreated?: (agendas: Agenda[]) => Promise<void> | void;
  /** 쟁점 하나의 판정·저장이 끝날 때마다 1건씩. **모아서 보내지 않는다**(§2.3 조기 표시). */
  onAgendaJudged?: (agenda: Agenda) => Promise<void> | void;
  /** 단계 1~6 경과. 결과가 없는 구간의 무음을 없앤다(§12.2). */
  onStage?: StageProgress;
}

export interface RunManagerResult {
  agendas: Agenda[];
  managerMeta: ManagerMeta;
  /** 충돌 쟁점 수. 0이면 Question을 review_required로 전이하지 않는다(§12.1). */
  conflictCount: number;
}

/**
 * Manager 파이프라인 전체를 실행하고 결과를 저장한다 (§12.1).
 *
 * 저장은 두 단계다 — 단계 5 후 목록을 `draft`로 일괄 INSERT 하고, 단계 6이 끝나는
 * 쟁점부터 하나씩 UPDATE 한다. 단계 6이 병렬이라 완료 시점이 제각각인데, 목록을 먼저
 * 확정해두면 중간에 죽어도 쟁점이 남고 SSE와 DB가 어긋나지 않는다.
 *
 * 소유권은 호출부(Controller·prepareGeneration)가 검증된 JWT userId로 이미 확인했다.
 * 여기서의 쓰기는 전부 시스템 쓰기(`adminClient`)다(ADR-002).
 */
export async function runManagerForQuestion(input: {
  questionId: string;
  questionMessage: string;
  sourceAnswers: SourceAnswer[];
  /** 최종 스냅샷을 RLS로 되읽어 돌려주기 위한 사용자 클라이언트. */
  userClient: SupabaseClient;
  progress?: ManagerProgress;
}): Promise<RunManagerResult> {
  const { questionId, questionMessage, sourceAnswers, userClient, progress } =
    input;
  const env = loadEnv();
  const adminClient = getAdminClient();

  // 단계 1~5
  const built = await buildAgendaDrafts(
    questionId,
    sourceAnswers,
    progress?.onStage,
  );

  // §2.5 — 단계 3·4 모두 실패하면 쟁점이 없다. manager_meta만 남기고 조용히 끝낸다.
  // (고정 안내 문구 + completed 마무리는 호출부가 SourceAnswer 경로와 함께 처리한다.)
  if (built.drafts.length === 0) {
    await repo.saveManagerMeta(adminClient, questionId, built.managerMeta);
    return { agendas: [], managerMeta: built.managerMeta, conflictCount: 0 };
  }

  // 저장 1단계 — 쟁점 목록을 draft로 확정한다.
  const created = await repo.insertDrafts(
    adminClient,
    questionId,
    built.drafts,
  );
  await progress?.onAgendasCreated?.(created);

  // 임시 라벨(A·B·C…) → 실제 uuid. 양쪽 다 display_order 순이라 위치로 잇는다.
  const idByDisplayOrder = new Map(
    created.map((agenda) => [agenda.displayOrder, agenda.id] as const),
  );

  // 단계 6·7 — 쟁점별 병렬. 마감되는 쟁점부터 즉시 저장·발신한다.
  const judged = await judgeDrafts({
    questionId,
    questionMessage,
    drafts: built.drafts,
    pivotProvider: built.managerMeta.pivotProvider,
    conflictTypes: built.managerMeta.conflictTypes,
    concurrency: env.MANAGER_CONCURRENCY,
    onProgress: (done, total) => progress?.onStage?.("judge", done, total),
    onJudged: async (finalized) => {
      const agendaId = idByDisplayOrder.get(finalized.draft.displayOrder);
      if (!agendaId) return; // 도달 불가 — INSERT 반환분과 초안은 1:1이다.
      const saved = await repo.updateJudged(
        adminClient,
        agendaId,
        finalized,
        // 단계 6을 타지 않은 쟁점(참여 1개)에는 comparator 버전이 없다(§15.4).
        finalized.draft.participantCount >= 2
          ? built.managerMeta.comparatorVersion
          : null,
      );
      await progress?.onAgendaJudged?.(saved);
    },
  });

  // §11-4로 폐기된 쟁점은 draft 행이 남아 있다. 근거 없는 비교 결과를 정상 데이터로
  // 두지 않기 위해 행 자체를 지운다(§11·CLAUDE.md 12장).
  const droppedIds = judged.droppedAgendaIds
    .map((label) => {
      const draft = built.drafts.find((d) => d.id === label);
      return draft ? idByDisplayOrder.get(draft.displayOrder) : undefined;
    })
    .filter((id): id is string => id !== undefined);
  if (droppedIds.length > 0) {
    await repo.deleteAgendas(adminClient, droppedIds);
  }

  // 지표·실행 메타 저장 (§3.3·§14)
  const managerMeta: ManagerMeta = {
    ...built.managerMeta,
    metrics: {
      ...built.managerMeta.metrics,
      stageDurationsMs: {
        ...built.managerMeta.metrics.stageDurationsMs,
        stage6: judged.wallClockMs,
      },
      quality: judged.quality,
    },
  };
  await repo.saveManagerMeta(adminClient, questionId, managerMeta);

  const conflictCount = judged.agendas.filter(
    (agenda) => agenda.kind === "conflict",
  ).length;

  // §12.1 — 충돌이 있을 때만 사용자 판단을 기다린다.
  // 충돌 0건이면 전이시키지 않는다. 누를 것이 없는데 review_required로 두면 Question이 갇힌다.
  if (conflictCount > 0) {
    await repo.markReviewRequired(adminClient, questionId);
  }

  // 최종 스냅샷은 사용자 클라이언트(RLS)로 되읽는다.
  const agendas = await repo.listByQuestion(userClient, questionId);
  return { agendas, managerMeta, conflictCount };
}

// ---------------------------------------------------------------------------
// 사용자 판단 (§12.4) — 사용자 행동이므로 userClient(RLS)로 쓴다
// ---------------------------------------------------------------------------

/** 이번 범위의 액션 3종. `recheck`·`retry_recheck`는 T-019.4. */
export type UserDecisionAction = "accept" | "compose" | "reject";

export interface UserDecisionInput {
  userClient: SupabaseClient;
  chatId: string;
  questionId: string;
  agendaId: string;
  action: UserDecisionAction;
  /** accept — 채택할 출처. 내용은 서버가 원본에서 되읽는다(클라이언트 값을 신뢰하지 않는다). */
  sourceRef?: SourceRef;
  /** compose — 사용자가 직접 쓴 내용. */
  content?: string;
  userNote?: string | null;
}

/** 사용자 판단을 받을 수 있는 상태(§12.4·domain-policy §4.2). */
const DECIDABLE_STATUSES = new Set(["conflicted", "recheck_requested", "reanswered"]);

/**
 * §12.4 접미사 규칙 — `_after_recheck`는 **`reanswered`에서 온 경우에만** 붙인다.
 * `recheck_requested`(재검토 진행 중 이탈)에서 바로 판단하면 접미사가 붙지 않는다.
 */
function reasonFor(
  action: UserDecisionAction,
  fromStatus: string,
): AgendaResolutionReason {
  const afterRecheck = fromStatus === "reanswered";
  if (action === "accept") {
    return afterRecheck ? "user_accepted_after_recheck" : "user_accepted";
  }
  if (action === "compose") {
    return afterRecheck ? "user_composed_after_recheck" : "user_composed";
  }
  return afterRecheck ? "user_rejected_after_recheck" : "user_rejected";
}

/**
 * 채택·직접 입력·제외를 적용한다(§9.2 사용자 행동 3행).
 * 상태 전이 검증은 여기(Service)서 하고, 허용되지 않은 전이는 409다(§12.4).
 */
export async function applyUserDecision(
  input: UserDecisionInput,
): Promise<Agenda> {
  const { userClient, questionId, agendaId, action } = input;

  const agenda = await repo.findOwnedAgenda(userClient, questionId, agendaId);
  if (!agenda) {
    // RLS로 안 보이거나 없는 경우 — 남의 것이거나 존재하지 않는다. 정보는 은닉한다.
    throw new AppError(404, "AGENDA_NOT_FOUND", "대상 Agenda를 찾을 수 없습니다.");
  }
  if (!DECIDABLE_STATUSES.has(agenda.status)) {
    throw new AppError(
      409,
      "INVALID_AGENDA_TRANSITION",
      `현재 상태(${agenda.status})에서는 이 판단을 적용할 수 없습니다.`,
    );
  }

  const resolutionReason = reasonFor(action, agenda.status);
  const userNote = input.userNote ?? null;

  if (action === "reject") {
    // 제외 — 내용 없음이 아니라 "의도적으로 없음"이므로 NO_VALUE다(1.6 값 부재 규칙).
    return repo.applyUserDecision(userClient, agendaId, {
      status: "rejected",
      resolutionReason,
      selectedContent: null,
      selectedSourceRef: NO_VALUE,
      userNote,
    });
  }

  if (action === "compose") {
    const content = input.content?.trim() ?? "";
    if (content.length === 0) {
      throw new AppError(
        400,
        "VALIDATION_ERROR",
        "직접 입력에는 내용이 필요합니다.",
      );
    }
    return repo.applyUserDecision(userClient, agendaId, {
      status: "passed",
      resolutionReason,
      selectedContent: content,
      selectedSourceRef: NO_VALUE,
      userNote,
    });
  }

  // accept — 클라이언트가 보낸 참조가 이 Agenda의 stance에 실제로 있는지 확인하고,
  // 내용은 저장된 SourceAnswer 원문에서 되읽는다(클라이언트 본문을 신뢰하지 않는다).
  const ref = input.sourceRef;
  if (!ref) {
    throw new AppError(400, "VALIDATION_ERROR", "채택할 출처가 필요합니다.");
  }
  if (!repo.hasSourceRef(agenda.stances, ref)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "이 쟁점의 근거가 아닌 출처는 채택할 수 없습니다.",
    );
  }
  const content = await repo.findSectionContent(
    userClient,
    ref.sourceAnswerId,
    ref.sectionId,
  );
  if (content === null || content.trim().length === 0) {
    throw new AppError(
      404,
      "SOURCE_SECTION_NOT_FOUND",
      "채택할 원문을 찾을 수 없습니다.",
    );
  }

  return repo.applyUserDecision(userClient, agendaId, {
    status: "passed",
    resolutionReason,
    selectedContent: content,
    selectedSourceRef: ref,
    userNote,
  });
}
