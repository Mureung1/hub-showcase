import {
  AI_CHAT_LIMITS,
  AI_CHAT_ROLES
} from "../../../shared/contracts/aiChatContract.js";
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

export function validateAiChatRequest(body) {
  const payload = body && typeof body === "object" ? body : {};
  return {
    message: requireTrimmedText(
      payload.message,
      "message",
      AI_CHAT_LIMITS.messageLength
    ),
    recentMessages: normalizeRecentMessages(payload.recentMessages),
    analysis:
      payload.analysis && typeof payload.analysis === "object"
        ? payload.analysis
        : {}
  };
}

