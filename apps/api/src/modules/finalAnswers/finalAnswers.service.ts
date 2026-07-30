import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Agenda,
  DecisionNote,
  FinalAnswer,
  SourceAnswer,
} from "@decision-log/shared";

import { loadEnv } from "../../shared/config/env.js";
import { AppError } from "../../shared/http/appError.js";
import { getAdminClient } from "../../shared/supabase/adminClient.js";
import { ManagerCallError } from "../agendas/agendas.types.js";
import { getFinalAnswerComposer } from "./adapters/finalAnswerComposer.registry.js";
import * as repo from "./finalAnswers.repository.js";
import {
  ALL_REJECTED_CONTENT,
  FALLBACK_NOTE_VERSION,
  type ComposeMetrics,
} from "./finalAnswers.types.js";
import { decideGenerationMode } from "./pipeline/generationMode.js";
import { buildFallbackNote } from "./pipeline/fallbackNote.js";
import { buildContext, type BuiltContext } from "./pipeline/context.js";
import type {
  PassedAgendaInput,
  RejectedAgendaInput,
} from "./ports/finalAnswerComposer.port.js";

/**
 * FinalAnswer·DecisionNote 생성 오케스트레이션 (SPEC-AI-003 §2·§5·§6).
 *
 * ```text
 * 확정 확인 → 모드 결정 → (AI 1회 또는 0회) → 저장 → completed 전이
 * ```
 *
 * **호출은 최대 1회다**(결정 2). 전부 rejected면 0회다(§4.1).
 */

export interface ComposeProgress {
  /** §8 — 생성 시작. 충돌 0건 경로의 무음 구간을 막는다. */
  onStart?: () => void;
}

export interface ComposeResult {
  finalAnswer: FinalAnswer;
  decisionNote: DecisionNote;
  metrics: ComposeMetrics;
}

/** §3.1 — Agenda를 프롬프트 입력으로 줄인다. `stances`·`quotes`는 넣지 않는다. */
function toComposerInput(agendas: Agenda[]): {
  passed: PassedAgendaInput[];
  rejected: RejectedAgendaInput[];
} {
  const passed: PassedAgendaInput[] = [];
  const rejected: RejectedAgendaInput[] = [];
  for (const agenda of agendas) {
    if (agenda.status === "passed") {
      passed.push({
        title: agenda.title,
        summary: agenda.summary,
        selectedContent: agenda.selectedContent ?? "",
        sourceRefSummary: agenda.sourceRefs.map((ref) => ref.sectionId),
      });
    } else if (agenda.status === "rejected") {
      rejected.push({ title: agenda.title });
    }
  }
  return { passed, rejected };
}

/** §6.4 — 재현성을 위해 생성에 사용한 것을 그대로 담는다. */
function buildInputSnapshot(input: {
  agendas: Agenda[];
  mode: string;
  excludedProviders: string[];
  model: string;
  promptVersion: string | null;
  metrics: ComposeMetrics;
}): Record<string, unknown> {
  return {
    generationMode: input.mode,
    excludedProviders: input.excludedProviders,
    model: input.model,
    promptVersion: input.promptVersion,
    // ⚠️ user_composed 의 selectedContent 는 **사용자가 직접 쓴 글**이다(§12).
    // §6.4가 저장을 요구하므로 담되, 로그·오류 응답에는 절대 넣지 않는다.
    agendas: input.agendas.map((a) => ({
      id: a.id,
      title: a.title,
      resolutionReason: a.resolutionReason,
      selectedContent: a.selectedContent,
    })),
    metrics: input.metrics,
  };
}

/**
 * FinalAnswer·DecisionNote를 생성해 저장하고 Question을 `completed`로 전이한다.
 *
 * 소유권은 호출부가 검증된 JWT userId로 이미 확인했다. 여기서의 쓰기는 전부
 * 시스템 쓰기(`adminClient`)다(ADR-002 §6.1).
 */
