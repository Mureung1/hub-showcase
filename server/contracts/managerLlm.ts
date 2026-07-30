import { normalizeManagerBehaviorIntent, type ManagerBehaviorIntent } from "../../src/domain/managerBehaviorIntent.js";
import { normalizeManagerStatEvaluation, type ManagerStatEvaluation } from "../../src/domain/statGrowth.js";
import { createErrorResponse, type ApiErrorResponse, type ManagerContext, type QuestDifficulty, type QuestEventResult, type QuestEventType } from "./questEvents.js";

export const managerLlmPromptVersion = "manager-api-v1" as const;

export type ManagerLlmOutputKind =
  | "managerLine"
  | "questSuggestion"
  | "difficultyEvaluation"
  | "statEvaluation"
  | "behaviorIntent"
  | "goalPlan"
  | "planRebalance"
  | "questAcceptancePreview";
export type ManagerLlmSource = "llm" | "rule_fallback";
export type ManagerLlmFallbackReason =
  | "LLM_DISABLED"
  | "LLM_PROVIDER_ERROR"
  | "INVALID_LLM_OUTPUT"
  | "RATE_LIMITED"
  | "CLIENT_THROTTLED";

export interface ManagerLlmProfileInput {
  nickname: string;
  goal: string;
  category: "study" | "exercise" | "hobby" | "career" | "habit";
  dailyMinutes: number;
  questSize: "tiny" | "balanced" | "challenge";
  managerTone: "calm" | "friendly" | "firm";
}

export interface ManagerLlmPersonaInput {
  petId: string;
  tone: "calm" | "friendly" | "firm";
  questStyle: "tiny" | "balanced" | "challenge";
  feedbackStyle: "gentle" | "playful" | "direct";
  behaviorStyle: "balanced" | "adventurous" | "shy";
}

export interface ManagerLlmQuestInput {
  title: string;
  type: "time" | "quantity" | "action";
  amount: number;
  unit: string;
  difficulty: "easy" | "normal" | "hard";
  deadline: string;
  rewardExp: number;
}

export interface ManagerLlmDifficultyEvaluation {
  difficulty: "easy" | "normal" | "hard";
  rewardExp: number;
  reason: string;
}

export interface ManagerLlmQuestSeed extends ManagerLlmQuestInput {
  linkedMilestoneId: string;
}

export interface ManagerLlmRecoveryQuest extends ManagerLlmQuestSeed {
  recoveryReason: string;
}

export interface ManagerGoalPlan {
  goalSummary: string;
  horizon: "month" | "quarter";
  milestones: Array<{
    id: string;
    title: string;
    targetWeek: number;
    successCriteria: string[];
  }>;
  monthlyPlan: Array<{
    monthIndex: number;
    focus: string;
    milestoneIds: string[];
  }>;
  weeklyPlan: Array<{
    weekIndex: number;
    focus: string;
    targetOutcome: string;
    suggestedQuestThemes: string[];
  }>;
  dailySeeds: ManagerLlmQuestSeed[];
  risks: string[];
  rebalancingPolicy: {
    onSuccess: string;
    onFailureTimeShortage: string;
    onFailureTooHard: string;
    onSkippedDays: string;
  };
}

export interface ManagerPlanRebalance {
  rebalancedPlan: ManagerGoalPlan;
  changes: Array<{
    scope: "daily" | "weekly" | "milestone";
    reason: "success_streak" | "failure_time_shortage" | "failure_too_hard" | "skipped_days";
    before: string;
    after: string;
  }>;
  nextQuest: ManagerLlmRecoveryQuest;
}

export interface ManagerQuestAcceptancePreview {
  difficulty: "easy" | "normal" | "hard";
  rewardExp: number;
  statEvaluation: ManagerStatEvaluation;
  reason: string;
}

export const rewardExpRangeByDifficulty: Record<ManagerLlmDifficultyEvaluation["difficulty"], { min: number; max: number }> = {
  easy: { min: 5, max: 15 },
  normal: { min: 16, max: 35 },
  hard: { min: 36, max: 60 },
};

