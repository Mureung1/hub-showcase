import { describe, expect, it } from "vitest";
import { resolveManagerWindowInteraction, shouldShowManagerWindowInteraction } from "./managerRuntimePriority";

describe("manager runtime priority", () => {
  it("prioritizes Pixel TV watching over outside transition interactions", () => {
    expect(
      resolveManagerWindowInteraction({
        showPixelTvWatching: true,
        showQuestHangingPet: true,
        showRecoveryHidingPet: true,
      }),
    ).toBe("pixel_tv_watching");
  });

  it("falls back to quest and recovery window interactions when Pixel TV is not active", () => {
    expect(resolveManagerWindowInteraction({ showPixelTvWatching: false, showQuestHangingPet: true, showRecoveryHidingPet: true })).toBe("quest_hanging");
    expect(resolveManagerWindowInteraction({ showPixelTvWatching: false, showQuestHangingPet: false, showRecoveryHidingPet: true })).toBe("recovery_hiding");
  });

  it("excludes window interactions whose animation is missing for the current pet stage", () => {
    expect(
      resolveManagerWindowInteraction({
        showPixelTvWatching: false,
        showQuestHangingPet: true,
        showRecoveryHidingPet: true,
        supportsQuestHangingPet: false,
        supportsRecoveryHidingPet: true,
      }),
    ).toBe("recovery_hiding");
    expect(
      resolveManagerWindowInteraction({
        showPixelTvWatching: false,
        showQuestHangingPet: true,
        showRecoveryHidingPet: true,
        supportsQuestHangingPet: false,
        supportsRecoveryHidingPet: false,
      }),
    ).toBe("none");
  });

  it("uses probability instead of requiring two consecutive outcomes for window interactions", () => {
    expect(shouldShowManagerWindowInteraction({ visible: true, randomValue: 0.12, streakMatches: false, streakCount: 0 })).toBe(true);
    expect(shouldShowManagerWindowInteraction({ visible: true, randomValue: 0.5, streakMatches: true, streakCount: 3 })).toBe(false);
    expect(shouldShowManagerWindowInteraction({ visible: true, randomValue: 0.3, streakMatches: true, streakCount: 3 })).toBe(true);
    expect(shouldShowManagerWindowInteraction({ visible: false, randomValue: 0.01, streakMatches: true, streakCount: 3 })).toBe(false);
  });
});
