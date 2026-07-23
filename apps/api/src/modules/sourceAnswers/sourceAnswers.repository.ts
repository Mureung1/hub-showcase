import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SourceAnswerSchema,
  type AiProvider,
  type ErrorCode,
  type ResponseMeta,
  type SourceAnswer,
  type StructuredContent,
} from "@decision-log/shared";

/**
 * SourceAnswer Repository (SPEC-AI-001 8장, data-model 3.4).
 * - AI 파이프라인의 시스템 쓰기이므로 **Secret Key 클라이언트(adminClient)** 로 호출된다(ADR-002).
 *   소유권 검증은 Service가 검증된 JWT userId로 먼저 끝낸 뒤에만 여기 들어온다.
 * - 조회는 사용자 JWT 클라이언트(RLS)로도 호출될 수 있어 클라이언트를 주입받는다.
 * - DB 응답은 shared 스키마로 Zod 검증하고 snake_case↔camelCase 변환은 이 경계에서.
 */

const COLUMNS =
  "id, question_id, provider, model, status, structured_content, response_meta, error_code, error_message, retry_count, excluded_from_comparison, excluded_at, started_at, completed_at, created_at, updated_at";

/** DB row(snake) → shared SourceAnswer(camel). 검증 포함. */
function toSourceAnswer(row: unknown): SourceAnswer {
  const r = row as Record<string, unknown>;
  // response_meta는 NOT NULL DEFAULT '{}' 이라 아직 채우기 전에는 빈 객체다 → 계약상 null.
  const meta = r.response_meta;
  const hasMeta =
    typeof meta === "object" && meta !== null && Object.keys(meta).length > 0;

  return SourceAnswerSchema.parse({
    id: r.id,
    questionId: r.question_id,
    provider: r.provider,
    model: r.model,
    status: r.status,
    structuredContent: r.structured_content ?? null,
    responseMeta: hasMeta ? meta : null,
    errorCode: r.error_code ?? null,
    errorMessage: r.error_message ?? null,
    retryCount: r.retry_count,
    excludedFromComparison: r.excluded_from_comparison,
    excludedAt: r.excluded_at ?? null,
    startedAt: r.started_at ?? null,
    completedAt: r.completed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  });
}

/**
 * 3사 SourceAnswer를 pending으로 만든다(8.4). UNIQUE(question_id, provider)이므로
 * 같은 Question에 다시 시작하면 기존 행을 pending으로 되돌린다.
 */
export async function createPendingRows(
  adminClient: SupabaseClient,
  questionId: string,
  entries: { provider: AiProvider; model: string; promptVersion: string }[],
): Promise<SourceAnswer[]> {
  const { data, error } = await adminClient
    .from("source_answers")
    .upsert(
      entries.map((entry) => ({
        question_id: questionId,
        provider: entry.provider,
        model: entry.model,
        prompt_version: entry.promptVersion,
        status: "pending",
        structured_content: null,
        raw_content: null,
        response_meta: {},
        error_code: null,
        error_message: null,
        retry_count: 0,
        excluded_from_comparison: false,
        excluded_at: null,
        started_at: null,
        completed_at: null,
      })),
      { onConflict: "question_id,provider" },
    )
    .select(COLUMNS);
  if (error) throw new Error(`SourceAnswer 생성 실패: ${error.message}`);
  return (data ?? []).map(toSourceAnswer);
}

/** processing 전이 — started_at 기록(8.4). 재시도 시 retry_count도 함께 올린다. */
export async function markProcessing(
  adminClient: SupabaseClient,
  id: string,
  options: { retryCount: number },
): Promise<void> {
  const { error } = await adminClient
    .from("source_answers")
    .update({
      status: "processing",
      retry_count: options.retryCount,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(`SourceAnswer 상태 갱신 실패: ${error.message}`);
}

/** succeeded 전이 — raw·structured·meta·completed_at 기록(8.2·8.3·8.4). */
export async function markSucceeded(
  adminClient: SupabaseClient,
  id: string,
  payload: {
    rawContent: string;
    structuredContent: StructuredContent;
    responseMeta: ResponseMeta;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("source_answers")
    .update({
      status: "succeeded",
      raw_content: payload.rawContent,
      structured_content: payload.structuredContent,
      response_meta: payload.responseMeta,
      error_code: null,
      error_message: null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(`SourceAnswer 저장 실패: ${error.message}`);
}

/**
 * failed 전이 — errorCode·errorMessage 기록. 최종 실패면 비교에서 제외한다(5장).
 * 정규화 실패여도 원문은 남긴다(8.2).
 */
export async function markFailed(
  adminClient: SupabaseClient,
  id: string,
  payload: {
    errorCode: ErrorCode;
    errorMessage: string;
    rawContent: string | null;
    excluded: boolean;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("source_answers")
    .update({
      status: "failed",
      error_code: payload.errorCode,
      error_message: payload.errorMessage,
      ...(payload.rawContent === null ? {} : { raw_content: payload.rawContent }),
      excluded_from_comparison: payload.excluded,
      excluded_at: payload.excluded ? now : null,
      completed_at: now,
      updated_at: now,
    })
    .eq("id", id);
  if (error) throw new Error(`SourceAnswer 저장 실패: ${error.message}`);
}

/**
 * 아직 종결되지 않은(pending·processing) 행을 실패로 마감한다.
 * 스트림 처리 중 예기치 못한 오류로 오케스트레이션이 끊겼을 때, 행이 중간 상태에 갇히지
 * 않도록 정리하는 용도다(좌초 복구 자체는 이번 범위 밖 — 여기서는 이번 요청분만 마감).
 */
export async function failUnfinished(
  adminClient: SupabaseClient,
  questionId: string,
  errorMessage: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("source_answers")
    .update({
      status: "failed",
      error_code: "UNKNOWN_ERROR",
      error_message: errorMessage,
      excluded_from_comparison: true,
      excluded_at: now,
      completed_at: now,
      updated_at: now,
    })
    .eq("question_id", questionId)
    .in("status", ["pending", "processing"]);
  if (error) throw new Error(`미종결 SourceAnswer 마감 실패: ${error.message}`);
}

/** Question의 SourceAnswer 스냅샷. 사용자 클라이언트(RLS)로 조회하면 본인 것만 보인다. */
export async function listByQuestion(
  client: SupabaseClient,
  questionId: string,
): Promise<SourceAnswer[]> {
  const { data, error } = await client
    .from("source_answers")
    .select(COLUMNS)
    .eq("question_id", questionId)
    .order("provider", { ascending: true });
  if (error) throw new Error(`SourceAnswer 조회 실패: ${error.message}`);
  return (data ?? []).map(toSourceAnswer);
}

/**
 * 대상 Question이 요청자 소유인지 확인한다(ADR-002 시스템 쓰기 전제).
 * RLS가 적용된 사용자 클라이언트로 조회하므로, 남의 것이면 행이 보이지 않는다.
 */
export async function findOwnedQuestion(
  userClient: SupabaseClient,
  chatId: string,
  questionId: string,
): Promise<{ id: string; message: string } | null> {
  const { data, error } = await userClient
    .from("questions")
    .select("id, message")
    .eq("id", questionId)
    .eq("chat_id", chatId)
    .maybeSingle();
  if (error) throw new Error(`Question 조회 실패: ${error.message}`);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return { id: String(row.id), message: String(row.message) };
}
