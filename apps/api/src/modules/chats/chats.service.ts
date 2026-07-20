import type { SupabaseClient } from "@supabase/supabase-js";
import type { Chat, Question } from "@decision-log/shared";

import { AppError, mapDbError } from "../../shared/http/appError.js";
import * as repo from "./chats.repository.js";

/**
 * Chat·Question 업무 흐름 (SPEC-DB-001 5장).
 * - Service는 req/res를 받지 않는다(CLAUDE.md 8장). 사용자 JWT 클라이언트(RLS)와 인자만 받는다.
 * - 소유권·미완료 1개 제약은 DB(RLS·Partial Unique)가 강제하며, 여기서는 DB 오류를 사용자 오류로 번역한다.
 */

export async function createChatWithFirstQuestion(
  client: SupabaseClient,
  message: string,
): Promise<{ chat: Chat; question: Question }> {
  try {
    return await repo.createChatWithFirstQuestion(client, message);
  } catch (error) {
    throw mapDbError(error) ?? error;
  }
}

export async function createNextQuestion(
  client: SupabaseClient,
  chatId: string,
  message: string,
): Promise<Question> {
  try {
    return await repo.createNextQuestion(client, chatId, message);
  } catch (error) {
    throw mapDbError(error) ?? error;
  }
}

export async function completeQuestion(
  client: SupabaseClient,
  chatId: string,
  questionId: string,
): Promise<Question> {
  const updated = await repo.completeQuestion(client, chatId, questionId);
  if (!updated) {
    // RLS로 안 보이거나 없는 경우 — 소유하지 않은 대상. 정보는 은닉한다.
    throw new AppError(404, "QUESTION_NOT_FOUND", "대상 Question을 찾을 수 없습니다.");
  }
  return updated;
}

export function listChats(client: SupabaseClient): Promise<Chat[]> {
  return repo.listChats(client);
}

export function listQuestions(
  client: SupabaseClient,
  chatId: string,
): Promise<Question[]> {
  return repo.listQuestions(client, chatId);
}
