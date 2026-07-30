import type { ManagerBehaviorIntent } from "../../domain/managerBehaviorIntent";
import type { ManagerPersona } from "../../domain/managerPersonaPolicy";
import type { ManagerStatEvaluation } from "../../domain/statGrowth";
import type { Quest } from "../../domain/questLogic";
import type { ManagerContext, QuestEventType } from "./questLogApi";

export const managerLlmPromptVersion = "manager-api-v1";

export type ManagerLlmOutputKind =
  | "managerLine"
  | "questSuggestion"
  | "difficultyEvaluation"
  | "statEvaluation"
  | "behaviorIntent"
  | "goalPlan"
  | "planRebalance"
  | "questAcceptancePreview";

export interface ManagerLlmProfileInput {
  nickname: string;
  goal: string;
  category: "study" | "exercise" | "hobby" | "career" | "habit";
  dailyMinutes: number;
  questSize: "tiny" | "balanced" | "challenge";
  managerTone: "calm" | "friendly" | "firm";
}

export interface ManagerLlmPersonaInput extends ManagerPersona {
  petId: string;
}

export interface ManagerLlmQuestStateInput {
  status: "draft" | "active" | "success" | "failed" | "recovery";
  currentQuest?: Quest;
  previousQuestTitle?: string | null;
  failureReason?: string | null;
}

export interface ManagerLlmRecentEventInput {
  type: QuestEventType;
  title: string;
  result: "success" | "failed" | "recovery" | null;
  difficulty: "easy" | "normal" | "hard";
  createdAt: string;
}

export interface ManagerLlmQuestSeed extends Quest {
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

export interface ManagerLlmOutput {
  managerLine?: string;
  questSuggestion?: Quest;
  difficultyEvaluation?: {
    difficulty: "easy" | "normal" | "hard";
    rewardExp: number;
    reason: string;
  };
  statEvaluation?: ManagerStatEvaluation;
  behaviorIntent?: ManagerBehaviorIntent;
  goalPlan?: ManagerGoalPlan;
  planRebalance?: ManagerPlanRebalance;
  questAcceptancePreview?: ManagerQuestAcceptancePreview;
  source: "llm" | "rule_fallback";
  fallbackReason?: "LLM_DISABLED" | "LLM_PROVIDER_ERROR" | "INVALID_LLM_OUTPUT" | "RATE_LIMITED" | "CLIENT_THROTTLED";
  promptVersion: typeof managerLlmPromptVersion;
  storedPlanId?: string;
  storedRevisionId?: string;
}

interface ManagerLlmSuccessResponse {
  ok: true;
  data: ManagerLlmOutput;
}

interface ManagerLlmErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

type ManagerLlmApiResponse = ManagerLlmSuccessResponse | ManagerLlmErrorResponse;

const routeByKind: Record<ManagerLlmOutputKind, string> = {
  managerLine: "/api/manager/line",
  questSuggestion: "/api/manager/quest-suggestion",
  difficultyEvaluation: "/api/manager/difficulty-evaluation",
  statEvaluation: "/api/manager/stat-evaluation",
  behaviorIntent: "/api/manager/behavior-intent",
  goalPlan: "/api/manager/goal-plan",
  planRebalance: "/api/manager/plan-rebalance",
  questAcceptancePreview: "/api/manager/quest-acceptance-preview",
};

const defaultClientThrottleMs = 60_000;
const lastOutputByKind: Partial<Record<ManagerLlmOutputKind, { requestedAtMs: number; output: ManagerLlmOutput }>> = {};

export interface ManagerLlmClientOptions {
  nowMs?: number;
  throttleMs?: number;
}

export async function requestManagerBehaviorIntentViaApi(input: ManagerLlmRequest, fetchFn: typeof fetch = fetch) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "behaviorIntent" }, fetchFn);
  if (!output.behaviorIntent) throw new Error("Manager behavior intent response was empty.");
  return { ...output, behaviorIntent: output.behaviorIntent };
}

export async function requestManagerLineViaApi(input: ManagerLlmRequest, fetchFn: typeof fetch = fetch) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "managerLine" }, fetchFn);
  if (!output.managerLine) throw new Error("Manager line response was empty.");
  return { ...output, managerLine: output.managerLine };
}

export async function requestManagerQuestSuggestionViaApi(input: ManagerLlmRequest, fetchFn: typeof fetch = fetch) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "questSuggestion" }, fetchFn);
  if (!output.questSuggestion) throw new Error("Manager quest suggestion response was empty.");
  return { ...output, questSuggestion: output.questSuggestion };
}

export async function requestManagerDifficultyEvaluationViaApi(input: ManagerLlmRequest, fetchFn: typeof fetch = fetch) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "difficultyEvaluation" }, fetchFn);
  if (!output.difficultyEvaluation) throw new Error("Manager difficulty evaluation response was empty.");
  return { ...output, difficultyEvaluation: output.difficultyEvaluation };
}

export async function requestManagerStatEvaluationViaApi(input: ManagerLlmRequest, fetchFn: typeof fetch = fetch) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "statEvaluation" }, fetchFn);
  if (!output.statEvaluation) throw new Error("Manager stat evaluation response was empty.");
  return { ...output, statEvaluation: output.statEvaluation };
}

export async function requestManagerGoalPlanViaApi(
  input: ManagerLlmRequest,
  fetchFn: typeof fetch = fetch,
  options?: ManagerLlmClientOptions,
) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "goalPlan" }, fetchFn, options);
  if (!output.goalPlan) throw new Error("Manager goal plan response was empty.");
  return { ...output, goalPlan: output.goalPlan };
}

export async function requestManagerPlanRebalanceViaApi(
  input: ManagerLlmRequest,
  fetchFn: typeof fetch = fetch,
  options?: ManagerLlmClientOptions,
) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "planRebalance" }, fetchFn, options);
  if (!output.planRebalance) throw new Error("Manager plan rebalance response was empty.");
  return { ...output, planRebalance: output.planRebalance };
}

export async function requestManagerQuestAcceptancePreviewViaApi(
  input: ManagerLlmRequest,
  fetchFn: typeof fetch = fetch,
  options?: ManagerLlmClientOptions,
) {
  const output = await requestManagerLlmOutputViaApi({ ...input, outputKind: "questAcceptancePreview" }, fetchFn, options);
  if (!output.questAcceptancePreview) throw new Error("Manager quest acceptance preview response was empty.");
  return { ...output, questAcceptancePreview: output.questAcceptancePreview };
}

export async function requestManagerLlmOutputViaApi(
  input: ManagerLlmRequest,
  fetchFn: typeof fetch = fetch,
  options: ManagerLlmClientOptions = {},
): Promise<ManagerLlmOutput> {
  const nowMs = options.nowMs ?? Date.now();
  const throttleMs = options.throttleMs ?? defaultClientThrottleMs;
  const previous = lastOutputByKind[input.outputKind];
  if (previous && nowMs >= previous.requestedAtMs && nowMs - previous.requestedAtMs < throttleMs) {
    return {
      ...previous.output,
      source: "rule_fallback",
      fallbackReason: "CLIENT_THROTTLED",
    };
  }

  const response = await fetchFn(routeByKind[input.outputKind], {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await response.json()) as ManagerLlmApiResponse;

  if (!response.ok || !payload.ok) {
    throw new Error(payload.ok ? "Manager LLM request failed." : payload.error.message);
  }

  lastOutputByKind[input.outputKind] = { requestedAtMs: nowMs, output: payload.data };
  return payload.data;
}
