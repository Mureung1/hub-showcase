import type { AiProvider, SourceAnswer } from "@decision-log/shared";

import { loadEnv } from "../../shared/config/env.js";
import {
  ManagerCallError,
  type BuildAgendaDraftsResult,
  type Candidate,
  type ManagerMeta,
  type ManagerMetrics,
  type PipelineSection,
  type PipelineTrace,
} from "./agendas.types.js";
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

function toClassifiableSection(section: PipelineSection): ClassifiableSection {
  return {
    id: section.sectionId,
    provider: section.provider,
    title: section.title,
    content: section.content,
  };
}

export async function buildAgendaDrafts(
  questionId: string,
  sourceAnswers: SourceAnswer[],
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
    stageDurationsMs: { stage3: null, stage4: null, total: 0 },
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
  const needsStage4 =
    leftoverSections.length >= 1 || suspiciousCandidates.length >= 1;
  if (needsStage4) {
    trace.stage4Ran = true;
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
