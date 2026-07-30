import { type ManagerBehaviorIntent } from "../../src/domain/managerBehaviorIntent.js";
import { createRuleFallbackStatEvaluation } from "../../src/domain/statGrowth.js";
import type {
  ManagerGoalPlan,
  ManagerLlmOutputFallback,
  ManagerLlmQuestInput,
  ManagerLlmRequest,
  ManagerPlanRebalance,
  ManagerQuestAcceptancePreview,
} from "../contracts/managerLlm.js";

export function createManagerLlmFallback(request: ManagerLlmRequest): ManagerLlmOutputFallback {
  const managerLine = createFallbackManagerLine(request);
  const questSuggestion = request.questState.currentQuest ?? {
    ...createFallbackQuestSuggestion(request),
    title: createFallbackQuestTitle(request),
  };
  const difficultyEvaluation = createFallbackDifficultyEvaluation(request);
  const statEvaluation = createRuleFallbackStatEvaluation({
    questType: getFallbackGrowthQuestType(request),
    eventType: getFallbackGrowthEventType(request),
    difficulty: request.questState.currentQuest?.difficulty ?? difficultyEvaluation.difficulty,
  });
  const goalPlan = createFallbackGoalPlan(request);

  return {
    managerLine,
    difficultyEvaluation,
    behaviorIntent: createFallbackBehaviorIntent(request, managerLine),
    statEvaluation,
    questSuggestion,
    goalPlan,
    planRebalance: createFallbackPlanRebalance(goalPlan, request),
    questAcceptancePreview: createFallbackQuestAcceptancePreview(difficultyEvaluation, statEvaluation),
  };
}

function createFallbackDifficultyEvaluation(request: ManagerLlmRequest) {
  const quest = request.questState.currentQuest ?? createFallbackQuestSuggestion(request);
  const difficulty = quest.amount <= 10 ? "easy" : quest.amount >= 45 ? "hard" : quest.difficulty;
  return {
    difficulty,
    rewardExp: calculateFallbackRewardExp(difficulty, quest.amount, quest.type),
    reason: "rule_fallback difficulty evaluation",
  };
}

function calculateFallbackRewardExp(difficulty: "easy" | "normal" | "hard", amount: number, type: "time" | "quantity" | "action") {
  const base = difficulty === "easy" ? 6 : difficulty === "hard" ? 28 : 16;
  const amountBonus = type === "time" ? Math.floor(amount / 10) * 4 : Math.floor(amount / 5) * 3;
  return Math.max(5, Math.min(60, base + amountBonus));
}

function createFallbackManagerLine(request: ManagerLlmRequest): string {
  if (request.managerContext.lastQuestResult === "failed") return "이번 기록을 보고 다음 분량을 더 작게 맞춰볼게.";
  if (request.managerContext.lastQuestResult === "recovery") return "복구까지 이어간 기록을 기억해둘게.";
  if (request.managerContext.lastQuestResult === "success") return "완료 기록을 반영했어. 다음 퀘스트도 지금 페이스에 맞춰볼게.";
  if (request.questState.status === "active") return "끝까지 기다릴게. 지금 정한 만큼만 차근차근 가보자.";
  if (request.questState.status === "failed") return "괜찮아. 실패 이유를 보고 다시 시작할 수 있게 줄여볼게.";
  return "오늘 할 수 있는 작은 분량부터 같이 골라보자.";
}

function createFallbackBehaviorIntent(request: ManagerLlmRequest, line: string): ManagerBehaviorIntent {
  const recentFailed = request.managerContext.lastQuestResult === "failed" || request.questState.status === "failed";
  const recentSuccess = request.managerContext.lastQuestResult === "success" || request.questState.status === "success";

  if (recentFailed) {
    return {
      behaviorStyle: request.persona.behaviorStyle === "adventurous" ? "balanced" : request.persona.behaviorStyle,
      tone: request.persona.tone,
      line,
      suggestedBehaviorBias: [
        { state: "hide_behind_window", weightDelta: 2, reason: "recent_failure" },
        { state: "rest", weightDelta: 1, reason: "recent_failure" },
      ],
    };
  }

  if (recentSuccess) {
    return {
      behaviorStyle: request.persona.behaviorStyle,
      tone: request.persona.tone,
      line,
      suggestedBehaviorBias: [
        { state: "jump_to_platform", weightDelta: 2, reason: "recent_success" },
        { state: "approach_ladder", weightDelta: 1, reason: "recent_success" },
      ],
    };
  }

  return {
    behaviorStyle: request.persona.behaviorStyle,
    tone: request.persona.tone,
    line,
    suggestedBehaviorBias: [],
  };
}

function createFallbackQuestSuggestion(request: ManagerLlmRequest): ManagerLlmQuestInput {
  const currentQuest = request.questState.currentQuest;
  if (currentQuest) return currentQuest;

  const amount = request.profile.questSize === "tiny"
    ? Math.max(5, Math.round(request.profile.dailyMinutes / 3))
    : request.profile.questSize === "challenge"
      ? Math.max(30, request.profile.dailyMinutes)
      : Math.max(15, Math.round(request.profile.dailyMinutes / 2));
  const difficulty = request.profile.questSize === "tiny" ? "easy" : request.profile.questSize === "challenge" ? "hard" : "normal";
  const rewardExp = difficulty === "easy" ? 8 : difficulty === "hard" ? 28 : 16;

  return {
    title: `${request.profile.goal} 핵심 정리 ${amount}분`,
    type: "time",
    amount,
    unit: "분",
    difficulty,
    deadline: "오늘 23:59",
    rewardExp,
  };
}

