import { describe, expect, it } from "vitest";
import { deriveLiveFaceEmotionAdjustments } from "./deriveLiveFaceEmotionAdjustments";

describe("deriveLiveFaceEmotionAdjustments", () => {
  it("raises joy continuously as the smile becomes stronger", () => {
    const subtle = deriveLiveFaceEmotionAdjustments([
      { name: "mouthSmileLeft", score: 0.3 },
      { name: "mouthSmileRight", score: 0.3 }
    ]);
    const strong = deriveLiveFaceEmotionAdjustments([
      { name: "mouthSmileLeft", score: 0.9 },
      { name: "mouthSmileRight", score: 0.9 }
    ]);

    expect(strong.joy).toBeGreaterThan(subtle.joy);
    expect(strong.neutral).toBeLessThan(subtle.neutral);
  });

  it("maps frown, tension, and eye widening to different score groups", () => {
    const result = deriveLiveFaceEmotionAdjustments([
      { name: "mouthFrownLeft", score: 0.8 },
      { name: "mouthFrownRight", score: 0.8 },
      { name: "browDownLeft", score: 0.7 },
      { name: "browDownRight", score: 0.7 },
      { name: "eyeWideLeft", score: 0.6 },
      { name: "eyeWideRight", score: 0.6 }
    ]);

    expect(result.sadness).toBeGreaterThan(0);
    expect(result.anger).toBeGreaterThan(0);
    expect(result.anxiety).toBeGreaterThan(0);
  });

  it("handles missing and invalid feature values safely", () => {
    expect(deriveLiveFaceEmotionAdjustments()).toEqual({
      anxiety: 0,
      sadness: 0,
      anger: 0,
      joy: 0,
      neutral: 34
    });
    expect(
      deriveLiveFaceEmotionAdjustments([
        { name: "mouthSmileLeft", score: Number.NaN }
      ])
    ).toMatchObject({ joy: 0, neutral: 34 });
  });
});
