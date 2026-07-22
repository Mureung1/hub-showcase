import { ERROR_CODES } from "@decision-log/shared";

import { ProviderCallError } from "../ports.js";

/**
 * Provider SDK 오류 → errorCode 5종 매핑 (SPEC-AI-001 5장 표).
 *
 * | 상황                                   | errorCode                | 재시도 |
 * |---------------------------------------|--------------------------|--------|
 * | 타임아웃                               | PROVIDER_TIMEOUT         | O      |
 * | 네트워크 단절·연결 실패                 | NETWORK_ERROR            | O      |
 * | Provider 5xx·429                       | PROVIDER_ERROR           | O      |
 * | 인증 실패·잘못된 요청(4xx, 429 제외)    | PROVIDER_ERROR           | X      |
 * | 분류 불가                              | UNKNOWN_ERROR            | X      |
 *
 * 오류 메시지에 API 키·토큰을 담지 않는다. SDK 메시지에 키가 섞일 수 있으므로
 * 원문을 그대로 쓰지 않고 상태 코드 중심으로 요지만 만든다.
 */

/** SDK 오류에서 HTTP 상태 코드를 꺼낸다(형태가 다양해 unknown으로 좁힌다). */
function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as Record<string, unknown>;
  for (const key of ["status", "statusCode", "code"]) {
    const value = record[key];
    if (typeof value === "number" && value >= 100 && value < 600) return value;
  }
  return null;
}

function isTimeout(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    /timed? ?out/i.test(error.message)
  );
}

function isNetwork(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const record = error as unknown as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : "";
  return (
    error.name === "APIConnectionError" ||
    /ECONNRESET|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT/.test(code) ||
    /fetch failed|network/i.test(error.message)
  );
}

/** 이미 분류된 오류는 그대로, 아니면 5장 표로 분류한다. */
export function classifyProviderError(error: unknown): ProviderCallError {
  if (error instanceof ProviderCallError) return error;

  if (isTimeout(error)) {
    return new ProviderCallError(
      ERROR_CODES.PROVIDER_TIMEOUT,
      true,
      "Provider가 제한 시간 안에 응답하지 않았습니다.",
    );
  }
  if (isNetwork(error)) {
    return new ProviderCallError(
      ERROR_CODES.NETWORK_ERROR,
      true,
      "Provider에 연결하지 못했습니다.",
    );
  }

  const status = statusOf(error);
  if (status !== null) {
    if (status >= 500 || status === 429) {
      return new ProviderCallError(
        ERROR_CODES.PROVIDER_ERROR,
        true,
        `Provider가 일시적 오류를 반환했습니다(HTTP ${status}).`,
      );
    }
    if (status >= 400) {
      // 인증 실패·잘못된 요청 — 재시도해도 같은 결과이므로 즉시 제외
      return new ProviderCallError(
        ERROR_CODES.PROVIDER_ERROR,
        false,
        `Provider 요청이 거부되었습니다(HTTP ${status}).`,
      );
    }
  }

  return new ProviderCallError(
    ERROR_CODES.UNKNOWN_ERROR,
    false,
    "Provider 호출이 알 수 없는 이유로 실패했습니다.",
  );
}
