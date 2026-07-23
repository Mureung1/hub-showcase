import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePriorityScore,
  getScoreBreakdown,
  WEIGHT_PRESETS,
} from "./priorityCalculator.js";

// "모르겠다"(0)는 중립(보통 3과 동일)으로 계산된다.
test("calculatePriorityScore: 모르겠다(0)는 보통(3)과 같은 점수", () => {
  const base = {
    difficulty: 3,
    daysUntil: 40,
    gradeWeight: 50,
    grading: 3,
    studyAmount: 3,
    availableTime: 3,
  };
  const zero = calculatePriorityScore(
    { ...base, understanding: 0 },
    WEIGHT_PRESETS.balanced
  );
  const three = calculatePriorityScore(
    { ...base, understanding: 3 },
    WEIGHT_PRESETS.balanced
  );
  assert.equal(zero, three);
});

test("getScoreBreakdown: 모르겠다(0)인 요인은 중립 점수(50)", () => {
  const b = getScoreBreakdown({
    understanding: 0,
    difficulty: 0,
    grading: 0,
    studyAmount: 0,
    availableTime: 0,
    daysUntil: 40,
    gradeWeight: 50,
  });
  assert.equal(b.understanding, 50);
  assert.equal(b.difficulty, 50);
  assert.equal(b.grading, 50);
  assert.equal(b.studyAmount, 50);
  assert.equal(b.availableTime, 50);
});

// 범위를 벗어난 값(null 등)도 중립(50)으로 방어한다.
test("getScoreBreakdown: 범위 밖 값(null)도 중립(50)", () => {
  const b = getScoreBreakdown({ difficulty: null, daysUntil: 40 });
  assert.equal(b.difficulty, 50);
});

// 확보 가능한 공부 시간은 적을수록(빠듯할수록) 높은 점수다.
test("getScoreBreakdown: 확보 가능한 공부 시간은 적을수록 높은 점수", () => {
  assert.equal(getScoreBreakdown({ availableTime: 1, daysUntil: 40 }).availableTime, 100);
  assert.equal(getScoreBreakdown({ availableTime: 5, daysUntil: 40 }).availableTime, 0);
});
