import { describe, expect, it } from "vitest";
import { getQuestStatDeltas } from "./statGrowth";

describe("stat growth", () => {
  it("increases diligence and stamina for completed time quests", () => {
    expect(getQuestStatDeltas("time", "quest_completed")).toEqual([
      { stat: "diligence", amount: 1 },
      { stat: "stamina", amount: 1 },
    ]);
  });

  it("increases persistence and knowledge for completed quantity quests", () => {
    expect(getQuestStatDeltas("quantity", "quest_completed")).toEqual([
      { stat: "persistence", amount: 1 },
      { stat: "knowledge", amount: 1 },
    ]);
  });

  it("increases strength and agility for completed action quests", () => {
    expect(getQuestStatDeltas("action", "quest_completed")).toEqual([
      { stat: "strength", amount: 1 },
      { stat: "agility", amount: 1 },
    ]);
  });

  it("increases persistence for recovery completion", () => {
    expect(getQuestStatDeltas("recovery", "recovery_completed")).toEqual([{ stat: "persistence", amount: 2 }]);
  });

  it("does not increase stats for failed events", () => {
    expect(getQuestStatDeltas("time", "quest_failed")).toEqual([]);
  });
});
