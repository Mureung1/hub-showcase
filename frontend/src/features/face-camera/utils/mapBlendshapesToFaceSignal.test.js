import { describe, expect, it } from "vitest";
import { mapBlendshapesToFaceSignal } from "./mapBlendshapesToFaceSignal";

describe("mapBlendshapesToFaceSignal", () => {
  it("returns movement features and isolates the existing signal as legacy compatibility", () => {
    const result = mapBlendshapesToFaceSignal({
      mouthSmileLeft: 0.86,
      mouthSmileRight: 0.82
    });

    expect(result).not.toHaveProperty("signal");
    expect(result.legacySignal).toBe("smile");
    expect(result.confidence).toBeGreaterThan(0.8);
    expect(result.evidence).toContain("mouthSmileLeft");
    expect(result.features).toEqual([
      { name: "mouthSmileLeft", score: 0.86 },
      { name: "mouthSmileRight", score: 0.82 }
    ]);
  });

  it("maps brow and eye tension features to tense", () => {
    const result = mapBlendshapesToFaceSignal({
      browDownLeft: 0.84,
      browDownRight: 0.8,
      eyeSquintLeft: 0.74,
      eyeSquintRight: 0.72
    });

    expect(result.legacySignal).toBe("tense");
    expect(result.evidence).toContain("browDownLeft");
  });

  it("maps frown features to downcast", () => {
    const result = mapBlendshapesToFaceSignal({
      mouthFrownLeft: 0.82,
      mouthFrownRight: 0.78,
      browInnerUp: 0.64
    });

    expect(result.legacySignal).toBe("downcast");
  });

  it("maps brow, squint, and mouth press features to angry", () => {
    const result = mapBlendshapesToFaceSignal({
      browDownLeft: 0.92,
      browDownRight: 0.9,
      eyeSquintLeft: 0.72,
      eyeSquintRight: 0.7,
      mouthPressLeft: 0.9,
      mouthPressRight: 0.86
    });

    expect(result.legacySignal).toBe("angry");
  });

  it("returns neutral when expression scores are low", () => {
    const result = mapBlendshapesToFaceSignal({
      mouthSmileLeft: 0.1,
      browDownLeft: 0.12
    });

    expect(result.legacySignal).toBe("neutral");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("handles categories, missing values, and invalid scores safely", () => {
    const result = mapBlendshapesToFaceSignal([
      { categoryName: "mouthSmileLeft", score: Number.NaN },
      { categoryName: "mouthSmileRight", score: 4 },
      { categoryName: "browDownLeft", score: -2 },
      { categoryName: "", score: 0.8 }
    ]);

    expect(["neutral", "smile", "tense", "downcast", "angry"]).toContain(
      result.legacySignal
    );
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.features).toEqual([
      { name: "mouthSmileRight", score: 1 }
    ]);
  });
});
