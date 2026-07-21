const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FACE_SIGNALS = new Set(["neutral", "smile", "tense", "downcast", "angry"]);
const VOICE_SIGNALS = new Set(["normal", "fast", "low", "strong", "bright"]);
const SCENARIOS = new Set(["normal", "tension", "tired"]);

export class RequestValidationError extends Error {
  constructor(details) {
    super("The request contains invalid fields.");
    this.name = "RequestValidationError";
    this.code = "VALIDATION_ERROR";
    this.details = details;
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(source, field, errors) {
  const value = source[field];

  if (typeof value !== "string" || !value.trim()) {
    errors.push({ field, message: `${field} must be a non-empty string.` });
    return "";
  }

  return value.trim();
}

function validateAllowedValue(value, field, allowedValues, errors) {
  if (value && !allowedValues.has(value)) {
    errors.push({
      field,
      message: `${field} must be one of: ${[...allowedValues].join(", ")}.`
    });
  }
}

export function validateCreateEmotionAnalysis(body) {
  if (!isPlainObject(body)) {
    throw new RequestValidationError([
      { field: "body", message: "The request body must be a JSON object." }
    ]);
  }

  const errors = [];
  const sessionId = readTrimmedString(body, "sessionId", errors);
  const situationText = readTrimmedString(body, "situationText", errors);
  const faceSignal = readTrimmedString(body, "faceSignal", errors);
  const voiceSignal = readTrimmedString(body, "voiceSignal", errors);
  const selectedScenario = readTrimmedString(body, "selectedScenario", errors);
  const aiResponse = readTrimmedString(body, "aiResponse", errors);

  if (sessionId && !UUID_PATTERN.test(sessionId)) {
    errors.push({ field: "sessionId", message: "sessionId must be a valid UUID." });
  }

  if (situationText.length > 500) {
    errors.push({
      field: "situationText",
      message: "situationText must contain at most 500 characters."
    });
  }

  validateAllowedValue(faceSignal, "faceSignal", FACE_SIGNALS, errors);
  validateAllowedValue(voiceSignal, "voiceSignal", VOICE_SIGNALS, errors);
  validateAllowedValue(selectedScenario, "selectedScenario", SCENARIOS, errors);

  if (!isPlainObject(body.analysisResult)) {
    errors.push({
      field: "analysisResult",
      message: "analysisResult must be a JSON object."
    });
  }

  if (errors.length > 0) {
    throw new RequestValidationError(errors);
  }

  return {
    session_id: sessionId,
    situation_text: situationText,
    face_signal: faceSignal,
    voice_signal: voiceSignal,
    selected_scenario: selectedScenario,
    analysis_result: body.analysisResult,
    ai_response: aiResponse
  };
}

export function validateListEmotionAnalyses(query) {
  const errors = [];
  const sessionId = readTrimmedString(query, "sessionId", errors);

  if (sessionId && !UUID_PATTERN.test(sessionId)) {
    errors.push({ field: "sessionId", message: "sessionId must be a valid UUID." });
  }

  let limit = 20;

  if (query.limit !== undefined) {
    if (typeof query.limit !== "string" || !/^\d+$/.test(query.limit)) {
      errors.push({ field: "limit", message: "limit must be an integer between 1 and 100." });
    } else {
      limit = Number.parseInt(query.limit, 10);

      if (limit < 1 || limit > 100) {
        errors.push({
          field: "limit",
          message: "limit must be an integer between 1 and 100."
        });
      }
    }
  }

  if (errors.length > 0) {
    throw new RequestValidationError(errors);
  }

  return { sessionId, limit };
}
