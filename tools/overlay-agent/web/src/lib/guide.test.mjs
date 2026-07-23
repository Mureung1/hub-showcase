import assert from "node:assert/strict";
import test from "node:test";
import { createPersonFrame, selectFrames, withAdjustments } from "./guide.js";

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

test("applies slider adjustments without leaving normalized bounds", () => {
  const guide = { personFrames: [createPersonFrame(person, 0)], horizonY: 0.62 };
  const adjusted = withAdjustments(guide, { frameScale: 130, horizonPercent: 78 });
  assert.equal(adjusted.horizonY, 0.78);
  assert.ok(adjusted.personFrames[0].x + adjusted.personFrames[0].width <= 1);
});
