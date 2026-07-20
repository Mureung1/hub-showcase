import type { Response } from "express";
import { ErrorEnvelopeSchema, type ErrorEnvelope } from "@decision-log/shared";

/**
 * 에러 봉투 응답 헬퍼 (SPEC-AUTH-003 3장).
 * shared의 ErrorEnvelopeSchema로 `{ error: { code, message } }`를 생성한다.
 *
 * message에는 사람이 읽는 설명만 담는다. 비밀값·토큰·내부 스택은 호출부에서 넣지 않는다.
 * 생성한 봉투를 shared 스키마로 한 번 더 검증해, api와 web이 동일 계약을 쓰도록 보장한다.
 */
export function sendError(
  response: Response,
  status: number,
  code: string,
  message: string,
): void {
  const envelope: ErrorEnvelope = ErrorEnvelopeSchema.parse({
    error: { code, message },
  });
  response.status(status).json(envelope);
}
