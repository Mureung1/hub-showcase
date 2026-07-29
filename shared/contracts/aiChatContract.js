export const AI_CHAT_LIMITS = Object.freeze({
  messageLength: 500,
  recentMessageCount: 6,
  recentMessageLength: 1000,
  responseLength: 1200
});

export const AI_CHAT_ROLES = Object.freeze(["user", "ai"]);

export const AI_EMOTION_KEYS = Object.freeze([
  "anxiety",
  "sadness",
  "anger",
  "joy",
  "neutral"
]);

export const AI_RESPONSE_APPROACHES = Object.freeze([
  "ask_gently",
  "keep_brief",
  "continue_normally"
]);