function getFallbackGrowthQuestType(request: ManagerLlmRequest) {
  if (request.questState.status === "recovery") return "recovery";
  return request.questState.currentQuest?.type ?? "time";
}

function createFallbackQuestTitle(request: ManagerLlmRequest): string {
  if (request.profile.category === "study") return "개념 3개 카드 정리";
  if (request.profile.category === "exercise") return "가벼운 루틴 한 번 실행";
  if (request.profile.category === "hobby") return "작은 샘플 하나 만들기";
  if (request.profile.category === "career") return "결과 문장 1개 다듬기";
  return "루틴 첫 단계 실행";
}

function getFallbackGrowthEventType(request: ManagerLlmRequest) {
  if (request.questState.status === "failed") return "quest_failed";
  if (request.questState.status === "recovery") return "recovery_completed";
  return "quest_completed";
}

function createFallbackGoalPlan(request: ManagerLlmRequest): ManagerGoalPlan {
  const dailySeed = request.questState.currentQuest
    ? { ...request.questState.currentQuest, linkedMilestoneId: "m1" }
    : { ...createFallbackQuestSuggestion(request), title: createFallbackQuestTitle(request), linkedMilestoneId: "m1" };
  const goalSummary = request.profile.goal.slice(0, 120);

  return {
    goalSummary,
    horizon: "month",
    milestones: [
      {
        id: "m1",
        title: createFallbackMilestoneTitle(request),
        targetWeek: 1,
        successCriteria: ["Complete three small quests", "Review one result"],
      },
      {
        id: "m2",
        title: "Build a repeatable weekly rhythm",
        targetWeek: 4,
        successCriteria: ["Finish at least eight daily quests"],
      },
    ],
    monthlyPlan: [{ monthIndex: 1, focus: goalSummary, milestoneIds: ["m1", "m2"] }],
    weeklyPlan: [
      { weekIndex: 1, focus: "Start with a small baseline", targetOutcome: "Complete three easy attempts", suggestedQuestThemes: [dailySeed.title] },
      { weekIndex: 2, focus: "Repeat the strongest routine", targetOutcome: "Complete four normal attempts", suggestedQuestThemes: ["Review recent success"] },
      { weekIndex: 3, focus: "Increase one variable", targetOutcome: "Try one harder quest", suggestedQuestThemes: ["Small challenge"] },
      { weekIndex: 4, focus: "Consolidate and review", targetOutcome: "Summarize what worked", suggestedQuestThemes: ["Monthly review"] },
    ],
    dailySeeds: [dailySeed],
    risks: ["time shortage", "too much difficulty too early"],
    rebalancingPolicy: {
      onSuccess: "Keep the next quest similar and increase only one small variable.",
      onFailureTimeShortage: "Cut the amount by about half and keep the same milestone.",
      onFailureTooHard: "Lower the difficulty and switch to a simpler action.",
      onSkippedDays: "Restart with an easy daily seed.",
    },
  };
}

function createFallbackMilestoneTitle(request: ManagerLlmRequest): string {
  if (request.profile.category === "exercise") return "Build a safe baseline routine";
  if (request.profile.category === "study") return "Finish the first concept loop";
  if (request.profile.category === "career") return "Create the first visible result";
  if (request.profile.category === "hobby") return "Make the first small sample";
  return "Complete the first repeatable routine";
}

function createFallbackPlanRebalance(goalPlan: ManagerGoalPlan, request: ManagerLlmRequest): ManagerPlanRebalance {
  const failed = request.managerContext.lastQuestResult === "failed" || request.questState.status === "failed";
  const nextQuest = goalPlan.dailySeeds[0] ?? { ...createFallbackQuestSuggestion(request), title: createFallbackQuestTitle(request), linkedMilestoneId: "m1" };
  return {
    rebalancedPlan: goalPlan,
    changes: [
      {
        scope: "daily",
        reason: failed ? "failure_time_shortage" : "success_streak",
        before: request.questState.currentQuest?.title ?? request.profile.goal,
        after: nextQuest.title,
      },
    ],
    nextQuest: {
      ...nextQuest,
      recoveryReason: failed
        ? "Recent failure detected; restart with a smaller next quest."
        : "Continue the plan with the next concrete quest.",
    },
  };
}

function createFallbackQuestAcceptancePreview(
  difficultyEvaluation: ReturnType<typeof createFallbackDifficultyEvaluation>,
  statEvaluation: ReturnType<typeof createRuleFallbackStatEvaluation>,
): ManagerQuestAcceptancePreview {
  return {
    difficulty: difficultyEvaluation.difficulty,
    rewardExp: difficultyEvaluation.rewardExp,
    statEvaluation,
    reason: "rule_fallback quest acceptance preview",
  };
}
