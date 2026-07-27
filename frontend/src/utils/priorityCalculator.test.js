import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePriorityScore,
  getScoreBreakdown,
  FACTOR_KEYS,
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

// ── 학점은 배수가 아니라 다른 요인과 같은 0~100 점수다 ──
// 예전에는 최종 점수에 credits/3 을 곱했다. 6학점이면 2배라 180점 같은 값이 나왔고,
// 0~100 을 전제로 한 배지 경계와 "N점" 표시가 무의미해졌다.

test("getScoreBreakdown: 학점이 높을수록 높은 점수", () => {
  assert.equal(getScoreBreakdown({ credits: 1, daysUntil: 40 }).credits, 0);
  assert.equal(getScoreBreakdown({ credits: 3, daysUntil: 40 }).credits, 40);
  assert.equal(getScoreBreakdown({ credits: 6, daysUntil: 40 }).credits, 100);
});

// 6학점을 넘는 과목은 드물다. 그 위는 전부 최고점으로 본다.
test("getScoreBreakdown: 6학점을 넘어도 100을 넘지 않는다", () => {
  assert.equal(getScoreBreakdown({ credits: 7.5, daysUntil: 40 }).credits, 100);
  assert.equal(getScoreBreakdown({ credits: 30, daysUntil: 40 }).credits, 100);
});

test("getScoreBreakdown: 학점을 안 넣으면 모름(null)", () => {
  assert.equal(getScoreBreakdown({ daysUntil: 40 }).credits, null);
  assert.equal(getScoreBreakdown({ credits: null, daysUntil: 40 }).credits, null);
  assert.equal(getScoreBreakdown({ credits: 0, daysUntil: 40 }).credits, null);
});

// 학점이 높으면 우선순위가 올라가야 한다. (배수를 없앤 뒤에도 이 성질은 지킨다)
test("calculatePriorityScore: 같은 조건이면 학점 높은 쪽이 더 높다", () => {
  const base = { understanding: 4, daysUntil: 10 };
  const high = calculatePriorityScore({ ...base, credits: 6 }, WEIGHT_PRESETS.balanced);
  const low = calculatePriorityScore({ ...base, credits: 1 }, WEIGHT_PRESETS.balanced);
  assert.ok(high > low, `${high} > ${low}`);
});

// 배수를 곱하던 시절에는 6학점 과목이 180점까지 갔다.
test("calculatePriorityScore: 어떤 값을 넣어도 0~100 을 벗어나지 않는다", () => {
  const allMax = {
    understanding: 1,
    difficulty: 7,
    daysUntil: 0,
    gradeWeight: 100,
    grading: 7,
    studyAmount: 7,
    availableTime: 1,
    previousScore: 0,
    credits: 30,
  };

  for (const key of Object.keys(WEIGHT_PRESETS)) {
    const score = calculatePriorityScore(allMax, WEIGHT_PRESETS[key]);
    assert.ok(score >= 0 && score <= 100, `${key}: ${score}`);
  }
});

test("WEIGHT_PRESETS: 모든 성향의 가중치 합이 1.0", () => {
  for (const [key, weights] of Object.entries(WEIGHT_PRESETS)) {
    const sum = FACTOR_KEYS.reduce((total, factor) => total + weights[factor], 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${key}: ${sum}`);
  }
});

test("FACTOR_KEYS: 학점이 요인 목록에 들어 있다", () => {
  assert.ok(FACTOR_KEYS.includes("credits"));
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

// ── 시험이 지난 과목은 급하지 않다 ──
// 예전에는 daysUntil <= 0 을 전부 100(가장 급함)으로 봤다. 그래서 한 달 전에 끝난
// 시험이 계속 1순위로 떠 있었고, 사용자가 직접 지우지 않으면 목록을 차지했다.

test("getScoreBreakdown: 시험 당일은 가장 급하다", () => {
  assert.equal(getScoreBreakdown({ daysUntil: 0 }).urgency, 100);
});

test("getScoreBreakdown: 시험이 지났으면 급하지 않다", () => {
  assert.equal(getScoreBreakdown({ daysUntil: -1 }).urgency, 0);
  assert.equal(getScoreBreakdown({ daysUntil: -30 }).urgency, 0);
});

test("calculatePriorityScore: 지난 시험이 오늘 시험보다 우선순위가 낮다", () => {
  const base = { understanding: 4 };
  const today = calculatePriorityScore({ ...base, daysUntil: 0 }, WEIGHT_PRESETS.balanced);
  const past = calculatePriorityScore({ ...base, daysUntil: -7 }, WEIGHT_PRESETS.balanced);
  assert.ok(past < today, `${past} < ${today}`);
});

// ── 성적 반영 비율(gradeWeight)도 "모름"을 가진다 ──
// 예전에는 안 넣으면 40%로 채웠다. 사용자가 답한 적 없는 값이 점수에 섞이므로
// 다른 요인들과 똑같이 모름(null)으로 두고 계산에서 뺀다.

test("getScoreBreakdown: 성적 반영 비율을 안 넣으면 모름(null)", () => {
  const b = getScoreBreakdown({ understanding: 4, daysUntil: 40 });
  assert.equal(b.gradeWeight, null);
});

// 0%("성적에 안 들어감")는 모름이 아니라 분명한 대답이다. 0점으로 계산돼야 한다.
test("getScoreBreakdown: 성적 반영 비율 0%는 모름이 아니라 0점", () => {
  const b = getScoreBreakdown({ gradeWeight: 0, daysUntil: 40 });
  assert.equal(b.gradeWeight, 0);
});

// 아는 항목이 전부 100점짜리면, 성적 반영 비율을 몰라도 100점이어야 한다.
test("calculatePriorityScore: 성적 반영 비율 모름은 점수를 끌어내리지 않는다", () => {
  const allMax = {
    understanding: 1,
    difficulty: 7,
    daysUntil: 0,
    grading: 7,
    studyAmount: 7,
    availableTime: 1,
    previousScore: 0,
  };

  assert.equal(
    calculatePriorityScore({ ...allMax, gradeWeight: 100 }, WEIGHT_PRESETS.balanced),
    100
  );
  assert.equal(calculatePriorityScore(allMax, WEIGHT_PRESETS.balanced), 100);
});

// 이름과 시험 날짜만 아는 과목도 임박도만으로 점수가 나와야 한다.
// (1단계에서 이름·날짜만 받고 바로 순서를 보여주기 위한 성질)
test("calculatePriorityScore: 시험 날짜만 알아도 임박도로 점수가 나온다", () => {
  const soon = calculatePriorityScore({ daysUntil: 1 }, WEIGHT_PRESETS.balanced);
  const later = calculatePriorityScore({ daysUntil: 25 }, WEIGHT_PRESETS.balanced);

  assert.ok(soon > later, `${soon} > ${later}`);
  assert.ok(soon >= 0 && soon <= 100, `0 <= ${soon} <= 100`);
});

// 아는 요인이 하나도 없으면 판단할 근거가 없다.
test("calculatePriorityScore: 전부 모르면 0점", () => {
  assert.equal(calculatePriorityScore({}, WEIGHT_PRESETS.balanced), 0);
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
