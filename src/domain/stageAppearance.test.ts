import { describe, expect, it } from "vitest";
import { createAppearanceState, selectAppearanceStage } from "./stageAppearance";

describe("stage appearance", () => {
  it("starts with stage-1 selected at level 1", () => {
    expect(createAppearanceState(1)).toEqual({
      level: 1,
      unlockedStages: ["stage-1"],
      selectedStage: "stage-1",
    });
  });

  it("allows returning to an unlocked earlier stage", () => {
    const state = createAppearanceState(6);

    expect(selectAppearanceStage(state, "stage-1").selectedStage).toBe("stage-1");
  });

  it("keeps the previous selected stage when target stage is locked", () => {
    const state = createAppearanceState(3);

    expect(selectAppearanceStage(state, "stage-4").selectedStage).toBe("stage-2");
  });
});
