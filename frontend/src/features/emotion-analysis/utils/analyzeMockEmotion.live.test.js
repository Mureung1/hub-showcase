import { describe, expect, it } from "vitest";
import { analyzeMockEmotion } from "./analyzeMockEmotion";

function scoreOf(result, key) {
  return result.scores.find((emotion) => emotion.key === key)?.score;
}

describe("analyzeMockEmotion live face input", () => {
  it("changes normalized percentages as facial movement strength changes", () => {
    const subtleSmile = analyzeMockEmotion({
      faceFeatures: [
        { name: "mouthSmileLeft", score: 0.25 },
        { name: "mouthSmileRight", score: 0.25 }
      ]
    });
    const strongSmile = analyzeMockEmotion({
      faceFeatures: [
        { name: "mouthSmileLeft", score: 0.9 },
        { name: "mouthSmileRight", score: 0.9 }
      ]
    });

    expect(scoreOf(strongSmile, "joy")).toBeGreaterThan(
      scoreOf(subtleSmile, "joy")
    );
    expect(
      strongSmile.scores.reduce((total, emotion) => total + emotion.score, 0)
    ).toBe(100);
  });

  it("labels camera movement as heuristic evidence", () => {
    const result = analyzeMockEmotion({
      faceFeatures: [{ name: "browInnerUp", score: 0.7 }]
    });

    expect(result.evidence).toContain(
      "카메라에서 감지한 얼굴 움직임 강도를 실시간 반영"
    );
  });
});