export interface ManagerLlmQuestStateInput {
  status: "draft" | "active" | "success" | "failed" | "recovery";
  currentQuest?: ManagerLlmQuestInput;
  previousQuestTitle?: string | null;
  failureReason?: string | null;
}

export interface ManagerLlmRecentEventInput {
  type: QuestEventType;
  title: string;
  result: QuestEventResult | null;
  difficulty: QuestDifficulty;
  createdAt: string;
}

export interface ManagerLlmRequest {
  promptVersion: typeof managerLlmPromptVersion;
  outputKind: ManagerLlmOutputKind;
  managerContext: ManagerContext;
  profile: ManagerLlmProfileInput;
  persona: ManagerLlmPersonaInput;
  questState: ManagerLlmQuestStateInput;
  recentEvents: ManagerLlmRecentEventInput[];
  activePlanId?: string | null;
  activePlan?: ManagerGoalPlan;
}

export interface ManagerLlmOutputFallback {
  managerLine: string;
  difficultyEvaluation: ManagerLlmDifficultyEvaluation;
  behaviorIntent: ManagerBehaviorIntent;
  statEvaluation: ManagerStatEvaluation;
  questSuggestion?: ManagerLlmQuestInput;
  goalPlan?: ManagerGoalPlan;
  planRebalance?: ManagerPlanRebalance;
  questAcceptancePreview?: ManagerQuestAcceptancePreview;
}

export interface ManagerLlmOutputData {
  managerLine?: string;
  questSuggestion?: ManagerLlmQuestInput;
  difficultyEvaluation?: ManagerLlmDifficultyEvaluation;
  statEvaluation?: ManagerStatEvaluation;
  behaviorIntent?: ManagerBehaviorIntent;
  goalPlan?: ManagerGoalPlan;
  planRebalance?: ManagerPlanRebalance;
  questAcceptancePreview?: ManagerQuestAcceptancePreview;
  source: ManagerLlmSource;
  fallbackReason?: ManagerLlmFallbackReason;
  promptVersion: typeof managerLlmPromptVersion;
  storedPlanId?: string;
  storedRevisionId?: string;
}

export interface ManagerLlmResponse {
  ok: true;
  data: ManagerLlmOutputData;
}

export type ManagerLlmApiResponse = ManagerLlmResponse | ApiErrorResponse;

export function parseManagerLlmRequest(value: unknown): { ok: true; data: ManagerLlmRequest } | ApiErrorResponse {
  if (!isRecord(value)) return createErrorResponse("VALIDATION_ERROR", "Request body must be an object.");
  if (value.promptVersion !== managerLlmPromptVersion) {
    return createErrorResponse("VALIDATION_ERROR", "promptVersion is invalid.", { field: "promptVersion" });
  }
  if (!isOutputKind(value.outputKind)) {
    return createErrorResponse("VALIDATION_ERROR", "outputKind is invalid.", { field: "outputKind" });
  }

  const managerContext = parseManagerContext(value.managerContext);
  if (!managerContext) return createErrorResponse("VALIDATION_ERROR", "managerContext is invalid.", { field: "managerContext" });
  const profile = parseProfile(value.profile);
  if (!profile) return createErrorResponse("VALIDATION_ERROR", "profile is invalid.", { field: "profile" });
  const persona = parsePersona(value.persona);
  if (!persona) return createErrorResponse("VALIDATION_ERROR", "persona is invalid.", { field: "persona" });
  const questState = parseQuestState(value.questState);
  if (!questState) return createErrorResponse("VALIDATION_ERROR", "questState is invalid.", { field: "questState" });
  if (!Array.isArray(value.recentEvents)) {
    return createErrorResponse("VALIDATION_ERROR", "recentEvents must be an array.", { field: "recentEvents" });
  }

  return {
    ok: true,
    data: {
      promptVersion: managerLlmPromptVersion,
      outputKind: value.outputKind,
      managerContext,
      profile,
      persona,
      questState,
      recentEvents: value.recentEvents.slice(0, 10).flatMap(parseRecentEvent),
      activePlanId: nullableBoundedString(value.activePlanId, 80),
      activePlan: value.activePlan === undefined ? undefined : parseGoalPlan(value.activePlan) ?? undefined,
    },
  };
}

