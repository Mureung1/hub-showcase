import { describe, expect, it } from "vitest";
import { getManagerExpProgressPercent, managerExpPerLevel, applyManagerExpGain } from "./managerProgression";
import { createInitialManagerStats } from "./statGrowth";
import type { ManagerState } from "./appState";

const manager: ManagerState = {
  name: "Lumi",
  petId: "pink-manager",
  level: 1,
  exp: 0,
  stats: createInitialManagerStats(),
  mood: "waiting",
  line: "ready",
  behaviorStyle: "balanced",
  unlockedStages: ["stage-1"],
  selectedStage: null,
  soundEnabled: false,
};

describe("manager progression", () => {
  it("uses 30 EXP per level", () => {
    expect(managerExpPerLevel).toBe(30);
  });

  it("levels from 1 to 2 at 30 EXP", () => {
    expect(applyManagerExpGain(manager, 30, "level up")).toMatchObject({
      level: 2,
      exp: 0,
      line: "level up",
      mood: "happy",
    });
  });

  it("keeps remainder EXP after multi-level gains", () => {
    expect(applyManagerExpGain({ ...manager, level: 2, exp: 25 }, 40, "gain")).toMatchObject({
      level: 4,
      exp: 5,
    });
  });

  it("formats progress against the 30 EXP cap", () => {
    expect(getManagerExpProgressPercent(15)).toBe(50);
  });
});
