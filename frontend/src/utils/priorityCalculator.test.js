import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePriorityScore,
  creditMultiplier,
  getScoreBreakdown,
  WEIGHT_PRESETS,
} from "./priorityCalculator.js";

// "모르겠다"(0)는 값을 아예 안 줬을 때(중립 기본값)와 같은 점수를 낸다.
test("calculatePriorityScore: 모르겠다(0)는 값 없음(중립)과 같은 점수", () => {
  const base = {
    difficulty: 4,
    daysUntil: 40,
    gradeWeight: 50,
    grading: 4,
    studyAmount: 4,
    availableTime: 4,
  };
  const zero = calculatePriorityScore(
    { ...base, understanding: 0 },
    WEIGHT_PRESETS.balanced
  );
  const omitted = calculatePriorityScore({ ...base }, WEIGHT_PRESETS.balanced);
  assert.equal(zero, omitted);
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

// 확보 가능한 공부 시간은 적을수록(빠듯할수록) 높은 점수다. (1~7 척도, 7이 최댓값)
test("getScoreBreakdown: 확보 가능한 공부 시간은 적을수록 높은 점수", () => {
  assert.equal(getScoreBreakdown({ availableTime: 1, daysUntil: 40 }).availableTime, 100);
  assert.equal(getScoreBreakdown({ availableTime: 7, daysUntil: 40 }).availableTime, 0);
});

// 중요도(학점) 배수: 3학점 기준 1배, 학점이 높을수록 커진다.
test("creditMultiplier: 3학점 기준 1배, 6학점 2배, 7.5학점 2.5배", () => {
  assert.equal(creditMultiplier(3), 1);
  assert.equal(creditMultiplier(6), 2);
  assert.equal(creditMultiplier(7.5), 2.5);
});

test("creditMultiplier: 값이 없거나 잘못되면 1배(기본 3학점)", () => {
  assert.equal(creditMultiplier(undefined), 1);
  assert.equal(creditMultiplier(0), 1);
  assert.equal(creditMultiplier(-5), 1);
});

// 같은 기본 점수라도 학점이 높은 과목이 최종 점수가 더 높다. (사용자 예: 7.5학점 vs 5학점)
test("최종 점수: 같은 기본 점수면 학점 높은 쪽이 더 높다", () => {
  const base = 80;
  const higher = Math.round(base * creditMultiplier(7.5));
  const lower = Math.round(base * creditMultiplier(5));
  assert.ok(higher > lower, `${higher} > ${lower}`);
});

// 이전 시험 점수는 선택 입력이다. 입력이 없으면 중립(50)으로 본다.
test("getScoreBreakdown: 이전 시험 점수를 안 넣으면 중립(50)", () => {
  const b = getScoreBreakdown({ difficulty: 4, daysUntil: 40 });
  assert.equal(b.previousScore, 50);
});

// 이전 시험 점수가 높을수록(이미 잘하니) 낮은 점수를 준다.
test("getScoreBreakdown: 이전 시험 점수가 높을수록 낮은 점수", () => {
  assert.equal(getScoreBreakdown({ previousScore: 0, daysUntil: 40 }).previousScore, 100);
  assert.equal(getScoreBreakdown({ previousScore: 100, daysUntil: 40 }).previousScore, 0);
});

// 같은 조건이면 이전 시험 점수가 높은 과목이 최종 우선순위 점수가 더 낮다.
test("calculatePriorityScore: 이전 시험 점수가 높으면 우선순위가 더 낮다", () => {
  const base = {
    understanding: 4,
    difficulty: 4,
    daysUntil: 40,
    gradeWeight: 40,
    grading: 4,
    studyAmount: 4,
    availableTime: 4,
  };
  const highScore = calculatePriorityScore(
    { ...base, previousScore: 95 },
    WEIGHT_PRESETS.balanced
  );
  const lowScore = calculatePriorityScore(
    { ...base, previousScore: 20 },
    WEIGHT_PRESETS.balanced
  );
  assert.ok(highScore < lowScore, `${highScore} < ${lowScore}`);
});
