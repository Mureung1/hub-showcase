import assert from "node:assert/strict";
import test from "node:test";
import { createGuide, createPersonFrame, selectFrames } from "./guide.js";

const person = [
  { x: 0.4, y: 0.2, visibility: 1 },
  { x: 0.55, y: 0.2, visibility: 1 },
  { x: 0.38, y: 0.72, visibility: 1 },
  { x: 0.58, y: 0.72, visibility: 1 },
];

test("creates a normalized person frame from visible pose landmarks", () => {
  const frame = createPersonFrame(person, 0);
  assert.ok(frame.x >= 0 && frame.y >= 0);
  assert.ok(frame.x + frame.width <= 1);
  assert.ok(frame.y + frame.height <= 1);
});

test("selects one or two frames by mode", () => {
  assert.equal(selectFrames([person, person.map((point) => ({ ...point, x: point.x - 0.3 }))], "solo").length, 1);
  assert.equal(selectFrames([person, person.map((point) => ({ ...point, x: point.x - 0.3 }))], "couple").length, 2);
});

test("creates a layout without an automatic horizontal guide", () => {
  const guide = createGuide({ personFrames: [createPersonFrame(person, 0)] });
  assert.deepEqual(Object.keys(guide).sort(), ["analysisMeta", "backgroundLines", "personFrames", "personOutlines", "personPoses", "poseSegments", "version"]);
  assert.deepEqual(guide.backgroundLines, []);
});

test("stores pose keypoints and scales them with the person frame", () => {
  const guide = createGuide({
    personFrames: [createPersonFrame(person, 0)],
    personPoses: [{
      label: "Subject",
      keypoints: {
        nose: [0.48, 0.23],
        left_shoulder: [0.42, 0.35],
        right_shoulder: [0.54, 0.35],
      },
      missingKeypoints: ["left_wrist"],
    }],
  });
  assert.equal(guide.poseSegments.length > 0, true);
  assert.deepEqual(guide.personPoses[0].missingKeypoints, ["left_wrist"]);
  assert.ok(Object.values(guide.personPoses[0].keypoints).every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
});
