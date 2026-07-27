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

// "모르겠다"는 척도 위의 값이 아니라 "정보가 없다"는 뜻이다.
// 중립값(50)으로 바꿔버리면 사용자가 하지 않은 대답이 점수에 섞이므로, null(모름)로 둔다.
test("getScoreBreakdown: 모르겠다(0)인 요인은 모름(null)", () => {
  const b = getScoreBreakdown({
    understanding: 0,
    difficulty: 0,
    grading: 0,
    studyAmount: 0,
    availableTime: 0,
    daysUntil: 40,
    gradeWeight: 50,
  });
  assert.equal(b.understanding, null);
  assert.equal(b.difficulty, null);
  assert.equal(b.grading, null);
  assert.equal(b.studyAmount, null);
  assert.equal(b.availableTime, null);
});

// 범위를 벗어난 값(null 등)도 모름으로 본다.
test("getScoreBreakdown: 범위 밖 값(null)도 모름(null)", () => {
  const b = getScoreBreakdown({ difficulty: null, daysUntil: 40 });
  assert.equal(b.difficulty, null);
});

// 아는 값은 그대로 점수가 된다. (모름 처리가 정상 값까지 건드리면 안 된다)
test("getScoreBreakdown: 아는 값은 모름 처리의 영향을 받지 않는다", () => {
  const b = getScoreBreakdown({ difficulty: 7, grading: 0, daysUntil: 40 });
  assert.equal(b.difficulty, 100);
  assert.equal(b.grading, null);
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

// 이전 시험 점수는 선택 입력이다. "안 봤다"는 "평균 봤다"가 아니므로 모름(null)으로 둔다.
test("getScoreBreakdown: 이전 시험 점수를 안 넣으면 모름(null)", () => {
  const b = getScoreBreakdown({ difficulty: 4, daysUntil: 40 });
  assert.equal(b.previousScore, null);
});

// 이전 시험 점수가 높을수록(이미 잘하니) 낮은 점수를 준다.
test("getScoreBreakdown: 이전 시험 점수가 높을수록 낮은 점수", () => {
  assert.equal(getScoreBreakdown({ previousScore: 0, daysUntil: 40 }).previousScore, 100);
  assert.equal(getScoreBreakdown({ previousScore: 100, daysUntil: 40 }).previousScore, 0);
});

// ── "모르겠다"는 점수에 참여하지 않는다 (가중치 재분배) ──
// 모름을 중립(50)으로 채우면, 사용자가 하지 않은 대답이 점수를 끌어내린다.
// 모름인 요인은 계산에서 빼고 남은 요인들의 가중치를 다시 나눠 합이 1이 되게 한다.

// 가장 또렷한 성질: 아는 항목이 전부 100점짜리 답이면, 모르겠다가 섞여도 100점이어야 한다.
// (중립 50으로 채우던 방식에서는 96점으로 깎였다.)
test("calculatePriorityScore: 모르겠다는 점수를 끌어내리지 않는다", () => {
  const allMax = {
    understanding: 1,
    difficulty: 7,
    daysUntil: 0,
    gradeWeight: 100,
    grading: 7,
    studyAmount: 7,
    availableTime: 1,
    previousScore: 0,
  };

  assert.equal(calculatePriorityScore(allMax, WEIGHT_PRESETS.balanced), 100);
  assert.equal(
    calculatePriorityScore({ ...allMax, grading: 0 }, WEIGHT_PRESETS.balanced),
    100
  );
});

// 반대 방향도 같아야 한다. 아는 항목이 전부 0점이면 모르겠다가 섞여도 0점.
test("calculatePriorityScore: 모르겠다는 점수를 끌어올리지도 않는다", () => {
  const allMin = {
    understanding: 7,
    difficulty: 1,
    daysUntil: 40,
    gradeWeight: 0,
    grading: 1,
    studyAmount: 1,
    availableTime: 7,
    previousScore: 100,
  };

  assert.equal(calculatePriorityScore(allMin, WEIGHT_PRESETS.balanced), 0);
  assert.equal(
    calculatePriorityScore({ ...allMin, studyAmount: 0 }, WEIGHT_PRESETS.balanced),
    0
  );
});

// 모름이 섞여도 점수는 0~100 범위를 벗어나지 않는다.
test("calculatePriorityScore: 1~7 항목을 전부 모르겠다로 해도 0~100 범위", () => {
  const score = calculatePriorityScore(
    {
      understanding: 0,
      difficulty: 0,
      grading: 0,
      studyAmount: 0,
      availableTime: 0,
      daysUntil: 10,
      gradeWeight: 50,
    },
    WEIGHT_PRESETS.balanced
  );

  assert.equal(Number.isFinite(score), true);
  assert.ok(score >= 0 && score <= 100, `0 <= ${score} <= 100`);
});

// 아는 값만으로 계산하므로, 모름 여부와 상관없이 성향(가중치)은 그대로 작동해야 한다.
test("calculatePriorityScore: 모름이 있어도 성향에 따라 점수가 달라진다", () => {
  const subject = {
    understanding: 2,
    difficulty: 0,
    daysUntil: 2,
    gradeWeight: 30,
    grading: 0,
    studyAmount: 5,
    availableTime: 3,
  };

  const urgent = calculatePriorityScore(subject, WEIGHT_PRESETS.urgency);
  const grade = calculatePriorityScore(subject, WEIGHT_PRESETS.grade);

  assert.notEqual(urgent, grade);
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
