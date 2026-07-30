import { describe, expect, it } from "vitest";
import {
  canPixelizeSource,
  createPixelTvPhotoFileName,
  createPixelTvPhotoCapturePlan,
  createPixelizerPlan,
  createPixelizerPlanForStream,
  getPixelizerCoverSize,
  getPixelizerPreviewSize,
  resolvePixelTvStreamSettings,
  transformPixelTvSamplePixels,
} from "./pixelizer";

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

  it("covers the fixed TV frame when the stream should hide the screen background", () => {
    const plan = createPixelizerPlan(640, 480, { scale: 8 });

    expect(getPixelizerCoverSize(plan, { width: 320, height: 180 })).toEqual({
      width: 320,
      height: 240,
    });
  });

  it("rejects webcam frames before the browser reports drawable dimensions", () => {
    expect(canPixelizeSource(0, 480)).toBe(false);
    expect(canPixelizeSource(640, 480)).toBe(true);
  });

  it("uses a fixed 144x108-class stream sample for rough webcam pixelization", () => {
    expect(resolvePixelTvStreamSettings(640, 480)).toEqual({
      sampleWidth: 144,
      sampleHeight: 108,
      targetFps: 24,
      smoothing: false,
    });
  });

  it("keeps widescreen webcam streams inside the fixed sample budget", () => {
    expect(resolvePixelTvStreamSettings(1280, 720)).toEqual({
      sampleWidth: 144,
      sampleHeight: 81,
      targetFps: 24,
      smoothing: false,
    });
  });

  it("creates a stream plan from fixed sample settings instead of a user scale", () => {
    const settings = resolvePixelTvStreamSettings(640, 480);

    expect(createPixelizerPlanForStream(640, 480, settings)).toEqual({
      sourceWidth: 640,
      sourceHeight: 480,
      sampleWidth: 144,
      sampleHeight: 108,
      smoothing: false,
    });
  });

  it("creates a stable local photo download file name", () => {
    expect(createPixelTvPhotoFileName(new Date(2026, 6, 29, 10, 11, 12))).toBe("pixel-tv-photo-20260729-101112.png");
  });

  it("adds a subtle warm tint to the low-res sample while preserving alpha", () => {
    const pixels = new Uint8ClampedArray([120, 90, 40, 255]);

    expect(Array.from(transformPixelTvSamplePixels(pixels, 1, 1))).toEqual([97, 93, 88, 255]);
  });

  it("darkens strong edges in the low-res sample", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255,
      255, 255, 255, 255, 0, 0, 0, 255,
    ]);

    expect(Array.from(transformPixelTvSamplePixels(pixels, 2, 2).slice(4, 8))).toEqual([0, 0, 0, 255]);
  });

  it("pushes bright edge pixels down enough to read as outlined", () => {
    const pixels = new Uint8ClampedArray([
      255, 255, 255, 255, 0, 0, 0, 255,
      255, 255, 255, 255, 0, 0, 0, 255,
    ]);

    expect(Array.from(transformPixelTvSamplePixels(pixels, 2, 2).slice(0, 4))).toEqual([164, 158, 150, 255]);
  });

  it("places the TV screen and manager sprite together in one photo composition", () => {
    expect(createPixelTvPhotoCapturePlan()).toEqual({
      width: 640,
      height: 360,
      tvFrame: { x: 44, y: 70, width: 364, height: 232 },
      tvScreen: { x: 70, y: 94, width: 312, height: 176 },
      managerSprite: { x: 418, y: 118, width: 160, height: 160 },
      caption: { x: 44, y: 314, width: 534, height: 24 },
      smoothing: false,
    });
  });
});
