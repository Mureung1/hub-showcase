export const USER_SETTINGS_CATEGORIES = Object.freeze([
  "scholarship",
  "contest",
  "activity",
  "volunteer",
  "internship",
  "research",
  "education",
  "support",
]);

export const USER_SETTINGS_CATEGORY_LABELS = Object.freeze({
  activity: "대외활동",
  contest: "공모전",
  education: "교육 프로그램",
  internship: "인턴",
  research: "연구 프로그램",
  scholarship: "장학금",
  support: "지원사업",
  volunteer: "봉사",
});

export const DEFAULT_USER_SETTINGS = Object.freeze({
  recommendationCategories: ["scholarship", "contest", "activity", "internship", "research"],
  preferredRegions: [],
  includeOnline: true,
  minimumMatchScore: 50,
  includeUnknownDeadline: true,
  autoSaveAnalyzedOpportunities: false,
  recommendationLimit: 10,
});

const categorySet = new Set(USER_SETTINGS_CATEGORIES);

function uniqueStrings(values, maxLength = 60) {
  if (!Array.isArray(values)) return [];

  return Array.from(new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value && value.length <= maxLength),
  ));
}

function boundedInteger(value, fallback, min, max) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

export function createDefaultUserSettings() {
  return {
    ...DEFAULT_USER_SETTINGS,
    recommendationCategories: [...DEFAULT_USER_SETTINGS.recommendationCategories],
    preferredRegions: [...DEFAULT_USER_SETTINGS.preferredRegions],
  };
}

export function normalizeUserSettings(value = {}) {
  const categories = uniqueStrings(value.recommendationCategories)
    .filter((category) => categorySet.has(category));

  return {
    recommendationCategories: categories.length
      ? categories
      : [...DEFAULT_USER_SETTINGS.recommendationCategories],
    preferredRegions: uniqueStrings(value.preferredRegions),
    includeOnline: typeof value.includeOnline === "boolean"
      ? value.includeOnline
      : DEFAULT_USER_SETTINGS.includeOnline,
    minimumMatchScore: boundedInteger(
      value.minimumMatchScore,
      DEFAULT_USER_SETTINGS.minimumMatchScore,
      0,
      100,
    ),
    includeUnknownDeadline: typeof value.includeUnknownDeadline === "boolean"
      ? value.includeUnknownDeadline
      : DEFAULT_USER_SETTINGS.includeUnknownDeadline,
    autoSaveAnalyzedOpportunities: typeof value.autoSaveAnalyzedOpportunities === "boolean"
      ? value.autoSaveAnalyzedOpportunities
      : DEFAULT_USER_SETTINGS.autoSaveAnalyzedOpportunities,
    recommendationLimit: boundedInteger(
      value.recommendationLimit,
      DEFAULT_USER_SETTINGS.recommendationLimit,
      1,
      50,
    ),
  };
}