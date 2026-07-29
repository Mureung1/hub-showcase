import { type ManagerBehaviorIntent } from "../../src/domain/managerBehaviorIntent";
import { createRuleFallbackStatEvaluation } from "../../src/domain/statGrowth";
import type {
  ManagerLlmOutputFallback,
  ManagerLlmQuestInput,
  ManagerLlmRequest,
} from "../contracts/managerLlm";

export function createManagerLlmFallback(request: ManagerLlmRequest): ManagerLlmOutputFallback {
  const managerLine = createFallbackManagerLine(request);

  return {
    managerLine,
    difficultyEvaluation: createFallbackDifficultyEvaluation(request),
    behaviorIntent: createFallbackBehaviorIntent(request, managerLine),
    statEvaluation: createRuleFallbackStatEvaluation({
      questType: getFallbackGrowthQuestType(request),
      eventType: getFallbackGrowthEventType(request),
      difficulty: request.questState.currentQuest?.difficulty ?? "normal",
    }),
    questSuggestion: createFallbackQuestSuggestion(request),
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

function getFallbackGrowthEventType(request: ManagerLlmRequest) {
  if (request.questState.status === "failed") return "quest_failed";
  if (request.questState.status === "recovery") return "recovery_completed";
  return "quest_completed";
}
