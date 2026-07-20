import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ChatSchema,
  QuestionSchema,
  type Chat,
  type Question,
} from "@decision-log/shared";

/**
 * Chat·Question Repository (SPEC-DB-001 4·5장).
 * - 사용자 JWT 클라이언트(RLS)로만 동작한다 — 소유권은 RLS가 강제한다.
 * - 반환하는 DB 응답은 shared 스키마로 Zod 검증하고, snake_case↔camelCase 변환은 이 경계에서.
 * - 원자적 생성은 RPC(create_chat_with_first_question / create_next_question)로.
 */

/** DB row(snake) → shared Chat(camel). 검증 포함. */
function toChat(row: unknown): Chat {
  const r = row as Record<string, unknown>;
  return ChatSchema.parse({
    id: r.id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

/** DB row(snake) → shared Question(camel). 검증 포함. */
function toQuestion(row: unknown): Question {
  const r = row as Record<string, unknown>;
  return QuestionSchema.parse({
    id: r.id,
    chatId: r.chat_id,
    sequenceNumber: r.sequence_number,
    message: r.message,
    status: r.status,
    lastErrorCode: r.last_error_code ?? null,
    lastErrorMessage: r.last_error_message ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    completedAt: r.completed_at ?? null,
  });
}

const QUESTION_COLUMNS =
  "id, chat_id, sequence_number, message, status, last_error_code, last_error_message, created_at, updated_at, completed_at";
const CHAT_COLUMNS = "id, title, created_at, updated_at";

/** 새 Chat + 첫 Question(원자적 RPC). 생성된 id로 두 엔티티를 조회해 반환. */
export async function createChatWithFirstQuestion(
  client: SupabaseClient,
  message: string,
): Promise<{ chat: Chat; question: Question }> {
  const { data, error } = await client
    .rpc("create_chat_with_first_question", { p_message: message })
    .single<{ chat_id: string; question_id: string }>();
  if (error) throw new Error(`Chat 생성 실패: ${error.message}`);

  const [{ data: chatRow, error: chatErr }, { data: qRow, error: qErr }] =
    await Promise.all([
      client.from("chats").select(CHAT_COLUMNS).eq("id", data.chat_id).single(),
      client
        .from("questions")
        .select(QUESTION_COLUMNS)
        .eq("id", data.question_id)
        .single(),
    ]);
  if (chatErr) throw new Error(`Chat 조회 실패: ${chatErr.message}`);
  if (qErr) throw new Error(`Question 조회 실패: ${qErr.message}`);

  return { chat: toChat(chatRow), question: toQuestion(qRow) };
}

/** 같은 Chat의 다음 Question(원자적 RPC — seq 계산·소유권·미완료 제약은 DB에서). */
export async function createNextQuestion(
  client: SupabaseClient,
  chatId: string,
  message: string,
): Promise<Question> {
  const { data, error } = await client
    .rpc("create_next_question", { p_chat_id: chatId, p_message: message })
    .single<{ question_id: string }>();
  if (error) throw error; // 코드 분기를 위해 원본 error를 Service로 올린다.

  const { data: qRow, error: qErr } = await client
    .from("questions")
    .select(QUESTION_COLUMNS)
    .eq("id", data.question_id)
    .single();
  if (qErr) throw new Error(`Question 조회 실패: ${qErr.message}`);
  return toQuestion(qRow);
}

/** Question 완료 전이(상태·completed_at). RLS(owner)로 소유권 강제. */
export async function completeQuestion(
  client: SupabaseClient,
  chatId: string,
  questionId: string,
): Promise<Question | null> {
  const { data, error } = await client
    .from("questions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", questionId)
    .eq("chat_id", chatId)
    .select(QUESTION_COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`Question 상태 갱신 실패: ${error.message}`);
  return data ? toQuestion(data) : null;
}

/** Chat 목록(updated_at desc). RLS로 본인 것만. */
export async function listChats(client: SupabaseClient): Promise<Chat[]> {
  const { data, error } = await client
    .from("chats")
    .select(CHAT_COLUMNS)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Chat 목록 조회 실패: ${error.message}`);
  return (data ?? []).map(toChat);
}

/** 특정 Chat의 Question 목록(sequence asc). RLS로 본인 것만. */
export async function listQuestions(
  client: SupabaseClient,
  chatId: string,
): Promise<Question[]> {
  const { data, error } = await client
    .from("questions")
    .select(QUESTION_COLUMNS)
    .eq("chat_id", chatId)
    .order("sequence_number", { ascending: true });
  if (error) throw new Error(`Question 목록 조회 실패: ${error.message}`);
  return (data ?? []).map(toQuestion);
}
