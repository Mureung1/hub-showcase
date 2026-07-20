import {
  AuthMeResponseSchema,
  ChatListResponseSchema,
  CreateChatResponseSchema,
  ErrorEnvelopeSchema,
  QuestionListResponseSchema,
  QuestionResponseSchema,
  type AuthMeResponse,
  type ChatListResponse,
  type CreateChatResponse,
  type ErrorEnvelope,
  type QuestionListResponse,
  type QuestionResponse,
} from "@decision-log/shared";
import { z } from "zod";

import { getAccessToken } from "../features/auth/authService";

/**
 * 최소 ApiClient (SPEC-AUTH-003 4장).
 * - VITE_API_BASE_URL 기준으로 Express API에 요청한다.
 * - 세션 access token을 auth Service(getAccessToken)로 얻어 Authorization: Bearer로 첨부한다.
 * - 컴포넌트는 fetch를 직접 호출하지 않고 이 ApiClient(또는 Service)를 거친다(CLAUDE.md 7장).
 * - 응답 성공/실패를 shared 계약(성공 스키마·에러 봉투)으로 파싱해 호출부가 분기할 수 있게 한다.
 *   이후 데이터 로딩 경로가 이 ApiClient를 재사용한다.
 */

const envSchema = z.object({
  VITE_API_BASE_URL: z.url(),
});
const { VITE_API_BASE_URL } = envSchema.parse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
});

/** ApiClient 호출 결과 — 성공 값 또는 에러 봉투(+HTTP status). */
export type ApiResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: ErrorEnvelope["error"] };

/** 봉투가 아니거나 파싱 불가한 응답을 위한 최후 수단 에러 봉투. */
function fallbackError(message: string): ErrorEnvelope["error"] {
  return { code: "UNKNOWN_ERROR", message };
}

/**
 * 인증이 필요한 요청. access token을 Bearer로 첨부하고, 응답을 스키마로 파싱한다.
 * 토큰이 없으면 서버가 401 UNAUTHENTICATED를 돌려주며, 그 경로도 여기서 처리된다.
 * 데이터 로딩(GET)·사용자 쓰기(POST/PATCH)가 이 하나를 재사용한다(SPEC-DB-001 5장).
 */
async function requestAuthed<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  schema: z.ZodType<T>,
  body?: unknown,
): Promise<ApiResult<T>> {
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${VITE_API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: fallbackError(
        error instanceof Error ? error.message : "API 요청에 실패했습니다.",
      ),
    };
  }

  const raw: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = ErrorEnvelopeSchema.safeParse(raw);
    return {
      ok: false,
      status: response.status,
      error: parsed.success
        ? parsed.data.error
        : fallbackError(`요청이 실패했습니다 (HTTP ${response.status}).`),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      status: response.status,
      error: fallbackError("서버 응답 형식이 올바르지 않습니다."),
    };
  }
  return { ok: true, value: parsed.data };
}

/**
 * GET /api/auth/me — 로그인 상태에서 서버가 인식한 신원을 확인한다(SPEC-AUTH-003 4장).
 * 반환 userId는 서버가 검증한 JWT에서만 온다. 호출부(useAuth 등)가 세션 userId와 대조할 수 있다.
 */
export function fetchAuthMe(): Promise<ApiResult<AuthMeResponse>> {
  return requestAuthed("GET", "/api/auth/me", AuthMeResponseSchema);
}

// --- Chat·Question (SPEC-DB-001 5장) — 모두 검증 JWT(RLS)로 본인 데이터만 ---

/** GET /api/chats — Chat 목록(updated_at desc). */
export function fetchChats(): Promise<ApiResult<ChatListResponse>> {
  return requestAuthed("GET", "/api/chats", ChatListResponseSchema);
}

/** GET /api/chats/:chatId/questions — 특정 Chat의 Question 목록(sequence asc). */
export function fetchQuestions(
  chatId: string,
): Promise<ApiResult<QuestionListResponse>> {
  return requestAuthed(
    "GET",
    `/api/chats/${chatId}/questions`,
    QuestionListResponseSchema,
  );
}

/** POST /api/chats — 새 Chat + 첫 Question(서버 트랜잭션, title=앞 100자). */
export function createChat(
  message: string,
): Promise<ApiResult<CreateChatResponse>> {
  return requestAuthed("POST", "/api/chats", CreateChatResponseSchema, {
    message,
  });
}

/** POST /api/chats/:chatId/questions — 같은 Chat의 다음 Question. */
export function createQuestion(
  chatId: string,
  message: string,
): Promise<ApiResult<QuestionResponse>> {
  return requestAuthed(
    "POST",
    `/api/chats/${chatId}/questions`,
    QuestionResponseSchema,
    { message },
  );
}

/** PATCH /api/chats/:chatId/questions/:questionId — 완료 전이(생명주기 영속화). */
export function completeQuestion(
  chatId: string,
  questionId: string,
): Promise<ApiResult<QuestionResponse>> {
  return requestAuthed(
    "PATCH",
    `/api/chats/${chatId}/questions/${questionId}`,
    QuestionResponseSchema,
    { status: "completed" },
  );
}
