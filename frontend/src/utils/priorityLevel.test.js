import { test } from "node:test";
import assert from "node:assert/strict";
import { getPriorityLevel, priorityLevelLabel } from "./priorityLevel.js";

test("getPriorityLevel: 경계값 75 이상은 높음", () => {
  assert.equal(getPriorityLevel(75), "high");
  assert.equal(getPriorityLevel(74), "medium");
});

test("getPriorityLevel: 경계값 45 이상은 중간", () => {
  assert.equal(getPriorityLevel(45), "medium");
  assert.equal(getPriorityLevel(44), "low");
});

test("getPriorityLevel: 0점과 100점", () => {
  assert.equal(getPriorityLevel(0), "low");
  assert.equal(getPriorityLevel(100), "high");
});

// 예전 경계(80)에서는 시험 당일에 이해도가 절반이면 75점 -> "중간" 이었다.
// 배지는 급한 것을 훑어보라고 있는 건데, 시험 당일이 중간으로 보이면 제 일을 못 한다.
test("getPriorityLevel: 시험 당일 절반 앎(75점)은 높음", () => {
  assert.equal(getPriorityLevel(75), "high");
});

test("priorityLevelLabel: 세 단계 모두 한글 라벨이 있다", () => {
  assert.deepEqual(Object.keys(priorityLevelLabel).sort(), ["high", "low", "medium"]);
  assert.equal(priorityLevelLabel.high, "높음");
  assert.equal(priorityLevelLabel.medium, "중간");
  assert.equal(priorityLevelLabel.low, "낮음");
});
