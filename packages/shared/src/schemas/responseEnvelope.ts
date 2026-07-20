import { z } from "zod";

/**
 * 응답 봉투 — 프로젝트 표준 착수 (SPEC-AUTH-003 3장).
 * api가 생성하고 web이 파싱하는 Web·API 공유 계약이다.
 *
 * 이 Spec은 에러 봉투와 표준 골격만 확정한다. 성공 봉투(예: `{ data: ... }` 래핑)의
 * 표준 확정은 실제 데이터 API가 생기는 Spec(AI·DB)에서 하며, 그 전까지 과설계하지 않는다.
 */

/**
 * 인증 경계가 도입하는 에러 코드 (SPEC-AUTH-003 3장).
 * - UNAUTHENTICATED: 토큰 없음·Authorization 형식 오류
 * - TOKEN_INVALID: 토큰 검증 실패·만료 (message에 Supabase 원문)
 *
 * 코드 레지스트리 확장은 Spec 개정을 통해 추가한다. `schemas/errorCodes.ts`의
 * AI/스토리지 계열 ErrorCode와는 사용 영역이 다르다(HTTP 응답 봉투 vs 엔티티 상태).
 */
export const AUTH_ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  TOKEN_INVALID: "TOKEN_INVALID",
} as const;

export const AuthErrorCodeSchema = z.enum([
  AUTH_ERROR_CODES.UNAUTHENTICATED,
  AUTH_ERROR_CODES.TOKEN_INVALID,
]);
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;

/**
 * 에러 봉투: `{ error: { code, message } }`.
 * - code: 호출부가 분기에 쓰는 안정적 식별자.
 * - message: 사람이 읽는 설명. 인증 실패 시 Supabase 원문을 담아 디버깅 가시성을 준다.
 *   비밀값·토큰·내부 스택은 담지 않는다(생성 측 책임).
 *
 * code를 열린 string으로 둔다 — 후속 Spec이 추가하는 코드를 web 파싱에서 깨지 않게 하기
 * 위함이다. 알려진 코드 판별이 필요하면 AuthErrorCodeSchema로 좁혀 쓴다.
 */
export const ErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string(),
  }),
});
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/**
 * `/api/auth/me` 성공 응답의 최소 형태 (SPEC-AUTH-003 2.4·3장).
 * 표준 성공 봉투 확정 전까지 이 Spec이 쓰는 유일한 성공 형태다.
 */
export const AuthMeResponseSchema = z.object({
  userId: z.string().min(1),
  email: z.string(),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
