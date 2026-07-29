import type { WindowId } from "../data/windowRegistry";
import type { Difficulty, Quest, QuestType } from "./questLogic";

export type QuestStatus = "draft" | "active" | "success" | "failed" | "recovery";

export type QuestCompletionResult = "success" | "recovery";

export function getQuestWorkflowWindows(status: QuestStatus): WindowId[] | null {
  if (status === "active") return ["runner", "manager"];
  if (status === "failed") return ["failure", "manager"];
  if (status === "recovery") return ["recovery", "manager"];
  if (status === "success") return ["manager"];
  return null;
}

export function getQuestCompletionResult(status: QuestStatus): QuestCompletionResult {
  return status === "recovery" ? "recovery" : "success";
}

export function getQuestUnit(type: QuestType) {
  if (type === "time") return "분";
  if (type === "quantity") return "개";
  return "회";
}

export function calculateQuestReward(difficulty: Difficulty, amount: number, type: QuestType) {
  const base = difficulty === "easy" ? 6 : difficulty === "hard" ? 28 : 16;
  const amountBonus = type === "time" ? Math.floor(amount / 10) * 4 : Math.floor(amount / 5) * 3;
  return Math.max(5, Math.min(60, base + amountBonus));
}

export function applyQuestPatch(current: Quest, patch: Partial<Quest>): Quest {
  const nextType = patch.type ?? current.type;
  const nextAmount = patch.amount ?? current.amount;
  const nextDifficulty = patch.difficulty ?? current.difficulty;
  const nextUnit = patch.type && patch.type !== current.type ? getQuestUnit(patch.type) : patch.unit ?? current.unit;

  return {
    ...current,
    ...patch,
    type: nextType,
    amount: nextAmount,
    difficulty: nextDifficulty,
    unit: nextUnit,
    rewardExp: calculateQuestReward(nextDifficulty, nextAmount, nextType),
  };
}

export function applyDifficultyEvaluationToQuest(
  current: Quest,
  evaluation: { difficulty: Difficulty; rewardExp: number; reason?: string },
): Quest {
  return {
    ...current,
    difficulty: evaluation.difficulty,
    rewardExp: evaluation.rewardExp,
  };
}
