import { describe, expect, it } from "vitest";
import { resolveManagerWindowInteraction } from "./managerRuntimePriority";

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
});