export async function composeForQuestion(input: {
  questionId: string;
  questionMessage: string;
  agendas: Agenda[];
  sourceAnswers: SourceAnswer[];
  /** 최종 스냅샷을 RLS로 되읽기 위한 사용자 클라이언트. */
  userClient: SupabaseClient;
  progress?: ComposeProgress;
}): Promise<ComposeResult> {
  const env = loadEnv();
  const adminClient = getAdminClient();

  // §5.4 — 이미 저장돼 있으면 재생성하지 않는다. **저장된 것에만** 적용된다(§5.1).
  const existing = await repo.findFinalAnswer(adminClient, input.questionId);
  if (existing) {
    throw new AppError(
      409,
      "ALREADY_EXISTS",
      "이 질문의 최종 답변은 이미 생성되었습니다.",
    );
  }

  const { mode, excludedProviders, passedCount, rejectedCount } =
    decideGenerationMode({
      agendas: input.agendas,
      sourceAnswers: input.sourceAnswers,
    });

  const metrics: ComposeMetrics = {
    generationMode: mode,
    durationMs: null,
    completionTokens: null,
    reasoningTokens: null,
    decisionNoteFallback: false,
    timeoutCount: 0,
  };

  let finalContent: string;
  let noteContent: string;
  let promptVersion: string | null = null;

  if (mode === "all_agendas_rejected") {
    // §4.1 — AI를 호출하지 않는다. 고정 문구를 **양쪽에 동일하게** 저장한다(요약하지 않음).
    finalContent = ALL_REJECTED_CONTENT;
    noteContent = ALL_REJECTED_CONTENT;
  } else {
    input.progress?.onStart?.();
    const composer = getFinalAnswerComposer();
    const { passed, rejected } = toComposerInput(input.agendas);
    const composeInput = {
      question: input.questionMessage,
      passed,
      rejected,
      mode,
      excludedProviders,
    };

    const startedAt = performance.now();
    let output;
    try {
      output = await composer.compose(composeInput);
    } catch (error) {
      // §5.1 — 저장하지 않는다. Question은 processing에 남고 좌초 복구가 회수한다.
      if (
        error instanceof ManagerCallError &&
        error.errorCode === "PROVIDER_TIMEOUT"
      ) {
        metrics.timeoutCount += 1;
      }
      throw new AppError(
        502,
        "PROVIDER_ERROR",
        "최종 답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
    metrics.durationMs = Math.round(performance.now() - startedAt);
    metrics.completionTokens = output.completionTokens;
    metrics.reasoningTokens = output.reasoningTokens;
    promptVersion = composer.version;

    finalContent = output.output.finalAnswer.trim();
    if (finalContent.length === 0) {
      throw new AppError(
        502,
        "SCHEMA_VALIDATION_FAILED",
        "최종 답변이 비어 있습니다. 잠시 후 다시 시도해 주세요.",
      );
    }

    // §5.2 — FinalAnswer는 성공했는데 노트만 비는 경우. 1회 재시도 → 그래도 실패면 대체 노트.
    noteContent = output.output.decisionNote.trim();
    if (noteContent.length === 0) {
      try {
        const retry = await composer.composeNoteOnly({
          ...composeInput,
          finalAnswer: finalContent,
        });
        noteContent = retry.decisionNote.trim();
      } catch {
        noteContent = "";
      }
      if (noteContent.length === 0) {
        // **AI가 실패해도 코드가 최소한을 만든다**(§5.3). 갇히지 않게 하는 것이 목적이다.
        noteContent = buildFallbackNote({
          questionMessage: input.questionMessage,
          agendas: input.agendas,
        });
        metrics.decisionNoteFallback = true;
        promptVersion = FALLBACK_NOTE_VERSION;
      }
    }
  }

  // §6.2 — final_answers → decision_notes → questions.completed 순서.
  const finalAnswer = await repo.insertFinalAnswer(adminClient, {
    questionId: input.questionId,
    content: finalContent,
    generationMode: mode,
    promptVersion,
    inputSnapshot: buildInputSnapshot({
      agendas: input.agendas,
      mode,
      excludedProviders,
      model: env.MANAGER_MODEL,
      promptVersion,
      metrics,
    }),
  });

  const decisionNote = await repo.insertDecisionNote(adminClient, {
    questionId: input.questionId,
    content: noteContent,
  });

  // §6.3 — 3단계가 모두 성공해야 completed다. 멱등하므로 web이 먼저 전이했어도 안전하다.
  await repo.markCompleted(adminClient, input.questionId);

  void passedCount;
  void rejectedCount;
  return { finalAnswer, decisionNote, metrics };
}

/**
 * §7 — 다음 Question을 위한 Context를 만든다.
 * `sourceAnswers.service.ts`가 `context_snapshot`에 저장하는 배선에 연결된다.
 */
export async function buildContextForQuestion(input: {
  client: SupabaseClient;
  chatId: string;
  sequenceNumber: number;
}): Promise<BuiltContext> {
  const env = loadEnv();
  const priors = await repo.findPriorQuestions(input.client, {
    chatId: input.chatId,
    beforeSequence: input.sequenceNumber,
  });
  return buildContext({ priors, maxNotes: env.CONTEXT_MAX_NOTES });
}
