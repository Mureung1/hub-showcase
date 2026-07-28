import assert from "node:assert/strict";
import test from "node:test";
import { analysisHighlights, landingSteps } from "./figmaLandingContent";

test("Figma landing content keeps the three-step product story", () => {
  assert.deepEqual(
    landingSteps.map((step) => step.number),
    ["01", "02", "03"],
  );
  assert.equal(landingSteps[0].title, "Repository 연결");
  assert.equal(landingSteps[1].title, "마스코트 포피의 질문에 답변");
  assert.equal(landingSteps[2].title, "분석 결과 확인");
});

test("Figma landing content explains the three analysis signals", () => {
  assert.deepEqual(
    analysisHighlights.map((highlight) => highlight.title),
    ["기여도 분석", "기술 스택 추적", "기술적 도전 발굴"],
  );
});