export function resolveManagerLlmOutput(input: {
  outputKind: ManagerLlmOutputKind;
  rawOutput: unknown;
  fallback: ManagerLlmOutputFallback;
  request?: ManagerLlmRequest;
}): ManagerLlmResponse {
  const resolved = getResolvedOutput(input.outputKind, input.rawOutput, input.fallback);
  return {
    ok: true,
    data: resolved && isResolvedOutputAcceptable(input.outputKind, resolved, input.request)
      ? resolved
      : createFallbackOutput(input.outputKind, input.fallback, "INVALID_LLM_OUTPUT"),
  };
}

export function createFallbackOutput(
  outputKind: ManagerLlmOutputKind,
  fallback: ManagerLlmOutputFallback,
  fallbackReason: ManagerLlmFallbackReason,
): ManagerLlmOutputData {
  const base = { source: "rule_fallback" as const, fallbackReason, promptVersion: managerLlmPromptVersion };
  if (outputKind === "managerLine") return { managerLine: fallback.managerLine, ...base };
  if (outputKind === "difficultyEvaluation") return { difficultyEvaluation: fallback.difficultyEvaluation, ...base };
  if (outputKind === "behaviorIntent") return { behaviorIntent: fallback.behaviorIntent, ...base };
  if (outputKind === "statEvaluation") return { statEvaluation: fallback.statEvaluation, ...base };
  if (outputKind === "goalPlan") return { goalPlan: fallback.goalPlan, ...base };
  if (outputKind === "planRebalance") return { planRebalance: fallback.planRebalance, ...base };
  if (outputKind === "questAcceptancePreview") return { questAcceptancePreview: fallback.questAcceptancePreview, ...base };
  return { questSuggestion: fallback.questSuggestion, ...base };
}

function getResolvedOutput(
  outputKind: ManagerLlmOutputKind,
  rawOutput: unknown,
  fallback: ManagerLlmOutputFallback,
): ManagerLlmOutputData | null {
  if (!isRecord(rawOutput)) return null;
  const base = { source: "llm" as const, promptVersion: managerLlmPromptVersion };

  if (outputKind === "managerLine") {
    const managerLine = boundedManagerLine(rawOutput.managerLine);
    return managerLine ? { managerLine, ...base } : null;
  }

  if (outputKind === "behaviorIntent") {
    const normalized = normalizeManagerBehaviorIntent(rawOutput.behaviorIntent, fallback.behaviorIntent);
    return normalized === fallback.behaviorIntent ? null : { behaviorIntent: normalized, ...base };
  }

  if (outputKind === "difficultyEvaluation") {
    const difficultyEvaluation = parseDifficultyEvaluation(rawOutput.difficultyEvaluation);
    return difficultyEvaluation ? { difficultyEvaluation, ...base } : null;
  }

  if (outputKind === "statEvaluation") {
    const normalized = normalizeManagerStatEvaluation(rawOutput.statEvaluation, fallback.statEvaluation);
    return normalized === fallback.statEvaluation ? null : { statEvaluation: normalized, ...base };
  }

  if (outputKind === "goalPlan") {
    const goalPlan = parseGoalPlan(rawOutput.goalPlan);
    return goalPlan ? { goalPlan, ...base } : null;
  }

  if (outputKind === "planRebalance") {
    const planRebalance = parsePlanRebalance(rawOutput.planRebalance);
    return planRebalance ? { planRebalance, ...base } : null;
  }

  if (outputKind === "questAcceptancePreview") {
    const questAcceptancePreview = parseQuestAcceptancePreview(rawOutput.questAcceptancePreview, fallback.questAcceptancePreview);
    return questAcceptancePreview ? { questAcceptancePreview, ...base } : null;
  }

  const questSuggestion = parseQuest(rawOutput.questSuggestion);
  return questSuggestion ? { questSuggestion, ...base } : null;
}

