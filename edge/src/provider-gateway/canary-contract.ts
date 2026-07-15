import {
  NAVER_CANARY_DISPLAY,
  NAVER_CANARY_QUERY,
  SHA_PATTERN
} from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";
import { isPlainObject } from "../shared/http";

export interface NaverCanaryRequest {
  approvedSha: string;
  display: number;
  query: string;
}

export type NaverEndpoint = "blog" | "local";

export interface NaverCanaryCheck {
  endpoint: NaverEndpoint;
  durationMs: number;
  errorCode: string | null;
  httpStatus: number | null;
  itemCount: number | null;
  jsonContentType: boolean;
  schemaValid: boolean;
  success: boolean;
}

export interface NaverCanarySummary {
  approvedSha: string;
  callCount: 2;
  checks: [NaverCanaryCheck, NaverCanaryCheck];
  status: "failed" | "passed";
}

export function parseNaverCanaryRequest(value: unknown): NaverCanaryRequest {
  if (!isPlainObject(value) || Object.keys(value).some((key) => !ALLOWED_KEYS.has(key))) {
    throw invalidRequest();
  }

  if (
    typeof value.approvedSha !== "string" ||
    !SHA_PATTERN.test(value.approvedSha) ||
    typeof value.query !== "string" ||
    !isValidQuery(value.query) ||
    typeof value.display !== "number" ||
    !Number.isSafeInteger(value.display) ||
    value.display < 1 ||
    value.display > 5
  ) {
    throw invalidRequest();
  }

  return {
    approvedSha: value.approvedSha,
    display: value.display as number,
    query: value.query
  };
}

export function parseNaverSearchQuery(
  url: URL,
  approvedSha: string,
  endpoint: NaverEndpoint
): NaverCanaryRequest {
  const keys = Array.from(url.searchParams.keys());
  if (
    keys.length !== 2 ||
    new Set(keys).size !== 2 ||
    !keys.every((key) => key === "query" || key === "display")
  ) {
    throw invalidSearchRequest();
  }

  const displayValue = url.searchParams.get("display");
  if (displayValue === null || !/^[1-9][0-9]*$/u.test(displayValue)) {
    throw invalidSearchRequest();
  }
  const query = url.searchParams.get("query");
  const display = Number(displayValue);
  const maximumDisplay = endpoint === "local" ? 5 : 10;
  if (
    !SHA_PATTERN.test(approvedSha) ||
    typeof query !== "string" ||
    !isValidQuery(query) ||
    display < 1 ||
    display > maximumDisplay
  ) {
    throw invalidSearchRequest();
  }
  return { approvedSha, display, query };
}

export function enforceFixedCanary(request: NaverCanaryRequest): void {
  if (request.query !== NAVER_CANARY_QUERY || request.display !== NAVER_CANARY_DISPLAY) {
    throw new SecurityBoundaryError(
      403,
      "CANARY_INPUT_NOT_ALLOWLISTED",
      "고정된 비개인성 canary 입력만 허용됩니다."
    );
  }
}

export function parseRedactedCanarySummary(
  value: unknown,
  expectedSha: string
): NaverCanarySummary {
  if (
    !isPlainObject(value) ||
    value.approvedSha !== expectedSha ||
    value.callCount !== 2 ||
    (value.status !== "passed" && value.status !== "failed") ||
    !Array.isArray(value.checks) ||
    value.checks.length !== 2
  ) {
    throw invalidSummary();
  }

  const local = parseCheck(value.checks[0], "local");
  const blog = parseCheck(value.checks[1], "blog");
  const status = local.success && blog.success ? "passed" : "failed";
  if (value.status !== status) {
    throw invalidSummary();
  }
  return {
    approvedSha: expectedSha,
    callCount: 2,
    checks: [local, blog],
    status
  };
}

function isValidQuery(query: string): boolean {
  if (query !== query.trim() || query.length === 0 || query.length > 100) {
    return false;
  }
  if (new TextEncoder().encode(query).byteLength > 300) {
    return false;
  }
  return !/[\u0000-\u001f\u007f]/u.test(query);
}

function invalidRequest(): SecurityBoundaryError {
  return new SecurityBoundaryError(400, "INVALID_CANARY_REQUEST", "Canary 요청이 올바르지 않습니다.");
}

function invalidSearchRequest(): SecurityBoundaryError {
  return new SecurityBoundaryError(
    400,
    "INVALID_NAVER_SEARCH_REQUEST",
    "Naver 검색 요청이 올바르지 않습니다."
  );
}

function parseCheck(value: unknown, endpoint: NaverEndpoint): NaverCanaryCheck {
  if (
    !isPlainObject(value) ||
    value.endpoint !== endpoint ||
    !Number.isSafeInteger(value.durationMs) ||
    (value.durationMs as number) < 0 ||
    (value.durationMs as number) > 60_000 ||
    (value.errorCode !== null && typeof value.errorCode !== "string") ||
    (value.httpStatus !== null &&
      (!Number.isSafeInteger(value.httpStatus) ||
        (value.httpStatus as number) < 100 ||
        (value.httpStatus as number) > 599)) ||
    (value.itemCount !== null &&
      (!Number.isSafeInteger(value.itemCount) ||
        (value.itemCount as number) < 0 ||
        (value.itemCount as number) > NAVER_CANARY_DISPLAY)) ||
    typeof value.jsonContentType !== "boolean" ||
    typeof value.schemaValid !== "boolean" ||
    typeof value.success !== "boolean"
  ) {
    throw invalidSummary();
  }

  const parsed = {
    endpoint,
    durationMs: value.durationMs as number,
    errorCode: value.errorCode as string | null,
    httpStatus: value.httpStatus as number | null,
    itemCount: value.itemCount as number | null,
    jsonContentType: value.jsonContentType,
    schemaValid: value.schemaValid,
    success: value.success
  };
  const successIsConsistent = parsed.success &&
    parsed.errorCode === null &&
    parsed.httpStatus !== null && parsed.httpStatus >= 200 && parsed.httpStatus < 300 &&
    parsed.itemCount !== null && parsed.jsonContentType && parsed.schemaValid;
  const failureIsConsistent = !parsed.success &&
    parsed.errorCode !== null && ALLOWED_CHECK_ERROR_CODES.has(parsed.errorCode) &&
    parsed.itemCount === null && !parsed.schemaValid;
  if (!successIsConsistent && !failureIsConsistent) {
    throw invalidSummary();
  }
  return parsed;
}

function invalidSummary(): SecurityBoundaryError {
  return new SecurityBoundaryError(
    502,
    "INVALID_GATEWAY_SUMMARY",
    "Provider Gateway 검증 요약이 올바르지 않습니다."
  );
}

const ALLOWED_KEYS = new Set(["approvedSha", "display", "query"]);
const ALLOWED_CHECK_ERROR_CODES = new Set([
  "PROVIDER_CONTENT_TYPE_REJECTED",
  "PROVIDER_HTTP_ERROR",
  "PROVIDER_JSON_REJECTED",
  "PROVIDER_NETWORK_ERROR",
  "PROVIDER_RESPONSE_TOO_LARGE",
  "PROVIDER_SCHEMA_REJECTED",
  "PROVIDER_TIMEOUT"
]);
