/**
 * SPEC-UI-001 0.6의 임시 계약.
 * SPEC-SCHEMA-001(Zod)에서 확정 시 변경될 수 있으나 최종 정책과 같은 필드명을 사용한다.
 */

export type Provider = "claude" | "openai" | "gemini";

export type QuestionStatus =
  | "draft"
  | "processing"
  | "review_required"
  | "completed";

export type SourceAnswerStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed";

/** sectionId 필수 (고정 요구사항 — Agenda 근거 추적용) */
export interface AnswerSection {
  sectionId: string;
  title: string;
  content: string;
}

export interface SourceAnswer {
  id: string;
  provider: Provider;
  status: SourceAnswerStatus;
  retryCount: 0 | 1;
  excludedFromComparison: boolean;
  sections: AnswerSection[];
  /**
   * 제외된 Provider 열에 표시할 Mock 에러 코드 (예: PROVIDER_TIMEOUT, Step 4-4).
   * 0.6 임시 계약에 대한 보조 필드이며 실패 시나리오(T-009)에서 채운다.
   */
  errorCode?: string;
}

export type AgendaStatus =
  | "draft"
  | "conflicted"
  | "recheck_requested"
  | "reanswered"
  | "passed"
  | "rejected";

export type AgendaResolutionReason =
  | null
  | "auto_consensus"
  | "user_accepted"
  | "user_accepted_after_recheck"
  | "user_composed"
  | "user_composed_after_recheck"
  | "user_rejected"
  | "user_rejected_after_recheck";

/** Agenda 근거가 된 SourceAnswer와 Section 참조 (source_refs 고정 요구사항) */
export interface AgendaSourceRef {
  sourceAnswerId: string;
  sectionId: string;
}

export interface AgendaStance {
  provider: string;
  text: string;
  sourceRefs: AgendaSourceRef[];
}

export interface Agenda {
  id: string;
  status: AgendaStatus;
  resolutionReason: AgendaResolutionReason;
  title: string;
  summary: string;
  stances: AgendaStance[];
  /** Consensus도 합의 내용을 가진다 (고정 정책) */
  selectedContent: string | null;
  recheckResult: string | null;
  /**
   * 재검토 요청 시 사용자가 입력한 내용 (Step 6-4).
   * 0.6 임시 계약에 대한 보조 필드 — SPEC-SCHEMA-001에서 확정한다.
   */
  recheckRequest?: string;
}

export type FinalAnswerGenerationMode =
  | "multi_source"
  | "single_source_fallback"
  | "all_agendas_rejected";

export interface FinalAnswer {
  content: string;
  generationMode: FinalAnswerGenerationMode;
}

export interface Question {
  id: string;
  content: string;
  status: QuestionStatus;
  sourceAnswers: SourceAnswer[];
  /** Mock Manager 비교 결과 — SourceAnswer가 모두 최종 상태가 된 뒤 채워진다 */
  agendas: Agenda[];
  /** 모든 Agenda가 passed/rejected가 되면 자동 생성된다 (Question당 1회, 재생성 없음) */
  finalAnswer: FinalAnswer | null;
}

/** 아직 사용자 판단이 남은 Agenda (conflicted·recheck_requested·reanswered) */
export function isAgendaUnresolved(agenda: Agenda): boolean {
  return agenda.status !== "passed" && agenda.status !== "rejected";
}

/**
 * SourceAnswer가 최종 상태에 도달했는지 여부.
 * succeeded, 또는 재시도(1회)까지 실패해 비교에서 제외된 경우만 최종이다.
 * 첫 실패(retryCount 0의 failed)는 자동 재시도가 남아 있어 최종이 아니다.
 */
export function isSourceAnswerSettled(answer: SourceAnswer): boolean {
  return (
    answer.status === "succeeded" ||
    (answer.status === "failed" && answer.excludedFromComparison)
  );
}

export interface Chat {
  id: string;
  /** 첫 질문 앞 100자 */
  title: string;
  questions: Question[];
}

/** 미완료 Question(processing / review_required) 존재 여부 — Chat 목록 ● 표시와 새 질문 차단 기준 */
export function hasIncompleteQuestion(chat: Chat): boolean {
  return chat.questions.some(
    (q) => q.status === "processing" || q.status === "review_required",
  );
}
