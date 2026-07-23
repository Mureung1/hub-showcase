import { describe, expect, it } from "vitest";
import { createPixelizerPlan } from "./pixelizer";

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
});
