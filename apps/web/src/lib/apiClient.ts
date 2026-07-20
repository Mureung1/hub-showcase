import {
  AuthMeResponseSchema,
  ErrorEnvelopeSchema,
  type AuthMeResponse,
  type ErrorEnvelope,
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
 * 인증이 필요한 GET 요청. access token을 Bearer로 첨부하고, 응답을 스키마로 파싱한다.
 * 토큰이 없으면 서버가 401 UNAUTHENTICATED를 돌려주며, 그 경로도 여기서 처리된다.
 */
async function getAuthed<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<ApiResult<T>> {
  const token = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(`${VITE_API_BASE_URL}${path}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
  return getAuthed("/api/auth/me", AuthMeResponseSchema);
}
