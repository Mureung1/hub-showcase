export type QuestType = "time" | "quantity" | "action";
export type Difficulty = "easy" | "normal" | "hard";

export interface Quest {
  title: string;
  type: QuestType;
  amount: number;
  unit: string;
  difficulty: Difficulty;
  deadline: string;
  rewardExp: number;
}

export function createRecoveryQuest(previousQuest: Quest): Quest {
  const reducedAmount = Math.floor(previousQuest.amount / 3);
  const recoveryAmount = Number.isFinite(reducedAmount) ? Math.max(5, reducedAmount) : 5;
  return {
    ...previousQuest,
    title: previousQuest.title
      .replace(`${previousQuest.amount}${previousQuest.unit}`, `${recoveryAmount}${previousQuest.unit}`)
      .replace("핵심 정리", "핵심 개념 읽기"),
    amount: recoveryAmount,
    difficulty: "easy",
    rewardExp: 5,
  };
}
