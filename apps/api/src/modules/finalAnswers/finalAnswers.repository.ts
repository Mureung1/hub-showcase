import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DecisionNoteSchema,
  FinalAnswerSchema,
  type DecisionNote,
  type FinalAnswer,
  type FinalAnswerGenerationMode,
} from "@decision-log/shared";

import type { PriorQuestion } from "./pipeline/context.js";

/**
 * FinalAnswer·DecisionNote Repository (SPEC-AI-003 §6, data-model 3.6·3.7).
 *
 * 클라이언트 구분(ADR-002):
 * - **시스템 쓰기**(생성 결과 저장·Question 전이): `adminClient`(Secret Key).
 *   Service가 검증된 JWT userId로 소유권을 먼저 확인한 뒤에만 들어온다.
 * - **조회**: 사용자 JWT 클라이언트(RLS).
 */

const FINAL_COLUMNS =
  "id, question_id, content, generation_mode, created_at";
const NOTE_COLUMNS = "id, question_id, content, created_at, updated_at";

function toFinalAnswer(row: unknown): FinalAnswer {
  const r = row as Record<string, unknown>;
  return FinalAnswerSchema.parse({
    id: r.id,
    questionId: r.question_id,
    content: r.content,
    generationMode: r.generation_mode,
    createdAt: r.created_at,
  });
}

function toDecisionNote(row: unknown): DecisionNote {
  const r = row as Record<string, unknown>;
  return DecisionNoteSchema.parse({
    id: r.id,
    questionId: r.question_id,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

/**
 * §5.4·§6.2 — **이미 저장된 FinalAnswer가 있는가.**
 *
 * 재생성 금지는 **저장된 것**에만 적용된다(§5.1). 생성에 실패해 저장되지 않았으면 다시
 * 시도할 수 있다. 그 구분을 이 조회가 담당한다 — `final_answers`에 행이 있는지로만 본다.
 */
export async function findFinalAnswer(
  client: SupabaseClient,
  questionId: string,
): Promise<FinalAnswer | null> {
  const { data, error } = await client
    .from("final_answers")
    .select(FINAL_COLUMNS)
    .eq("question_id", questionId)
    .maybeSingle();
  if (error) throw new Error(`FinalAnswer 조회 실패: ${error.message}`);
  return data ? toFinalAnswer(data) : null;
}

export async function findDecisionNote(
  client: SupabaseClient,
  questionId: string,
): Promise<DecisionNote | null> {
  const { data, error } = await client
    .from("decision_notes")
    .select(NOTE_COLUMNS)
    .eq("question_id", questionId)
    .maybeSingle();
  if (error) throw new Error(`DecisionNote 조회 실패: ${error.message}`);
  return data ? toDecisionNote(data) : null;
}

/** §6.2 1단계. `question_id` UNIQUE가 최후 방어선이며 Service가 먼저 409로 거절한다. */
export async function insertFinalAnswer(
  adminClient: SupabaseClient,
  input: {
    questionId: string;
    content: string;
    generationMode: FinalAnswerGenerationMode;
    /** `all_agendas_rejected`는 AI 미호출이므로 null(§4.1). 대체 노트는 `fallback`. */
    promptVersion: string | null;
    inputSnapshot: Record<string, unknown>;
  },
): Promise<FinalAnswer> {
  const { data, error } = await adminClient
    .from("final_answers")
    .insert({
      question_id: input.questionId,
      content: input.content,
      generation_mode: input.generationMode,
      prompt_version: input.promptVersion,
      input_snapshot: input.inputSnapshot,
    })
    .select(FINAL_COLUMNS)
    .single();
  if (error) throw new Error(`FinalAnswer 저장 실패: ${error.message}`);
  return toFinalAnswer(data);
}

/** §6.2 2단계. 이것이 저장돼야 `completed`로 갈 수 있다(§6.3). */
export async function insertDecisionNote(
  adminClient: SupabaseClient,
  input: { questionId: string; content: string },
): Promise<DecisionNote> {
  const { data, error } = await adminClient
    .from("decision_notes")
    .insert({ question_id: input.questionId, content: input.content })
    .select(NOTE_COLUMNS)
    .single();
  if (error) throw new Error(`DecisionNote 저장 실패: ${error.message}`);
  return toDecisionNote(data);
}

/**
 * §6.2 3단계 — `completed` 전이.
 *
 * ⚠️ **멱등이어야 한다.** T-020.1 시점에는 web의 기존 PATCH 전이가 아직 살아 있어
 * 서버와 web이 둘 다 전이를 시도할 수 있다(제거는 T-020.2). 이미 `completed`면
 * 오류 없이 넘어간다 — `completed_at`은 처음 값을 보존한다.
 */
export async function markCompleted(
  adminClient: SupabaseClient,
  questionId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("questions")
    .update({ status: "completed", completed_at: now, updated_at: now })
    .eq("id", questionId)
    .neq("status", "completed");
  if (error) throw new Error(`Question 완료 전이 실패: ${error.message}`);
}

/**
 * §7 — Context 재료. 같은 Chat의 **완료된 이전 Question**을 sequence 오름차순으로 모은다.
 * `sequenceNumber`가 기준보다 작은 것만 본다(자기 자신과 이후는 제외).
 */
export async function findPriorQuestions(
  client: SupabaseClient,
  input: { chatId: string; beforeSequence: number },
): Promise<PriorQuestion[]> {
  const { data, error } = await client
    .from("questions")
    .select(
      "sequence_number, message, final_answers(content), decision_notes(content)",
    )
    .eq("chat_id", input.chatId)
    .lt("sequence_number", input.beforeSequence)
    .order("sequence_number", { ascending: true });
  if (error) throw new Error(`이전 Question 조회 실패: ${error.message}`);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    // Supabase 조인은 배열로 온다. UNIQUE라 최대 1건이다.
    const finals = r.final_answers as { content?: unknown }[] | null;
    const notes = r.decision_notes as { content?: unknown }[] | null;
    const finalContent = finals?.[0]?.content;
    const noteContent = notes?.[0]?.content;
    return {
      sequenceNumber: Number(r.sequence_number),
      message: typeof r.message === "string" ? r.message : "",
      finalAnswerContent:
        typeof finalContent === "string" ? finalContent : null,
      decisionNoteContent: typeof noteContent === "string" ? noteContent : null,
    };
  });
}
