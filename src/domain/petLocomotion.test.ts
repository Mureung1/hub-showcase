import { describe, expect, it } from "vitest";
import { canJumpToPlatform, resolveMotionCommand, resolvePetLayer } from "./petLocomotion";

describe("pet locomotion", () => {
  it("allows a jump when the pet is close to a platform", () => {
    expect(
      canJumpToPlatform(
        { x: 10, y: 90, width: 32, height: 32 },
        { x: 20, y: 120, width: 120, height: 20 },
      ),
    ).toBe(true);
  });

  it("moves the pet to desktop overlay when it reaches a window escape edge", () => {
    expect(
      resolvePetLayer(
        { x: 96, y: 40, width: 32, height: 32 },
        { x: 100, y: 0, width: 8, height: 120 },
      ),
    ).toBe("desktop-overlay");
  });

  it("uses a pose transition instead of climb or jump when reduced motion is enabled", () => {
    expect(resolveMotionCommand("jump", true)).toBe("pose");
  });
});
