import type { Chat, Question } from "@decision-log/shared";

import {
  createChat,
  createQuestion,
  completeQuestion,
  fetchChats,
  fetchQuestions,
  type ApiResult,
} from "./apiClient";

/**
 * apiStorageAdapter (SPEC-DB-001 5장) — Chat·Question을 Express→Supabase로 저장·조회한다.
 * Promise 기반이며, 컴포넌트·Hook은 이 어댑터(또는 apiClient)를 거쳐 서버와 통신한다
 * (localStorage·SDK·fetch 직접 호출 금지, CLAUDE.md 6·7). Mock/메모리 저장을 대체한다.
 *
 * AI 생성물(SourceAnswer·Agenda·FinalAnswer·DecisionNote)은 이 Spec 범위 밖이라
 * 서버에 저장하지 않는다(브라우저 Mock 유지, 0.4 한계).
 */

/** 저장 오류 — 호출부가 code로 분기(예: QUESTION_ALREADY_OPEN)할 수 있게 한다. */
export class ApiStorageError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiStorageError";
    this.code = code;
    this.status = status;
  }
}

function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) return result.value;
  throw new ApiStorageError(result.error.code, result.error.message, result.status);
}

/** Chat 하나와 그 Question 목록(sequence asc). AI 생성물은 포함하지 않는다. */
export interface StoredChat {
  chat: Chat;
  questions: Question[];
}

/** Chat 목록 + 각 Chat의 Question을 함께 불러온다(재로그인 복원용). */
export async function loadChatsWithQuestions(): Promise<StoredChat[]> {
  const { chats } = unwrap(await fetchChats());
  return Promise.all(
    chats.map(async (chat) => ({
      chat,
      questions: unwrap(await fetchQuestions(chat.id)).questions,
    })),
  );
}

/** 새 Chat + 첫 Question(서버 트랜잭션). 서버가 매긴 id·title·sequence를 그대로 반환. */
export async function createChatWithFirstQuestion(
  message: string,
): Promise<{ chat: Chat; question: Question }> {
  return unwrap(await createChat(message));
}

/** 같은 Chat의 다음 Question. 미완료 1개 위반이면 ApiStorageError(QUESTION_ALREADY_OPEN). */
export async function createNextQuestion(
  chatId: string,
  message: string,
): Promise<Question> {
  return unwrap(await createQuestion(chatId, message)).question;
}

/** Question 완료 전이 영속화(web Mock 흐름 완료 시점). */
export async function markQuestionCompleted(
  chatId: string,
  questionId: string,
): Promise<Question> {
  return unwrap(await completeQuestion(chatId, questionId)).question;
}
