import { SecurityBoundaryError } from "../shared/errors";
import { isPlainObject } from "../shared/http";
import { SHA_PATTERN } from "../shared/constants";

export const WORKFLOW_SPLIT_PATH = "/v1/probes/workflow-split";
export const CONDITION_FIXTURE_ID = "placepick.workflow.condition.v1";
export const REASON_FIXTURE_ID = "placepick.workflow.reason.v1";
export const CONDITION_FIXTURE_HASH =
  "c3af43ae0383b7fe0780970e98447d57df070c98de2d8696400d50c3823b4dca";
export const REASON_FIXTURE_HASH =
  "97947908de6e1dabd7378fe118feee83eab5dc47684b0ca9b88f50cd633d800a";
export const CONDITION_FIXTURE_TEXT =
  "서울에서 2명이 1인당 20000원 이하로 조용한 카페를 찾습니다. 흡연 장소는 제외합니다.";

export const SYNTHETIC_REASON_PLACES = [
  {
    placeId: "11111111-1111-4111-8111-111111111111",
    facts: [
      { evidenceId: "e1", fact: "합성 카페 알파는 서울의 카페 후보입니다." },
      { evidenceId: "e2", fact: "합성 근거에는 조용한 공간이라는 표현이 있습니다." }
    ]
  },
  {
    placeId: "22222222-2222-4222-8222-222222222222",
    facts: [
      { evidenceId: "e3", fact: "합성 카페 베타는 서울의 카페 후보입니다." },
      { evidenceId: "e4", fact: "합성 근거에는 대화하기 좋다는 표현이 있습니다." }
    ]
  },
  {
    placeId: "33333333-3333-4333-8333-333333333333",
    facts: [
      { evidenceId: "e5", fact: "합성 카페 감마는 서울의 카페 후보입니다." },
      { evidenceId: "e6", fact: "합성 근거에는 차분한 분위기라는 표현이 있습니다." }
    ]
  }
] as const;

export interface WorkflowSplitRequest {
  approvedSha: string;
  conditionFixtureHash: string;
  reasonFixtureHash: string;
}

export type WorkflowStage =
  | "conditionExtraction"
  | "naverLocal"
  | "naverBlog"
  | "reasonGeneration";

export interface WorkflowStageCheck {
  stage: WorkflowStage;
  durationMs: number;
  errorCode: string | null;
  httpStatus: number | null;
  schemaValid: boolean;
  itemCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  success: boolean;
}

export interface WorkflowSplitSummary {
  approvedSha: string;
  callCount: 4;
  checks: [
    WorkflowStageCheck,
    WorkflowStageCheck,
    WorkflowStageCheck,
    WorkflowStageCheck
  ];
  linked: false;
  mode: "split";
  status: "failed" | "passed";
}

export function parseWorkflowSplitRequest(value: unknown): WorkflowSplitRequest {
  if (!isPlainObject(value) || !hasExactKeys(value, [
    "approvedSha",
    "conditionFixtureHash",
    "reasonFixtureHash"
  ])) {
    throw invalidRequest();
  }
  if (
    typeof value.approvedSha !== "string" ||
    !SHA_PATTERN.test(value.approvedSha) ||
    value.conditionFixtureHash !== CONDITION_FIXTURE_HASH ||
    value.reasonFixtureHash !== REASON_FIXTURE_HASH
  ) {
    throw new SecurityBoundaryError(
      403,
      "WORKFLOW_FIXTURE_NOT_ALLOWLISTED",
      "승인된 Split Live fixture만 허용됩니다."
    );
  }
  return {
    approvedSha: value.approvedSha,
    conditionFixtureHash: CONDITION_FIXTURE_HASH,
    reasonFixtureHash: REASON_FIXTURE_HASH
  };
}

