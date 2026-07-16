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
}

export interface Question {
  id: string;
  content: string;
  status: QuestionStatus;
  sourceAnswers: SourceAnswer[];
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
