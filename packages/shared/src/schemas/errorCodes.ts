import { z } from "zod";

/**
 * 에러 코드 레지스트리 — SPEC-SCHEMA-001 7장 (5종, UNKNOWN_ERROR 포함).
 * errorCode·lastErrorCode 필드의 값은 이 레지스트리의 코드만 사용한다.
 * 새 코드가 필요하면 Spec 7장 표를 개정하고 여기에 추가한다.
 */
export const ERROR_CODES = {
  /** AI가 제한 시간 내에 응답하지 않음 */
  PROVIDER_TIMEOUT: "PROVIDER_TIMEOUT",
  /** AI API 자체 오류 (인증 실패, 서버 오류 등) */
  PROVIDER_ERROR: "PROVIDER_ERROR",
  /** 응답은 왔으나 이 계약의 스키마 검증에 실패 */
  SCHEMA_VALIDATION_FAILED: "SCHEMA_VALIDATION_FAILED",
  /** 네트워크 단절·연결 실패 */
  NETWORK_ERROR: "NETWORK_ERROR",
  /** 위 어디에도 분류되지 않는 실패 (최후 수단) */
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

export const ErrorCodeSchema = z.enum([
  ERROR_CODES.PROVIDER_TIMEOUT,
  ERROR_CODES.PROVIDER_ERROR,
  ERROR_CODES.SCHEMA_VALIDATION_FAILED,
  ERROR_CODES.NETWORK_ERROR,
  ERROR_CODES.UNKNOWN_ERROR,
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