function isResolvedOutputAcceptable(
  outputKind: ManagerLlmOutputKind,
  output: ManagerLlmOutputData,
  request: ManagerLlmRequest | undefined,
): boolean {
  if (outputKind !== "questSuggestion" || !output.questSuggestion) return true;
  if (!isRewardExpInDifficultyRange(output.questSuggestion.difficulty, output.questSuggestion.rewardExp)) return false;
  return !request || !isQuestTitleTooCloseToGoal(output.questSuggestion.title, request.profile.goal);
}

function parseDifficultyEvaluation(value: unknown): ManagerLlmDifficultyEvaluation | null {
  if (!isRecord(value) || !isDifficulty(value.difficulty)) return null;
  const rewardExp = Number(value.rewardExp);
  const reason = boundedString(value.reason, 240);
  if (!Number.isInteger(rewardExp) || !isRewardExpInDifficultyRange(value.difficulty, rewardExp) || !reason) return null;
  return { difficulty: value.difficulty, rewardExp, reason };
}

function parseQuestAcceptancePreview(value: unknown, fallback: ManagerQuestAcceptancePreview | undefined): ManagerQuestAcceptancePreview | null {
  if (!isRecord(value) || !isDifficulty(value.difficulty)) return null;
  const rewardExp = Number(value.rewardExp);
  const reason = boundedString(value.reason, 240);
  if (!Number.isInteger(rewardExp) || !isRewardExpInDifficultyRange(value.difficulty, rewardExp) || !reason || !fallback) return null;

  const statEvaluation = normalizeManagerStatEvaluation(value.statEvaluation, fallback.statEvaluation);
  if (statEvaluation === fallback.statEvaluation || statEvaluation.difficulty !== value.difficulty) return null;
  return { difficulty: value.difficulty, rewardExp, statEvaluation, reason };
}

function isRewardExpInDifficultyRange(difficulty: ManagerLlmDifficultyEvaluation["difficulty"], rewardExp: number) {
  const range = rewardExpRangeByDifficulty[difficulty];
  return rewardExp >= range.min && rewardExp <= range.max;
}

function parseManagerContext(value: unknown): ManagerContext | null {
  if (!isRecord(value)) return null;
  const recentEventCount = Number(value.recentEventCount);
  if (!isManagerMood(value.currentMood) || !Number.isInteger(recentEventCount) || recentEventCount < 0) return null;
  if (value.lastQuestResult !== null && !isQuestEventResult(value.lastQuestResult)) return null;
  const memorySummary = boundedString(value.memorySummary, 400);
  if (!memorySummary || !Array.isArray(value.rewardHints)) return null;
  return {
    currentMood: value.currentMood,
    recentEventCount,
    lastQuestResult: value.lastQuestResult,
    memorySummary,
    rewardHints: value.rewardHints.filter((hint): hint is string => typeof hint === "string").slice(0, 8),
  };
}

function parseProfile(value: unknown): ManagerLlmProfileInput | null {
  if (!isRecord(value)) return null;
  const nickname = boundedString(value.nickname, 40);
  const goal = boundedString(value.goal, 160);
  const dailyMinutes = Number(value.dailyMinutes);
  if (!nickname || !goal || !isCategory(value.category) || !Number.isInteger(dailyMinutes) || dailyMinutes < 1) return null;
  if (!isQuestSize(value.questSize) || !isTone(value.managerTone)) return null;
  return {
    nickname,
    goal,
    category: value.category,
    dailyMinutes,
    questSize: value.questSize,
    managerTone: value.managerTone,
  };
}

