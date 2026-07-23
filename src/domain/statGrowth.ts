export type StatKey =
  | "diligence"
  | "persistence"
  | "creativity"
  | "knowledge"
  | "strength"
  | "agility"
  | "stamina"
  | "charm";

export interface StatDelta {
  stat: StatKey;
  amount: number;
}

export type GrowthQuestType = "time" | "quantity" | "action" | "recovery";
export type GrowthEventType = "quest_completed" | "quest_failed" | "recovery_completed";

export function getQuestStatDeltas(questType: GrowthQuestType, eventType: GrowthEventType): StatDelta[] {
  if (eventType === "quest_failed") return [];
  if (eventType === "recovery_completed") return [{ stat: "persistence", amount: 2 }];

  if (questType === "time") {
    return [
      { stat: "diligence", amount: 1 },
      { stat: "stamina", amount: 1 },
    ];
  }

  if (questType === "quantity") {
    return [
      { stat: "persistence", amount: 1 },
      { stat: "knowledge", amount: 1 },
    ];
  }

  if (questType === "action") {
    return [
      { stat: "strength", amount: 1 },
      { stat: "agility", amount: 1 },
    ];
  }

  return [];
}
