import {
  AuthMeResponseSchema,
  ChatListResponseSchema,
  CreateChatResponseSchema,
  ErrorEnvelopeSchema,
  QuestionListResponseSchema,
  QuestionResponseSchema,
  QuestionStreamEventSchema,
  SourceAnswerSchema,
  type AuthMeResponse,
  type ChatListResponse,
  type CreateChatResponse,
  type ErrorEnvelope,
  type QuestionListResponse,
  type QuestionResponse,
  type SourceAnswer,
  type QuestionStreamEvent,
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

// --- SourceAnswer 실호출 (SPEC-AI-001 4장) ---

/** GET .../source-answers — 새로고침·재진입 복원용 현재 스냅샷. */
export function fetchSourceAnswers(
  chatId: string,
  questionId: string,
): Promise<ApiResult<SourceAnswer[]>> {
  return requestAuthed(
    "GET",
    `/api/chats/${chatId}/questions/${questionId}/source-answers`,
    z.array(SourceAnswerSchema),
  );
}

/** SSE 스트림 소비 결과 — done을 받았는지까지 호출부가 알아야 화해(reconcile)를 판단한다. */
export type SourceAnswerStreamResult =
  | { ok: true; done: boolean }
  | { ok: false; status: number; error: ErrorEnvelope["error"] };

/**
 * POST .../source-answers — 생성 시작. 응답 본문 자체가 SSE 스트림이다.
 *
 * EventSource를 쓰지 않는 이유: 커스텀 헤더 불가·GET 전용이라 access token을 URL에 실어야
 * 한다(§4 구현 노트). 그래서 fetch + Bearer로 열고 ReadableStream으로 직접 읽는다.
 *
 * 스트림이 열리기 전 실패(404·NO_AVAILABLE_KEYS 등)는 JSON 에러 봉투로 오므로 그대로 반환한다.
 * done을 받지 못한 채 스트림이 닫히면 `done: false`로 알려 호출부가 GET으로 화해하게 한다.
 */
export async function streamSourceAnswers(
  chatId: string,
  questionId: string,
  body: { context: string | null },
  onEvent: (event: QuestionStreamEvent) => void,
): Promise<SourceAnswerStreamResult> {
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(
      `${VITE_API_BASE_URL}/api/chats/${chatId}/questions/${questionId}/source-answers`,
      {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      },
    );
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: fallbackError(
        error instanceof Error ? error.message : "생성 요청에 실패했습니다.",
      ),
    };
  }

  if (!response.ok) {
    const raw: unknown = await response.json().catch(() => null);
    const parsed = ErrorEnvelopeSchema.safeParse(raw);
    return {
      ok: false,
      status: response.status,
      error: parsed.success
        ? parsed.data.error
        : fallbackError(`생성 요청이 실패했습니다 (HTTP ${response.status}).`),
    };
  }

  if (!response.body) {
    return { ok: true, done: false };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawDone = false;

  /** `data: {...}` 한 프레임을 계약으로 파싱해 전달한다. 계약 위반 프레임은 무시하고 로그만. */
  const dispatch = (frame: string): void => {
    for (const line of frame.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload.length === 0) continue;
      let raw: unknown;
      try {
        raw = JSON.parse(payload);
      } catch {
        console.error("[sourceAnswers] SSE 프레임 파싱 실패");
        continue;
      }
      const parsed = QuestionStreamEventSchema.safeParse(raw);
      if (!parsed.success) {
        console.error("[sourceAnswers] SSE 이벤트가 계약을 만족하지 않습니다.");
        continue;
      }
      if (parsed.data.type === "source_answer.done") sawDone = true;
      onEvent(parsed.data);
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // SSE 프레임 구분자는 빈 줄
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
      }
    }
    if (buffer.trim().length > 0) dispatch(buffer);
  } catch (error) {
    // 끊김 — done을 못 받았으므로 호출부가 GET으로 화해한다.
    console.error(
      "[sourceAnswers] SSE 스트림이 끊겼습니다:",
      error instanceof Error ? error.message : error,
    );
    return { ok: true, done: sawDone };
  }

  return { ok: true, done: sawDone };
}
