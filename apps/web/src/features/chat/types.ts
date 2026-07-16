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

export interface Question {
  id: string;
  content: string;
  status: QuestionStatus;
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
