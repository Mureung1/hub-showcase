export const ANALYSIS_MODES = Object.freeze(["mock", "gemini", "openai"]);

export const OPPORTUNITY_CATEGORIES = Object.freeze([
  "scholarship",
  "contest",
  "activity",
  "volunteer",
  "support",
  "unknown",
]);

export const ELIGIBILITY_TYPES = Object.freeze([
  "grade",
  "major",
  "region",
  "school",
  "gpa",
  "income",
  "period",
  "team",
  "other",
]);

export const MATCH_STATUSES = Object.freeze([
  "eligible",
  "conditionally_eligible",
  "not_eligible",
  "insufficient_info",
]);

export const TASK_STATUSES = Object.freeze(["todo", "done"]);

export const CATEGORY_LABELS = Object.freeze({
  activity: "대외활동",
  contest: "공모전",
  scholarship: "장학금",
  support: "지원사업",
  unknown: "미분류",
  volunteer: "봉사",
});

export const MATCH_STATUS_LABELS = Object.freeze({
  conditionally_eligible: "조건부 가능",
  eligible: "지원 가능",
  insufficient_info: "정보 부족",
  not_eligible: "지원 불가",
});

export const ANALYSIS_MODE_LABELS = Object.freeze({
  gemini: "Gemini",
  mock: "mock",
  openai: "OpenAI",
});