function parsePersona(value: unknown): ManagerLlmPersonaInput | null {
  if (!isRecord(value)) return null;
  const petId = boundedString(value.petId, 60);
  if (!petId || !isTone(value.tone) || !isQuestSize(value.questStyle) || !isFeedbackStyle(value.feedbackStyle) || !isBehaviorStyle(value.behaviorStyle)) {
    return null;
  }
  return {
    petId,
    tone: value.tone,
    questStyle: value.questStyle,
    feedbackStyle: value.feedbackStyle,
    behaviorStyle: value.behaviorStyle,
  };
}

function parseQuestState(value: unknown): ManagerLlmQuestStateInput | null {
  if (!isRecord(value) || !isQuestStatus(value.status)) return null;
  const previousQuestTitle = nullableBoundedString(value.previousQuestTitle, 160);
  const failureReason = nullableBoundedString(value.failureReason, 120);
  const currentQuest = value.currentQuest === undefined ? undefined : parseQuest(value.currentQuest) ?? undefined;
  if (value.currentQuest !== undefined && !currentQuest) return null;
  return { status: value.status, currentQuest, previousQuestTitle, failureReason };
}

function parseRecentEvent(value: unknown): ManagerLlmRecentEventInput[] {
  if (!isRecord(value) || !isQuestEventType(value.type)) return [];
  const title = boundedString(value.title, 160);
  const createdAt = boundedString(value.createdAt, 40);
  if (!title || !createdAt || (value.result !== null && !isQuestEventResult(value.result)) || !isDifficulty(value.difficulty)) return [];
  return [{ type: value.type, title, result: value.result, difficulty: value.difficulty, createdAt }];
}

function parseQuest(value: unknown): ManagerLlmQuestInput | null {
  if (!isRecord(value)) return null;
  const title = boundedString(value.title, 120);
  const unit = boundedString(value.unit, 20);
  const deadline = boundedString(value.deadline, 40);
  const amount = Number(value.amount);
  const rewardExp = Number(value.rewardExp);
  if (!title || !unit || !deadline || !isQuestType(value.type) || !isDifficulty(value.difficulty)) return null;
  if (!Number.isInteger(amount) || amount < 1 || !Number.isInteger(rewardExp) || rewardExp < 0) return null;
  if (!isRewardExpInDifficultyRange(value.difficulty, rewardExp)) return null;
  return {
    title,
    type: value.type,
    amount,
    unit,
    difficulty: value.difficulty,
    deadline,
    rewardExp,
  };
}

function parseQuestSeed(value: unknown): ManagerLlmQuestSeed | null {
  const quest = parseQuest(value);
  if (!quest || !isRecord(value)) return null;
  const linkedMilestoneId = boundedString(value.linkedMilestoneId, 40);
  return linkedMilestoneId ? { ...quest, linkedMilestoneId } : null;
}

function parseGoalPlan(value: unknown): ManagerGoalPlan | null {
  if (!isRecord(value) || !isPlanHorizon(value.horizon)) return null;
  const goalSummary = boundedString(value.goalSummary, 160);
  const milestones = parseArray(value.milestones, parseMilestone, 8);
  const monthlyPlan = parseArray(value.monthlyPlan, parseMonthlyPlanItem, 4);
  const weeklyPlan = parseArray(value.weeklyPlan, parseWeeklyPlanItem, 16);
  const dailySeeds = parseArray(value.dailySeeds, parseQuestSeed, 14);
  const risks = parseStringArray(value.risks, 6, 120);
  const rebalancingPolicy = parseRebalancingPolicy(value.rebalancingPolicy);
  if (!goalSummary || milestones.length === 0 || weeklyPlan.length === 0 || dailySeeds.length === 0 || !rebalancingPolicy) return null;
  return { goalSummary, horizon: value.horizon, milestones, monthlyPlan, weeklyPlan, dailySeeds, risks, rebalancingPolicy };
}

