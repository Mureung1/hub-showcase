import { describe, expect, it } from "vitest";
import { canPixelizeSource, createPixelizerPlan, getPixelizerPreviewSize } from "./pixelizer";

describe("pixelizer", () => {
  it("downscales by the configured scale and disables smoothing", () => {
    expect(createPixelizerPlan(640, 480, { scale: 8 })).toEqual({
      sourceWidth: 640,
      sourceHeight: 480,
      sampleWidth: 80,
      sampleHeight: 60,
      smoothing: false,
    });
  });

  it("clamps scale to at least 1", () => {
    expect(createPixelizerPlan(64, 32, { scale: 0 }).sampleWidth).toBe(64);
  });

  it("fits the preview inside a fixed TV frame without changing aspect ratio", () => {
    const plan = createPixelizerPlan(640, 480, { scale: 8 });

    expect(getPixelizerPreviewSize(plan, { width: 320, height: 180 })).toEqual({
      width: 240,
      height: 180,
    });
  });

  it("rejects webcam frames before the browser reports drawable dimensions", () => {
    expect(canPixelizeSource(0, 480)).toBe(false);
    expect(canPixelizeSource(640, 480)).toBe(true);
  });
});
