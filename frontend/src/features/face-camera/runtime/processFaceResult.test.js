import { describe, expect, it } from "vitest";
import { processFaceResult } from "./processFaceResult";

describe("processFaceResult", () => {
  it("returns explicit states for zero and multiple faces", () => {
    expect(
      processFaceResult({ faceLandmarks: [], faceBlendshapes: [] }, [])
    ).toEqual({ status: "no-face", samples: [], stableResult: null });

    expect(
      processFaceResult({ faceLandmarks: [{}, {}], faceBlendshapes: [] }, [])
    ).toEqual({
      status: "multiple-faces",
      samples: [],
      stableResult: null
    });
  });

  it("stabilizes movement features after enough single-face frames", () => {
    const frame = {
      faceLandmarks: [{}],
      faceBlendshapes: [
        {
          categories: [
            { categoryName: "mouthSmileLeft", score: 0.9 },
            { categoryName: "mouthSmileRight", score: 0.9 }
          ]
        }
      ]
    };
    const first = processFaceResult(frame, []);
    const second = processFaceResult(frame, first.samples);
    const third = processFaceResult(frame, second.samples);

    expect(first.status).toBe("stabilizing");
    expect(second.status).toBe("stabilizing");
    expect(third.status).toBe("detected");
    expect(third.stableResult.features[0]).toEqual({
      name: "mouthSmileLeft",
      score: 0.9
    });
  });
});
