import {
  CAMERA_FEATURE_NAMES,
  EMOTION_ANALYSIS_LIMITS,
  FACE_SIGNALS,
  FACE_SIGNAL_SOURCES,
  SCENARIOS,
  VOICE_SIGNALS
} from "../../../shared/contracts/emotionAnalysisContract.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALLOWED_FACE_SIGNALS = new Set(FACE_SIGNALS);
const ALLOWED_VOICE_SIGNALS = new Set(VOICE_SIGNALS);
const ALLOWED_SCENARIOS = new Set(SCENARIOS);
const ALLOWED_FACE_SIGNAL_SOURCES = new Set(FACE_SIGNAL_SOURCES);
const ALLOWED_FACE_SIGNAL_EVIDENCE = new Set(CAMERA_FEATURE_NAMES);

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

function readFaceSignalMetadata(body, errors) {
  const source = body.faceSignalSource === undefined ? "manual" : body.faceSignalSource;
  const confidence = body.faceSignalConfidence ?? null;
  const evidence = body.faceSignalEvidence === undefined ? [] : body.faceSignalEvidence;
  const heuristicVersion = body.faceSignalHeuristicVersion ?? null;

  if (typeof source !== "string" || !ALLOWED_FACE_SIGNAL_SOURCES.has(source)) {
    errors.push({
      field: "faceSignalSource",
      message: "faceSignalSource must be one of: manual, camera."
    });
  }

  if (
    confidence !== null &&
    (typeof confidence !== "number" ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1)
  ) {
    errors.push({
      field: "faceSignalConfidence",
      message: "faceSignalConfidence must be null or a number between 0 and 1."
    });
  }

  if (
    !Array.isArray(evidence) ||
    evidence.length > EMOTION_ANALYSIS_LIMITS.cameraEvidenceCount ||
    evidence.some(
      (item) =>
        typeof item !== "string" || !ALLOWED_FACE_SIGNAL_EVIDENCE.has(item)
    )
  ) {
    errors.push({
      field: "faceSignalEvidence",
      message: "faceSignalEvidence must contain at most 3 allowed feature names."
    });
  }

  if (
    heuristicVersion !== null &&
    (typeof heuristicVersion !== "string" || !/^v\d+$/.test(heuristicVersion))
  ) {
    errors.push({
      field: "faceSignalHeuristicVersion",
      message: "faceSignalHeuristicVersion must be null or a version such as v1."
    });
  }

  if (source === "camera" && (confidence === null || heuristicVersion === null)) {
    errors.push({
      field: "faceSignalSource",
      message: "Camera signals require confidence and a heuristic version."
    });
  }

  if (
    source === "manual" &&
    (confidence !== null || (Array.isArray(evidence) && evidence.length > 0) || heuristicVersion !== null)
  ) {
    errors.push({
      field: "faceSignalSource",
      message: "Manual signals cannot include camera-derived metadata."
    });
  }

  return {
    source: ALLOWED_FACE_SIGNAL_SOURCES.has(source) ? source : "manual",
    confidence,
    evidence: Array.isArray(evidence)
      ? [...new Set(evidence)].slice(
          0,
          EMOTION_ANALYSIS_LIMITS.cameraEvidenceCount
        )
      : [],
    heuristicVersion
  };
}

function readFaceSignal(body, source, errors) {
  if (source === "camera") {
    return null;
  }

  return readTrimmedString(body, "faceSignal", errors);
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
  const voiceSignal = readTrimmedString(body, "voiceSignal", errors);
  const selectedScenario = readTrimmedString(body, "selectedScenario", errors);
  const aiResponse = readTrimmedString(body, "aiResponse", errors);
  const faceSignalMetadata = readFaceSignalMetadata(body, errors);
  const faceSignal = readFaceSignal(body, faceSignalMetadata.source, errors);

  if (sessionId && !UUID_PATTERN.test(sessionId)) {
    errors.push({ field: "sessionId", message: "sessionId must be a valid UUID." });
  }

  if (situationText.length > EMOTION_ANALYSIS_LIMITS.situationTextLength) {
    errors.push({
      field: "situationText",
      message: "situationText must contain at most 500 characters."
    });
  }

  validateAllowedValue(faceSignal, "faceSignal", ALLOWED_FACE_SIGNALS, errors);
  validateAllowedValue(voiceSignal, "voiceSignal", ALLOWED_VOICE_SIGNALS, errors);
  validateAllowedValue(
    selectedScenario,
    "selectedScenario",
    ALLOWED_SCENARIOS,
    errors
  );

  if (!isPlainObject(body.analysisResult)) {
    errors.push({
      field: "analysisResult",
      message: "analysisResult must be a JSON object."
    });
  } else if (
    Buffer.byteLength(JSON.stringify(body.analysisResult), "utf8") >
    EMOTION_ANALYSIS_LIMITS.analysisResultBytes
  ) {
    errors.push({
      field: "analysisResult",
      message: `analysisResult must not exceed ${EMOTION_ANALYSIS_LIMITS.analysisResultBytes} bytes.`
    });
  }

  if (aiResponse.length > EMOTION_ANALYSIS_LIMITS.aiResponseLength) {
    errors.push({
      field: "aiResponse",
      message: `aiResponse must contain at most ${EMOTION_ANALYSIS_LIMITS.aiResponseLength} characters.`
    });
  }

  if (errors.length > 0) {
    throw new RequestValidationError(errors);
  }

  return {
    session_id: sessionId,
    situation_text: situationText,
    face_signal: faceSignal,
    face_signal_source: faceSignalMetadata.source,
    face_signal_confidence: faceSignalMetadata.confidence,
    face_signal_evidence: faceSignalMetadata.evidence,
    face_signal_heuristic_version: faceSignalMetadata.heuristicVersion,
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
