import { describe, expect, it } from "vitest";
import { recommendSpriteAnchorFromFrameBoxes, type SpriteFrameBox } from "./spriteSheetMetrics";

const boxes: SpriteFrameBox[] = [
  { minX: 14, minY: 16, maxX: 50, maxY: 58 },
  { minX: 12, minY: 15, maxX: 48, maxY: 57 },
  { minX: 16, minY: 17, maxX: 51, maxY: 58 },
];

describe("sprite sheet metrics", () => {
  it("recommends a float anchor from the average visual center and baseline", () => {
    expect(recommendSpriteAnchorFromFrameBoxes(boxes, 64, 64, "float")).toMatchObject({
      recommendedAnchor: { type: "float", x: 32, y: 58 },
      protrusion: { left: 12, right: 12 },
    });
  });

  it("recommends a top grip anchor from the average visual center and top edge", () => {
    expect(recommendSpriteAnchorFromFrameBoxes(boxes, 64, 64, "top-grip").recommendedAnchor).toEqual({
      type: "top-grip",
      x: 32,
      y: 16,
    });
  });

  it("recommends the closer peek edge and reports asymmetric protrusion", () => {
    const peekBoxes: SpriteFrameBox[] = [
      { minX: 4, minY: 18, maxX: 24, maxY: 58 },
      { minX: 4, minY: 16, maxX: 26, maxY: 58 },
    ];

    expect(recommendSpriteAnchorFromFrameBoxes(peekBoxes, 64, 64, "peek-edge")).toMatchObject({
      recommendedAnchor: { type: "peek-edge", x: 4, y: 38 },
      protrusion: { left: 4, right: 37 },
      peekSide: "left",
    });
  });
});
