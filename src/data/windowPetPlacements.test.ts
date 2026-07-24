import { describe, expect, it } from "vitest";
import { resolveWindowPetPosition, type WindowPetPlacementDraft } from "./windowPetPlacements";

describe("window pet placements", () => {
  it("uses the same anchor math for review and runtime placement", () => {
    const placement: WindowPetPlacementDraft = {
      offsetX: 0,
      offsetY: -309,
      scale: 1,
      edge: "bottom",
      mirrorX: false,
      layer: "behind-window",
    };

    const result = resolveWindowPetPosition({
      placement,
      windowPosition: { x: 190, y: 118 },
      windowSize: { width: 360, height: 367.5 },
      frameWidth: 64,
      anchor: { x: 32, y: 5 },
      baseSpriteSize: 96,
    });

    expect(result.left).toBe(322);
    expect(result.top).toBe(169);
    expect(result.size).toBe(96);
    expect(result.layer).toBe("behind-window");
  });
});
