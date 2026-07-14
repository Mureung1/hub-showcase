import {
  ANALYSIS_MODES,
  ELIGIBILITY_TYPES,
  MATCH_STATUSES,
  OPPORTUNITY_CATEGORIES,
  TASK_STATUSES,
} from "../constants/opportunity.js";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asNullableString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function asString(value) {
  return asNullableString(value) || "";
}

function asStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map(asNullableString).filter(Boolean)));
}

function asEnum(value, allowedValues, fallback) {
  return allowedValues.includes(value) ? value : fallback;
}

function asScore(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function createAnalysisId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `analysis-${randomId}` : `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeAnalyzedAt(value) {
  const normalized = asNullableString(value);

  if (normalized && !Number.isNaN(Date.parse(normalized))) {
    return new Date(normalized).toISOString();
  }

  return new Date().toISOString();
}

function normalizeEligibility(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const entry = asObject(item);
    const condition = asNullableString(entry.condition);
    const evidence = asNullableString(entry.evidence);

    if (!condition || !evidence) {
      return [];
    }

    return [{
      type: asEnum(entry.type, ELIGIBILITY_TYPES, "other"),
      condition,
      evidence,
      required: entry.required === true,
    }];
  });
}

function normalizePreferred(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const entry = asObject(item);
    const condition = asNullableString(entry.condition);
    const evidence = asNullableString(entry.evidence);

    return condition && evidence ? [{ condition, evidence }] : [];
  });
}

function normalizeTasks(value, analysisId) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, index) => {
    const task = asObject(item);
    const title = asNullableString(task.title);

    if (!title) {
      return [];
    }

    return [{
      id: asNullableString(task.id) || `${analysisId}-task-${index + 1}`,
      title,
      dueDate: asNullableString(task.dueDate),
      status: asEnum(task.status, TASK_STATUSES, "todo"),
    }];
  });
}

export function createEmptyAnalysisResult(overrides = {}) {
  return normalizeAnalysisResult({
    mode: "mock",
    opportunity: {},
    match: {},
    tasks: [],
    ...overrides,
  });
}

export function normalizeAnalysisResult(value) {
  const result = asObject(value);
  const opportunity = asObject(result.opportunity);
  const match = asObject(result.match);
  const id = asNullableString(result.id) || createAnalysisId();

  return {
    id,
    analyzedAt: normalizeAnalyzedAt(result.analyzedAt),
    mode: asEnum(result.mode, ANALYSIS_MODES, "mock"),
    fallbackUsed: result.fallbackUsed === true,
    fallbackReason: result.fallbackUsed === true ? asNullableString(result.fallbackReason) : null,
    opportunity: {
      title: asNullableString(opportunity.title),
      organizer: asNullableString(opportunity.organizer),
      category: asEnum(opportunity.category, OPPORTUNITY_CATEGORIES, "unknown"),
      deadline: asNullableString(opportunity.deadline),
      target: asNullableString(opportunity.target),
      eligibility: normalizeEligibility(opportunity.eligibility),
      preferred: normalizePreferred(opportunity.preferred),
      requiredDocuments: asStringArray(opportunity.requiredDocuments),
      benefits: asStringArray(opportunity.benefits),
      activityPeriod: asNullableString(opportunity.activityPeriod),
      sourceUrl: asNullableString(opportunity.sourceUrl),
      uncertainFields: asStringArray(opportunity.uncertainFields),
    },
    match: {
      status: asEnum(match.status, MATCH_STATUSES, "insufficient_info"),
      score: asScore(match.score),
      summary: asString(match.summary),
      matchedReasons: asStringArray(match.matchedReasons),
      missingInfo: asStringArray(match.missingInfo),
      disqualifyingReasons: asStringArray(match.disqualifyingReasons),
      nextActions: asStringArray(match.nextActions),
    },
    tasks: normalizeTasks(result.tasks, id),
  };
}
