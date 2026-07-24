import { describe, expect, it } from "vitest";
import { stabilizeFaceSignal } from "./stabilizeFaceSignal";

describe("stabilizeFaceSignal", () => {
  it("does not accept a single momentary frame", () => {
    expect(
      stabilizeFaceSignal([
        {
          features: [{ name: "mouthSmileLeft", score: 0.9 }]
        }
      ])
    ).toBeNull();
  });

  it("averages movement features across recent frames without emotion voting", () => {
    const result = stabilizeFaceSignal([
      {
        features: [
          { name: "mouthSmileLeft", score: 0.6 },
          { name: "browDownLeft", score: 0.3 }
        ]
      },
      {
        features: [{ name: "mouthSmileLeft", score: 0.9 }]
      },
      {
        features: [
          { name: "mouthSmileLeft", score: 0.6 },
          { name: "browDownLeft", score: 0.3 }
        ]
      }
    ]);

    expect(result.features).toEqual([
      { name: "mouthSmileLeft", score: 0.7 },
      { name: "browDownLeft", score: 0.2 }
    ]);
    expect(result).not.toHaveProperty("signal");
    expect(result.legacySignal).toBe("neutral");
    expect(result.confidence).toBe(0.7);
    expect(result.evidence).toEqual([]);
  });

  it("treats a feature missing from a frame as zero contribution", () => {
    const result = stabilizeFaceSignal(
      [
        { features: [{ name: "eyeSquintLeft", score: 0.9 }] },
        { features: [] },
        { features: [] }
      ],
      { minSamples: 3, minFeatureScore: 0.1 }
    );

    expect(result.features).toEqual([
      { name: "eyeSquintLeft", score: 0.3 }
    ]);
  });

  it("uses only the most recent window", () => {
    const result = stabilizeFaceSignal(
      [
        { features: [{ name: "mouthSmileLeft", score: 0.9 }] },
        { features: [{ name: "mouthSmileLeft", score: 0.9 }] },
        { features: [{ name: "browDownLeft", score: 0.6 }] },
        { features: [{ name: "browDownLeft", score: 0.6 }] },
        { features: [{ name: "browDownLeft", score: 0.6 }] }
      ],
      { windowSize: 3, minSamples: 3 }
    );

    expect(result.features).toEqual([
      { name: "browDownLeft", score: 0.6 }
    ]);
  });

  it("handles empty or invalid input", () => {
    expect(stabilizeFaceSignal([])).toBeNull();
    expect(stabilizeFaceSignal([{ features: null }])).toBeNull();
  });
});
