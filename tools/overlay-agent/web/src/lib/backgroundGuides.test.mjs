import assert from "node:assert/strict";
import test from "node:test";
import { MAX_BACKGROUND_LINES, createBackgroundLine, removeMostRecentLine } from "./backgroundGuides.js";

test("creates a normalized background line from two canvas points", () => {
  const line = createBackgroundLine([], { x: 0.2, y: 0.3 }, { x: 0.8, y: 0.5 });
  assert.match(line.id, /^line_[0-9a-f-]{36}$/);
  assert.deepEqual({ start: line.start, end: line.end }, { start: [0.2, 0.3], end: [0.8, 0.5] });
});

test("rejects a too-short line and a sixth background line", () => {
  assert.equal(createBackgroundLine([], { x: 0.2, y: 0.2 }, { x: 0.203, y: 0.203 }), null);
  const lines = Array.from({ length: MAX_BACKGROUND_LINES }, (_, index) => ({ id: `line-${index + 1}` }));
  assert.equal(createBackgroundLine(lines, { x: 0.1, y: 0.1 }, { x: 0.8, y: 0.8 }), null);
});

test("removes only the most recently registered line", () => {
  const lines = [{ id: "line_first" }, { id: "line_second" }];
  assert.deepEqual(removeMostRecentLine(lines), [{ id: "line_first" }]);
});
