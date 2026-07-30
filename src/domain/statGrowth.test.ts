import { describe, expect, it } from "vitest";
import {
  applyManagerStatDeltas,
  createInitialManagerStats,
  createRuleFallbackStatEvaluation,
  getQuestStatDeltas,
  normalizeManagerStatEvaluation,
  statBudgetByDifficulty,
} from "./statGrowth";

describe("stat growth", () => {
  it("allocates the easy stat budget across time quest stats", () => {
    expect(getQuestStatDeltas("time", "quest_completed", "easy")).toEqual([
      { stat: "diligence", amount: 2 },
      { stat: "stamina", amount: 1 },
    ]);
  });

  it("allocates the normal stat budget across quantity quest stats", () => {
    expect(getQuestStatDeltas("quantity", "quest_completed", "normal")).toEqual([
      { stat: "persistence", amount: 5 },
      { stat: "knowledge", amount: 2 },
    ]);
  });

  it("allocates the hard stat budget across action quest stats", () => {
    expect(getQuestStatDeltas("action", "quest_completed", "hard")).toEqual([
      { stat: "strength", amount: 12 },
      { stat: "agility", amount: 3 },
    ]);
  });

  it("reevaluates recovery by its adjusted difficulty budget", () => {
    expect(getQuestStatDeltas("recovery", "recovery_completed", "easy")).toEqual([
      { stat: "persistence", amount: 2 },
      { stat: "diligence", amount: 1 },
    ]);
  });

  it("does not increase stats for failed events", () => {
    expect(getQuestStatDeltas("time", "quest_failed", "hard")).toEqual([]);
  });

  it("creates all manager stats at zero", () => {
    expect(createInitialManagerStats()).toEqual({
      diligence: 0,
      persistence: 0,
      creativity: 0,
      knowledge: 0,
      strength: 0,
      agility: 0,
      stamina: 0,
      charm: 0,
    });
  });

  it("accumulates LLM or fallback stat deltas onto manager stats", () => {
    expect(
      applyManagerStatDeltas(
        { ...createInitialManagerStats(), diligence: 2 },
        [
          { stat: "diligence", amount: 3 },
          { stat: "charm", amount: 1 },
        ],
      ),
    ).toMatchObject({
      diligence: 5,
      charm: 1,
    });
  });

  it("accepts a valid LLM-style stat allocation when the total matches the difficulty budget", () => {
    const fallback = createRuleFallbackStatEvaluation({ questType: "action", eventType: "quest_completed", difficulty: "hard" });

    expect(
      normalizeManagerStatEvaluation(
        {
          difficulty: "hard",
          statBudget: statBudgetByDifficulty.hard,
          primaryStats: ["stamina"],
          statDeltas: [
            { stat: "stamina", amount: 12 },
            { stat: "strength", amount: 2 },
            { stat: "persistence", amount: 1 },
          ],
          reason: "운동 퀘스트라 체력 중심으로 분배한다.",
        },
        fallback,
      ).statDeltas,
    ).toEqual([
      { stat: "stamina", amount: 12 },
      { stat: "strength", amount: 2 },
      { stat: "persistence", amount: 1 },
    ]);
  });

  it("falls back when an LLM-style allocation breaks the difficulty budget", () => {
    const fallback = createRuleFallbackStatEvaluation({ questType: "time", eventType: "quest_completed", difficulty: "normal" });

    expect(
      normalizeManagerStatEvaluation(
        {
          difficulty: "normal",
          statBudget: statBudgetByDifficulty.normal,
          primaryStats: ["knowledge"],
          statDeltas: [{ stat: "knowledge", amount: 99 }],
          reason: "과도한 배점",
        },
        fallback,
      ),
    ).toEqual(fallback);
  });
});