function parsePlanRebalance(value: unknown): ManagerPlanRebalance | null {
  if (!isRecord(value)) return null;
  const rebalancedPlan = parseGoalPlan(value.rebalancedPlan);
  const changes = parseArray(value.changes, parsePlanChange, 12);
  const nextQuest = parseRecoveryQuest(value.nextQuest);
  return rebalancedPlan && changes.length > 0 && nextQuest ? { rebalancedPlan, changes, nextQuest } : null;
}

function parseRecoveryQuest(value: unknown): ManagerLlmRecoveryQuest | null {
  const questSeed = parseQuestSeed(value);
  if (!questSeed || !isRecord(value)) return null;
  const recoveryReason = boundedString(value.recoveryReason, 160);
  return recoveryReason ? { ...questSeed, recoveryReason } : null;
}

function parseMilestone(value: unknown): ManagerGoalPlan["milestones"][number] | null {
  if (!isRecord(value)) return null;
  const id = boundedString(value.id, 40);
  const title = boundedString(value.title, 80);
  const targetWeek = Number(value.targetWeek);
  const successCriteria = parseStringArray(value.successCriteria, 5, 120);
  if (!id || !title || !Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > 52 || successCriteria.length === 0) return null;
  return { id, title, targetWeek, successCriteria };
}

function parseMonthlyPlanItem(value: unknown): ManagerGoalPlan["monthlyPlan"][number] | null {
  if (!isRecord(value)) return null;
  const monthIndex = Number(value.monthIndex);
  const focus = boundedString(value.focus, 120);
  const milestoneIds = parseStringArray(value.milestoneIds, 8, 40);
  if (!Number.isInteger(monthIndex) || monthIndex < 1 || monthIndex > 12 || !focus) return null;
  return { monthIndex, focus, milestoneIds };
}

function parseWeeklyPlanItem(value: unknown): ManagerGoalPlan["weeklyPlan"][number] | null {
  if (!isRecord(value)) return null;
  const weekIndex = Number(value.weekIndex);
  const focus = boundedString(value.focus, 120);
  const targetOutcome = boundedString(value.targetOutcome, 120);
  const suggestedQuestThemes = parseStringArray(value.suggestedQuestThemes, 8, 80);
  if (!Number.isInteger(weekIndex) || weekIndex < 1 || weekIndex > 52 || !focus || !targetOutcome || suggestedQuestThemes.length === 0) return null;
  return { weekIndex, focus, targetOutcome, suggestedQuestThemes };
}

function parseRebalancingPolicy(value: unknown): ManagerGoalPlan["rebalancingPolicy"] | null {
  if (!isRecord(value)) return null;
  const onSuccess = boundedString(value.onSuccess, 160);
  const onFailureTimeShortage = boundedString(value.onFailureTimeShortage, 160);
  const onFailureTooHard = boundedString(value.onFailureTooHard, 160);
  const onSkippedDays = boundedString(value.onSkippedDays, 160);
  if (!onSuccess || !onFailureTimeShortage || !onFailureTooHard || !onSkippedDays) return null;
  return { onSuccess, onFailureTimeShortage, onFailureTooHard, onSkippedDays };
}

function parsePlanChange(value: unknown): ManagerPlanRebalance["changes"][number] | null {
  if (!isRecord(value) || !isPlanChangeScope(value.scope) || !isPlanChangeReason(value.reason)) return null;
  const before = boundedString(value.before, 160);
  const after = boundedString(value.after, 160);
  return before && after ? { scope: value.scope, reason: value.reason, before, after } : null;
}

function isQuestTitleTooCloseToGoal(title: string, goal: string): boolean {
  const normalizedTitle = normalizeComparableText(title);
  const normalizedGoal = normalizeComparableText(goal);
  if (!normalizedTitle || !normalizedGoal) return false;
  if (normalizedTitle === normalizedGoal) return true;

  const genericSuffixes = ["corereview", "summary", "study", "practice", "nextstep", "핵심정리", "정리", "공부", "연습", "다음단계"];
  return genericSuffixes.some((suffix) => normalizedTitle === `${normalizedGoal}${suffix}`);
}

