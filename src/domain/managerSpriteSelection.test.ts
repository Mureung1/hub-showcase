import { describe, expect, it } from "vitest";
import { applyManagerSpriteSelection } from "./managerSpriteSelection";

describe("manager sprite selection", () => {
  it("changes only the selected pet sprite while preserving manager progress and runtime preferences", () => {
    const currentManager = {
      name: "루미",
      petId: "pink-manager",
      level: 7,
      exp: 42,
      mood: "happy",
      line: "오늘 기록이 꽤 좋아.",
      behaviorStyle: "adventurous",
      unlockedStages: ["stage-1", "stage-2", "stage-3"],
      selectedStage: "stage-3",
      soundEnabled: true,
    } as const;

    expect(applyManagerSpriteSelection(currentManager, "glass-frog")).toEqual({
      ...currentManager,
      petId: "glass-frog",
    });
  });
});
