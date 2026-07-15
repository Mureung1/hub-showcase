import { SHA_PATTERN, UUID_V4_PATTERN } from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";
import { isPlainObject } from "../shared/http";

export const LINKED_START_PATH = "/v1/probes/workflow-linked/start";
export const LINKED_COMPLETE_PATH = "/v1/probes/workflow-linked/complete";
export const LINKED_FIXTURE_HASH =
  "2afeef2b02ae9f168745b1d842277c2bcba0e9fb11b534d6683b319e81e6e2b0";
// SHA-256: placepick.workflow.linked.scope.v2|reasonText=LOCAL_OR_BLOG_EXACT|evidenceIds=1|typeMatch=true
export const LINKED_SCOPE_HASH =
  "73b6d630cb24b9222e05b289822b11a64c2f23ad04acb09b5fe01accafe3b2d0";
export const LINKED_SYNTHETIC_INPUT =
  "서울에서 2명이 1인당 20000원 이하로 조용한 카페를 찾습니다. 흡연 장소는 제외합니다.";
export const LINKED_SAFETY_IDENTIFIER = "synthetic-linked-workflow-session-0001";
export const LINKED_INITIAL_QUERY = "서울 카페 조용한";
export const LINKED_RELAXED_QUERY = "서울 카페";
export const LINKED_MODEL = "openai/gpt-4.1-mini";

export interface LinkedStartRequest {
  approvedSha: string;
  fixtureHash: string;
  scopeHash: string;
}

export interface LinkedCompleteRequest {
  approvedSha: string;
  resultCount: number;
  placeSearchCalls: number;
  blogSearchCalls: number;
  degraded: boolean;
  reasonFallback: boolean;
}

export function parseLinkedStart(value: unknown): LinkedStartRequest {
  if (!isPlainObject(value) || !hasExactKeys(value, [
    "approvedSha",
    "fixtureHash",
    "scopeHash"
  ])) {
    throw invalid("INVALID_LINKED_START_REQUEST");
  }
  if (
    typeof value.approvedSha !== "string" ||
    !SHA_PATTERN.test(value.approvedSha) ||
    value.fixtureHash !== LINKED_FIXTURE_HASH ||
    value.scopeHash !== LINKED_SCOPE_HASH
  ) {
    throw new SecurityBoundaryError(
      403,
      "LINKED_WORKFLOW_NOT_ALLOWLISTED",
      "승인된 Linked Live fixture와 범위만 허용됩니다."
    );
  }
  return {
    approvedSha: value.approvedSha,
    fixtureHash: LINKED_FIXTURE_HASH,
    scopeHash: LINKED_SCOPE_HASH
  };
}

export function parseLinkedComplete(value: unknown): LinkedCompleteRequest {
  if (!isPlainObject(value) || !hasExactKeys(value, [
    "approvedSha",
    "resultCount",
    "placeSearchCalls",
    "blogSearchCalls",
    "degraded",
    "reasonFallback"
  ])) {
    throw invalid("INVALID_LINKED_COMPLETE_REQUEST");
  }
  if (
    typeof value.approvedSha !== "string" ||
    !SHA_PATTERN.test(value.approvedSha) ||
    !integerBetween(value.resultCount, 0, 3) ||
    !integerBetween(value.placeSearchCalls, 1, 2) ||
    !integerBetween(value.blogSearchCalls, 0, 5) ||
    typeof value.degraded !== "boolean" ||
    typeof value.reasonFallback !== "boolean"
  ) {
    throw invalid("INVALID_LINKED_COMPLETE_REQUEST");
  }
  return {
    approvedSha: value.approvedSha,
    resultCount: value.resultCount,
    placeSearchCalls: value.placeSearchCalls,
    blogSearchCalls: value.blogSearchCalls,
    degraded: value.degraded,
    reasonFallback: value.reasonFallback
  };
}

export function requireUuidV4(value: unknown, code: string): string {
  if (typeof value !== "string" || !UUID_V4_PATTERN.test(value)) {
    throw invalid(code);
  }
  return value;
}

export function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index]);
}

function integerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) &&
    (value as number) >= minimum &&
    (value as number) <= maximum;
}

function invalid(code: string): SecurityBoundaryError {
  return new SecurityBoundaryError(
    400,
    code,
    "Linked Live 요청이 고정 계약과 일치하지 않습니다."
  );
}