export function validateConditionContent(value: unknown): boolean {
  if (!isPlainObject(value) || !hasExactKeys(value, [
    "schemaVersion",
    "condition",
    "warnings"
  ])) {
    return false;
  }
  const condition = value.condition;
  if (
    value.schemaVersion !== "placepick.condition-extraction.v1" ||
    !isPlainObject(condition) ||
    !hasExactKeys(condition, [
      "locationQuery",
      "placeType",
      "placeTypeDetail",
      "partySize",
      "budgetPerPersonMin",
      "budgetPerPersonMax",
      "preferences",
      "exclusions"
    ]) ||
    typeof condition.locationQuery !== "string" ||
    !condition.locationQuery.includes("서울") ||
    condition.placeType !== "CAFE" ||
    condition.placeTypeDetail !== null ||
    condition.partySize !== 2 ||
    condition.budgetPerPersonMin !== null ||
    condition.budgetPerPersonMax !== 20_000 ||
    !Array.isArray(condition.preferences) ||
    condition.preferences.length > 10 ||
    !Array.isArray(condition.exclusions) ||
    !condition.exclusions.some(
      (entry) => typeof entry === "string" && entry.includes("흡연")
    ) ||
    !validConditionWarnings(value.warnings, condition)
  ) {
    return false;
  }
  return condition.preferences.every((entry) =>
    isPlainObject(entry) &&
    hasExactKeys(entry, ["value", "priority"]) &&
    typeof entry.value === "string" &&
    entry.value.length >= 1 &&
    entry.value.length <= 50 &&
    (entry.priority === null ||
      (Number.isSafeInteger(entry.priority) &&
        (entry.priority as number) >= 1 &&
        (entry.priority as number) <= 10))
  ) && condition.exclusions.every(
    (entry) => typeof entry === "string" && entry.length >= 1 && entry.length <= 50
  );
}

export function validateReasonContent(value: unknown): boolean {
  if (!isPlainObject(value) || !hasExactKeys(value, ["schemaVersion", "places"])) {
    return false;
  }
  if (
    value.schemaVersion !== "placepick.reason-statements.v1" ||
    !Array.isArray(value.places) ||
    value.places.length !== SYNTHETIC_REASON_PLACES.length
  ) {
    return false;
  }

  const seen = new Set<string>();
  for (const outputPlace of value.places) {
    if (!isPlainObject(outputPlace) || !hasExactKeys(outputPlace, ["placeId", "statements"])) {
      return false;
    }
    const fixture = SYNTHETIC_REASON_PLACES.find((place) => place.placeId === outputPlace.placeId);
    if (fixture === undefined || seen.has(fixture.placeId) || !Array.isArray(outputPlace.statements)) {
      return false;
    }
    seen.add(fixture.placeId);
    if (outputPlace.statements.length < 1 || outputPlace.statements.length > 3) {
      return false;
    }
    const allowedEvidence = new Set(fixture.facts.map((fact) => fact.evidenceId));
    for (const statement of outputPlace.statements) {
      if (
        !isPlainObject(statement) ||
        !hasExactKeys(statement, ["text", "evidenceIds"]) ||
        typeof statement.text !== "string" ||
        !Array.isArray(statement.evidenceIds)
      ) {
        return false;
      }
      const text = statement.text;
      const evidenceIds = statement.evidenceIds;
      if (
        text.length < 1 ||
        text.length > 120 ||
        FORBIDDEN_REASON_TERMS.some((term) => text.includes(term)) ||
        evidenceIds.length < 1 ||
        evidenceIds.length > 3 ||
        new Set(evidenceIds).size !== evidenceIds.length ||
        !evidenceIds.every(
          (evidenceId) =>
            typeof evidenceId === "string" &&
            (allowedEvidence as ReadonlySet<string>).has(evidenceId)
        )
      ) {
        return false;
      }
    }
  }
  return seen.size === SYNTHETIC_REASON_PLACES.length;
}

function validConditionWarnings(
  value: unknown,
  condition: Record<string, unknown>
): boolean {
  if (
    !Array.isArray(value) ||
    value.length > 2 ||
    new Set(value).size !== value.length ||
    !value.every(
      (entry) => entry === "PARTY_SIZE_NOT_PROVIDED" || entry === "BUDGET_NOT_PROVIDED"
    )
  ) {
    return false;
  }
  const expected: string[] = [];
  if (condition.partySize === null) {
    expected.push("PARTY_SIZE_NOT_PROVIDED");
  }
  if (condition.budgetPerPersonMin === null && condition.budgetPerPersonMax === null) {
    expected.push("BUDGET_NOT_PROVIDED");
  }
  return value.length === expected.length &&
    value.every((entry, index) => entry === expected[index]);
}

export function hasExactKeys(
  value: Record<string, unknown>,
  expectedKeys: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function invalidRequest(): SecurityBoundaryError {
  return new SecurityBoundaryError(
    400,
    "INVALID_WORKFLOW_SPLIT_REQUEST",
    "Split Live 요청 형식이 올바르지 않습니다."
  );
}

const FORBIDDEN_REASON_TERMS = ["가격", "영업", "도보", "출구", "지하철"];
