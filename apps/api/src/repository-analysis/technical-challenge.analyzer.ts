import type {
  RepositoryAnalysisEvidenceType,
  TechnicalChallengeCandidate,
  TechnicalChallengeConfidence,
} from "@ptop/contracts";

export class TechnicalChallengeResponseValidationError extends Error {
  constructor(message = "AI 기술적 도전 후보 응답을 검증할 수 없습니다.") {
    super(message);
    this.name = "TechnicalChallengeResponseValidationError";
  }
}

export function parseTechnicalChallengeResponse(
  rawResponse: string,
): TechnicalChallengeCandidate[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(removeJsonFence(rawResponse));
  } catch {
    throw new TechnicalChallengeResponseValidationError("AI 응답이 올바른 JSON이 아닙니다.");
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.candidates)) {
    throw new TechnicalChallengeResponseValidationError("AI 응답에 candidates 배열이 없습니다.");
  }

  const candidates = parsed.candidates
    .filter(isCandidate)
    .map((candidate) => ({
      ...candidate,
      requiresUserConfirmation:
        candidate.requiresUserConfirmation || candidate.confidence === "low",
    }));

  if (candidates.length !== parsed.candidates.length || candidates.length === 0) {
    throw new TechnicalChallengeResponseValidationError(
      "근거가 없거나 형식이 올바르지 않은 후보가 포함되어 있습니다.",
    );
  }

  return candidates;
}

function removeJsonFence(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function isCandidate(value: unknown): value is TechnicalChallengeCandidate {
  if (!isRecord(value)) {
    return false;
  }

  const evidence = value.evidence;
  return (
    isString(value.title) &&
    isString(value.summary) &&
    isNullableString(value.background) &&
    isNullableString(value.problem) &&
    isNullableString(value.solution) &&
    isString(value.technicalChallenge) &&
    isString(value.whyItMatters) &&
    isConfidence(value.confidence) &&
    typeof value.requiresUserConfirmation === "boolean" &&
    Array.isArray(evidence) &&
    evidence.length > 0 &&
    evidence.every(isEvidenceReference)
  );
}

function isEvidenceReference(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isEvidenceType(value.evidenceType) &&
    isNullableString(value.referenceId) &&
    isString(value.title) &&
    isNullableString(value.url) &&
    isNullableString(value.filePath)
  );
}

function isEvidenceType(value: unknown): value is RepositoryAnalysisEvidenceType {
  return (
    value === "commit" ||
    value === "pull_request" ||
    value === "issue" ||
    value === "file" ||
    value === "config" ||
    value === "release"
  );
}

function isConfidence(value: unknown): value is TechnicalChallengeConfidence {
  return value === "high" || value === "medium" || value === "low";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
