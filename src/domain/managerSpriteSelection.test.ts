import { describe, expect, it } from "vitest";
import { applyManagerSpriteSelection } from "./managerSpriteSelection";

describe("manager sprite selection", () => {
  it("changes the selected pet sprite while preserving manager progress and runtime preferences", () => {
    const currentManager = {
      name: "Lumi",
      petId: "pink-manager",
      level: 7,
      exp: 42,
      mood: "happy",
      line: "Great log today.",
      behaviorStyle: "adventurous",
      unlockedStages: ["stage-1", "stage-2", "stage-3"],
      selectedStage: "stage-2",
      soundEnabled: true,
    } as const;

    expect(applyManagerSpriteSelection(currentManager, "glass-frog")).toEqual({
      ...currentManager,
      petId: "glass-frog",
    });
  });

  it("moves the selected appearance stage when the new pet has no asset for the current stage", () => {
    const currentManager = {
      name: "Lumi",
      petId: "pink-manager",
      level: 1,
      exp: 30,
      mood: "waiting",
      line: "demo",
      behaviorStyle: "balanced",
      unlockedStages: ["stage-1"],
      selectedStage: null,
      soundEnabled: false,
    } as const;

    expect(applyManagerSpriteSelection(currentManager, "glass-frog")).toEqual({
      ...currentManager,
      petId: "glass-frog",
      unlockedStages: ["stage-1", "stage-2"],
      selectedStage: "stage-2",
    });
  });
});
