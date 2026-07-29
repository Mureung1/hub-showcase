import { normalizeManagerBehaviorIntent, type ManagerBehaviorIntent } from "../../src/domain/managerBehaviorIntent";
import { normalizeManagerStatEvaluation, type ManagerStatEvaluation } from "../../src/domain/statGrowth";
import { createErrorResponse, type ApiErrorResponse, type ManagerContext, type QuestDifficulty, type QuestEventResult, type QuestEventType } from "./questEvents";

export const managerLlmPromptVersion = "manager-api-v1" as const;

export type ManagerLlmOutputKind = "managerLine" | "questSuggestion" | "difficultyEvaluation" | "statEvaluation" | "behaviorIntent";
export type ManagerLlmSource = "llm" | "rule_fallback";
export type ManagerLlmFallbackReason =
  | "LLM_DISABLED"
  | "LLM_PROVIDER_ERROR"
  | "INVALID_LLM_OUTPUT"
  | "RATE_LIMITED";

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
}

export interface ManagerLlmOutputFallback {
  managerLine: string;
  difficultyEvaluation: ManagerLlmDifficultyEvaluation;
  behaviorIntent: ManagerBehaviorIntent;
  statEvaluation: ManagerStatEvaluation;
  questSuggestion?: ManagerLlmQuestInput;
}

export interface ManagerLlmOutputData {
  managerLine?: string;
  questSuggestion?: ManagerLlmQuestInput;
  difficultyEvaluation?: ManagerLlmDifficultyEvaluation;
  statEvaluation?: ManagerStatEvaluation;
  behaviorIntent?: ManagerBehaviorIntent;
  source: ManagerLlmSource;
  fallbackReason?: ManagerLlmFallbackReason;
  promptVersion: typeof managerLlmPromptVersion;
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
    },
  };
}

export function resolveManagerLlmOutput(input: {
  outputKind: ManagerLlmOutputKind;
  rawOutput: unknown;
  fallback: ManagerLlmOutputFallback;
}): ManagerLlmResponse {
  const resolved = getResolvedOutput(input.outputKind, input.rawOutput, input.fallback);
  return {
    ok: true,
    data: resolved ?? createFallbackOutput(input.outputKind, input.fallback, "INVALID_LLM_OUTPUT"),
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
    const managerLine = boundedString(rawOutput.managerLine, 180);
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

  const questSuggestion = parseQuest(rawOutput.questSuggestion);
  return questSuggestion ? { questSuggestion, ...base } : null;
}

function parseDifficultyEvaluation(value: unknown): ManagerLlmDifficultyEvaluation | null {
  if (!isRecord(value) || !isDifficulty(value.difficulty)) return null;
  const rewardExp = Number(value.rewardExp);
  const reason = boundedString(value.reason, 240);
  if (!Number.isInteger(rewardExp) || !isRewardExpInDifficultyRange(value.difficulty, rewardExp) || !reason) return null;
  return { difficulty: value.difficulty, rewardExp, reason };
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

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function nullableBoundedString(value: unknown, maxLength: number): string | null {
  if (value == null) return null;
  return boundedString(value, maxLength);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOutputKind(value: unknown): value is ManagerLlmOutputKind {
  return value === "managerLine" || value === "questSuggestion" || value === "difficultyEvaluation" || value === "statEvaluation" || value === "behaviorIntent";
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
