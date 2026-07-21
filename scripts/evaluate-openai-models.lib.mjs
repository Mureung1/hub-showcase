export function parseModelList(value) {
  const models = String(value ?? "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set(models)];
}

export function createRequestBody(model, fixture) {
  const body = {
    model,
    messages: [
      { role: "system", content: fixture.systemPrompt },
      { role: "user", content: fixture.userPrompt },
    ],
    response_format: { type: "json_object" },
  };

  if (!shouldOmitTemperature(model)) {
    body.temperature = fixture.temperature ?? 0;
  }

  return body;
}

export function shouldOmitTemperature(model) {
  return (
    model === "gpt-5-mini" ||
    model.startsWith("gpt-5-mini-") ||
    model === "gpt-5.6-luna" ||
    model.startsWith("gpt-5.6-luna-")
  );
}

export function parseJsonContent(body) {
  const content = body?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    return null;
  }

  try {
    return JSON.parse(removeJsonFence(content));
  } catch {
    return null;
  }
}

const CANDIDATE_FIELDS = new Set([
  "title",
  "summary",
  "background",
  "problem",
  "solution",
  "technicalChallenge",
  "whyItMatters",
  "confidence",
  "requiresUserConfirmation",
  "evidence",
]);

const EVIDENCE_FIELDS = new Set([
  "evidenceType",
  "referenceId",
  "title",
  "url",
  "filePath",
]);

const EVIDENCE_TYPES = new Set([
  "commit",
  "pull_request",
  "issue",
  "file",
  "config",
  "release",
]);

const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);

export function validateTechnicalChallengeResponse(value) {
  const issues = [];

  if (!isRecord(value) || !Array.isArray(value.candidates)) {
    return {
      valid: false,
      candidateCount: 0,
      issues: [
        {
          path: "candidates",
          code: "missing_field",
          message: "candidates 배열이 필요합니다.",
        },
      ],
    };
  }

  value.candidates.forEach((candidate, candidateIndex) => {
    validateCandidate(candidate, candidateIndex, issues);
  });

  if (value.candidates.length === 0) {
    issues.push({
      path: "candidates",
      code: "empty_array",
      message: "candidates 배열에는 하나 이상의 후보가 필요합니다.",
    });
  }

  return {
    valid: issues.length === 0,
    candidateCount: value.candidates.length,
    issues,
  };
}

function validateCandidate(candidate, candidateIndex, issues) {
  const path = `candidates[${candidateIndex}]`;

  if (!isRecord(candidate)) {
    issues.push({
      path,
      code: "invalid_type",
      message: "후보는 객체여야 합니다.",
    });
    return;
  }

  for (const field of CANDIDATE_FIELDS) {
    if (!(field in candidate)) {
      issues.push({
        path: `${path}.${field}`,
        code: "missing_field",
        message: `${field} 필드가 필요합니다.`,
      });
    }
  }

  for (const field of Object.keys(candidate)) {
    if (!CANDIDATE_FIELDS.has(field)) {
      issues.push({
        path: `${path}.${field}`,
        code: "unexpected_field",
        message: `${field} 필드는 PtoP 출력 계약에 정의되어 있지 않습니다.`,
      });
    }
  }

  for (const field of [
    "title",
    "summary",
    "technicalChallenge",
    "whyItMatters",
  ]) {
    if (field in candidate && !isNonEmptyString(candidate[field])) {
      issues.push({
        path: `${path}.${field}`,
        code: "invalid_value",
        message: `${field}은 비어 있지 않은 문자열이어야 합니다.`,
      });
    }
  }

  for (const field of ["background", "problem", "solution"]) {
    if (field in candidate && !isNullableString(candidate[field])) {
      issues.push({
        path: `${path}.${field}`,
        code: "invalid_value",
        message: `${field}은 문자열 또는 null이어야 합니다.`,
      });
    }
  }

  if ("confidence" in candidate && !CONFIDENCE_VALUES.has(candidate.confidence)) {
    issues.push({
      path: `${path}.confidence`,
      code: "invalid_value",
      message: "confidence는 high, medium, low 중 하나여야 합니다.",
    });
  }

  if (
    "requiresUserConfirmation" in candidate &&
    typeof candidate.requiresUserConfirmation !== "boolean"
  ) {
    issues.push({
      path: `${path}.requiresUserConfirmation`,
      code: "invalid_value",
      message: "requiresUserConfirmation은 boolean이어야 합니다.",
    });
  }

  if ("evidence" in candidate) {
    if (!Array.isArray(candidate.evidence) || candidate.evidence.length === 0) {
      issues.push({
        path: `${path}.evidence`,
        code: "invalid_value",
        message: "evidence 배열에는 하나 이상의 근거가 필요합니다.",
      });
    } else {
      candidate.evidence.forEach((evidence, evidenceIndex) => {
        validateEvidence(evidence, `${path}.evidence[${evidenceIndex}]`, issues);
      });
    }
  }
}

function validateEvidence(evidence, path, issues) {
  if (!isRecord(evidence)) {
    issues.push({ path, code: "invalid_type", message: "evidence는 객체여야 합니다." });
    return;
  }

  for (const field of EVIDENCE_FIELDS) {
    if (!(field in evidence)) {
      issues.push({
        path: `${path}.${field}`,
        code: "missing_field",
        message: `${field} 필드가 필요합니다.`,
      });
    }
  }

  for (const field of Object.keys(evidence)) {
    if (!EVIDENCE_FIELDS.has(field)) {
      issues.push({
        path: `${path}.${field}`,
        code: "unexpected_field",
        message: `${field} 필드는 evidence 계약에 정의되어 있지 않습니다.`,
      });
    }
  }

  if ("evidenceType" in evidence && !EVIDENCE_TYPES.has(evidence.evidenceType)) {
    issues.push({
      path: `${path}.evidenceType`,
      code: "invalid_value",
      message: "evidenceType이 허용된 값이 아닙니다.",
    });
  }

  if ("title" in evidence && !isNonEmptyString(evidence.title)) {
    issues.push({
      path: `${path}.title`,
      code: "invalid_value",
      message: "evidence title은 비어 있지 않은 문자열이어야 합니다.",
    });
  }

  for (const field of ["referenceId", "url", "filePath"]) {
    if (field in evidence && !isNullableString(evidence[field])) {
      issues.push({
        path: `${path}.${field}`,
        code: "invalid_value",
        message: `${field}은 문자열 또는 null이어야 합니다.`,
      });
    }
  }
}

export function createResultFileName(model, run) {
  const safeModel = model.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safeModel}-run-${String(run).padStart(2, "0")}.json`;
}

function removeJsonFence(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(?:```|~~~)(?:json)?\s*([\s\S]*?)\s*(?:```|~~~)$/i);
  return match?.[1]?.trim() ?? trimmed;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value) {
  return value === null || isNonEmptyString(value);
}
