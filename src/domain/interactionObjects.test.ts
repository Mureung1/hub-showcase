import { describe, expect, it } from "vitest";
import { getClimbPosition, resizeInteractionObject, type InteractionObject } from "./interactionObjects";

const ladder: InteractionObject = {
  id: "ladder-1",
  type: "ladder",
  resizeAxis: "vertical",
  rect: { x: 10, y: 20, width: 40, height: 100 },
};

const platform: InteractionObject = {
  id: "platform-1",
  type: "platform",
  resizeAxis: "horizontal",
  rect: { x: 10, y: 120, width: 120, height: 24 },
};

describe("interaction objects", () => {
  it("ignores width changes when resizing a ladder", () => {
    const result = resizeInteractionObject(ladder, { x: 10, y: 20, width: 80, height: 160 });

    expect(result.rect).toEqual({ x: 10, y: 20, width: 40, height: 160 });
  });

  it("ignores height changes when resizing a platform", () => {
    const result = resizeInteractionObject(platform, { x: 10, y: 120, width: 180, height: 80 });

    expect(result.rect).toEqual({ x: 10, y: 120, width: 180, height: 24 });
  });

  it("preserves climb progress ratio after ladder height changes", () => {
    expect(getClimbPosition({ x: 10, y: 20, width: 40, height: 200 }, 0.5)).toEqual({ x: 30, y: 120 });
  });
});
