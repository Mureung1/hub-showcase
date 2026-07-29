import {
  AI_CHAT_LIMITS,
  AI_CHAT_ROLES
} from "../../../shared/contracts/aiChatContract.js";
import {
  CAMERA_FEATURE_NAMES,
  FACE_SIGNAL_SOURCES,
  VOICE_SIGNALS
} from "../../../shared/contracts/emotionAnalysisContract.js";
import { RequestValidationError } from "../emotion-analyses/emotionAnalysisValidation.js";

function requireTrimmedText(value, field, maximumLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new RequestValidationError(
      "VALIDATION_ERROR",
      `${field} must be a non-empty string.`,
      [{ field, issue: "required" }]
    );
  }

  const text = value.trim();
  if (text.length > maximumLength) {
    throw new RequestValidationError(
      "VALIDATION_ERROR",
      `${field} is too long.`,
      [{ field, issue: "maximum_length", maximum: maximumLength }]
    );
  }
  return text;
}

function normalizeRecentMessages(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new RequestValidationError(
      "VALIDATION_ERROR",
      "recentMessages must be an array.",
      [{ field: "recentMessages", issue: "invalid_type" }]
    );
  }

  return value.slice(-AI_CHAT_LIMITS.recentMessageCount).map((message, index) => {
    if (!message || !AI_CHAT_ROLES.includes(message.role)) {
      throw new RequestValidationError(
        "VALIDATION_ERROR",
        "Each recent message must have a supported role.",
        [{ field: `recentMessages.${index}.role`, issue: "invalid_value" }]
      );
    }

    return {
      role: message.role,
      content: requireTrimmedText(
        message.content,
        `recentMessages.${index}.content`,
        AI_CHAT_LIMITS.recentMessageLength
      )
    };
  });
}

function normalizeSignals(value) {
  const signals = value && typeof value === "object" ? value : {};
  const source = FACE_SIGNAL_SOURCES.includes(signals.faceSignalSource)
    ? signals.faceSignalSource
    : "manual";
  const confidence = Number(signals.faceSignalConfidence);
  const features = Array.isArray(signals.faceFeatures)
    ? signals.faceFeatures
        .filter(
          (feature) =>
            CAMERA_FEATURE_NAMES.includes(feature?.name) &&
            Number.isFinite(Number(feature?.score))
        )
        .slice(0, 6)
        .map((feature) => ({
          name: feature.name,
          score: Math.min(1, Math.max(0, Number(feature.score)))
        }))
    : [];

  return {
    faceSignalSource: source,
    faceSignalConfidence:
      source === "camera" && Number.isFinite(confidence)
        ? Math.min(1, Math.max(0, confidence))
        : null,
    faceFeatures: source === "camera" ? features : [],
    voiceSignal: VOICE_SIGNALS.includes(signals.voiceSignal)
      ? signals.voiceSignal
      : "normal"
  };
}

export function validateAiChatRequest(body) {
  const payload = body && typeof body === "object" ? body : {};
  return {
    message: requireTrimmedText(
      payload.message,
      "message",
      AI_CHAT_LIMITS.messageLength
    ),
    recentMessages: normalizeRecentMessages(payload.recentMessages),
    signals: normalizeSignals(payload.signals)
  };
}