function normalizeComparableText(value: string): string {
  return value.toLowerCase().replace(/[\s:;,.!?\-_/()[\]{}'"`]+/g, "");
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function parseStringArray(value: unknown, maxItems: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = boundedString(item, maxLength);
    return parsed ? [parsed] : [];
  }).slice(0, maxItems);
}

function parseArray<T>(value: unknown, parser: (item: unknown) => T | null, maxItems: number): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = parser(item);
    return parsed ? [parsed] : [];
  }).slice(0, maxItems);
}

function boundedManagerLine(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .map((line) => line.slice(0, 48));
  const trimmed = lines.join("\n").trim();
  if (!trimmed) return null;
  return trimmed;
}

function nullableBoundedString(value: unknown, maxLength: number): string | null {
  if (value == null) return null;
  return boundedString(value, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOutputKind(value: unknown): value is ManagerLlmOutputKind {
  return (
    value === "managerLine" ||
    value === "questSuggestion" ||
    value === "difficultyEvaluation" ||
    value === "statEvaluation" ||
    value === "behaviorIntent" ||
    value === "goalPlan" ||
    value === "planRebalance" ||
    value === "questAcceptancePreview"
  );
}

function isManagerMood(value: unknown): value is ManagerContext["currentMood"] {
  return value === "waiting" || value === "focused" || value === "happy" || value === "recovering";
}

function isQuestEventType(value: unknown): value is QuestEventType {
  return (
    value === "quest_suggested" ||
    value === "quest_accepted" ||
    value === "quest_completed" ||
    value === "quest_failed" ||
    value === "recovery_started" ||
    value === "recovery_completed" ||
    value === "manager_reaction" ||
    value === "reward_unlocked"
  );
}

function isQuestEventResult(value: unknown): value is QuestEventResult {
  return value === "success" || value === "failed" || value === "recovery";
}

function isQuestType(value: unknown): value is ManagerLlmQuestInput["type"] {
  return value === "time" || value === "quantity" || value === "action";
}

function isDifficulty(value: unknown): value is ManagerLlmQuestInput["difficulty"] {
  return value === "easy" || value === "normal" || value === "hard";
}

function isPlanHorizon(value: unknown): value is ManagerGoalPlan["horizon"] {
  return value === "month" || value === "quarter";
}

function isPlanChangeScope(value: unknown): value is ManagerPlanRebalance["changes"][number]["scope"] {
  return value === "daily" || value === "weekly" || value === "milestone";
}

function isPlanChangeReason(value: unknown): value is ManagerPlanRebalance["changes"][number]["reason"] {
  return value === "success_streak" || value === "failure_time_shortage" || value === "failure_too_hard" || value === "skipped_days";
}

function isCategory(value: unknown): value is ManagerLlmProfileInput["category"] {
  return value === "study" || value === "exercise" || value === "hobby" || value === "career" || value === "habit";
}

function isQuestSize(value: unknown): value is ManagerLlmProfileInput["questSize"] {
  return value === "tiny" || value === "balanced" || value === "challenge";
}

function isTone(value: unknown): value is ManagerLlmProfileInput["managerTone"] {
  return value === "calm" || value === "friendly" || value === "firm";
}

function isFeedbackStyle(value: unknown): value is ManagerLlmPersonaInput["feedbackStyle"] {
  return value === "gentle" || value === "playful" || value === "direct";
}

function isBehaviorStyle(value: unknown): value is ManagerLlmPersonaInput["behaviorStyle"] {
  return value === "balanced" || value === "adventurous" || value === "shy";
}

function isQuestStatus(value: unknown): value is ManagerLlmQuestStateInput["status"] {
  return value === "draft" || value === "active" || value === "success" || value === "failed" || value === "recovery";
}
