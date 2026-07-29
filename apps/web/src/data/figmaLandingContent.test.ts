import assert from "node:assert/strict";
import test from "node:test";
import {
  analysisHighlights,
  landingEvidenceExamples,
  landingSteps,
  workroomNotes,
} from "./figmaLandingContent";

test("Figma landing content keeps the three-step product story", () => {
  assert.deepEqual(
    landingSteps.map((step) => step.number),
    ["01", "02", "03"],
  );
  assert.equal(landingSteps[0].title, "저장소를 붙여요");
  assert.equal(landingSteps[1].title, "간단한 질문 하나면 충분해요");
  assert.equal(landingSteps[2].title, "고르면 초안이 나와요");
});

test("Figma landing content explains the three analysis signals", () => {
  assert.deepEqual(
    analysisHighlights.map((highlight) => highlight.title),
    ["기여도 분석", "기술 스택 추적", "기술적 도전 발굴"],
  );
});

test("Figma landing content provides typed evidence examples", () => {
  assert.deepEqual(
    landingEvidenceExamples.map((evidence) => evidence.type),
    ["PR", "COMMIT", "FILE", "ISSUE"],
  );
  assert.ok(
    landingEvidenceExamples.every((evidence) =>
      [evidence.reference, evidence.title, evidence.metadata].every(Boolean),
    ),
  );
});

test("Figma landing content explains the workroom experience", () => {
  assert.equal(workroomNotes.length, 3);
  assert.ok(workroomNotes.every((note) => note.title && note.description));
});
