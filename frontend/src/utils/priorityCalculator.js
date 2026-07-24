// 우선순위 성향 프리셋. 사용자가 결과 화면에서 선택할 수 있다.
// 각 가중치의 합은 1.0 이 되도록 맞춘다. (서버 priorityService.js 와 값을 맞춘다.)
export const WEIGHT_PRESETS = {
  balanced: {
    key: "balanced",
    label: "균형",
    understanding: 0.18,
    difficulty: 0.13,
    urgency: 0.18,
    gradeWeight: 0.13,
    grading: 0.08,
    studyAmount: 0.09,
    availableTime: 0.09,
    previousScore: 0.12,
  },
  difficulty: {
    key: "difficulty",
    label: "난이도 중시",
    understanding: 0.18,
    difficulty: 0.22,
    urgency: 0.09,
    gradeWeight: 0.13,
    grading: 0.09,
    studyAmount: 0.09,
    availableTime: 0.09,
    previousScore: 0.11,
  },
  urgency: {
    key: "urgency",
    label: "임박도 중시",
    understanding: 0.13,
    difficulty: 0.09,
    urgency: 0.31,
    gradeWeight: 0.13,
    grading: 0.05,
    studyAmount: 0.09,
    availableTime: 0.09,
    previousScore: 0.11,
  },
  grade: {
    key: "grade",
    label: "학점 전략",
    understanding: 0.09,
    difficulty: 0.09,
    urgency: 0.13,
    gradeWeight: 0.27,
    grading: 0.13,
    studyAmount: 0.09,
    availableTime: 0.09,
    previousScore: 0.11,
  },
};

export const DEFAULT_WEIGHT_KEY = "balanced";

// 1~7 척도의 최댓값. 척도를 바꾸려면 이 값과 아래 계산식만 맞추면 된다.
const SCALE_MAX = 7;

// 1~7 척도 필드에 값이 없을 때 쓰는 중립값(정확한 중앙값).
const NEUTRAL = 4;

// 시험이 이 일수 이상 남으면 급함 점수는 0으로 본다.
const URGENCY_HORIZON = 30;

// 1~7 값을 "클수록 높은 점수(0~100)"로 바꾼다. (1 -> 0, 7 -> 100)
function ascendingScore(value) {
  return ((value - 1) / (SCALE_MAX - 1)) * 100;
}

// 중요도(과목 학점 수) 배수. 3학점을 기준(1배)으로, 학점이 높을수록 최종 점수를 키운다.
// 예: 6학점 -> 2배, 7.5학점 -> 2.5배. 같은 기본 점수라도 학점이 높은 과목이 더 높게 나온다.
export const REFERENCE_CREDITS = 3;

export function creditMultiplier(credits) {
  const c = typeof credits === "number" && credits > 0 ? credits : REFERENCE_CREDITS;
  return c / REFERENCE_CREDITS;
}

// 1~7 범위를 벗어난 값(0="모르겠다", null, 미설정)은 중립값으로 본다.
function toScale(value) {
  return value >= 1 && value <= SCALE_MAX ? value : NEUTRAL;
}

// 이전 시험 점수(0~100)가 없을 때 쓰는 중립값. "평균 정도 봤다"고 가정해 유리·불리를 안 준다.
const PREVIOUS_SCORE_NEUTRAL = 50;

// 각 요인을 0~100 점수로 분해한다.
export function getScoreBreakdown({
  understanding = NEUTRAL,
  difficulty = NEUTRAL,
  daysUntil,
  gradeWeight = 40,
  grading = NEUTRAL,
  studyAmount = NEUTRAL,
  availableTime = NEUTRAL,
  previousScore,
}) {
  return {
    // 이해도가 낮을수록 먼저 공부해야 하므로 점수를 높인다. (1 -> 100, 7 -> 0)
    understanding: ((SCALE_MAX - toScale(understanding)) / (SCALE_MAX - 1)) * 100,
    // 난이도가 높을수록 우선순위를 높인다.
    difficulty: ascendingScore(toScale(difficulty)),
    // 시험이 가까울수록 높인다.
    urgency: calculateUrgencyScore(daysUntil),
    // 학점 반영 비율은 이미 0~100 이므로 그 값을 그대로 점수로 쓴다.
    gradeWeight: Math.max(0, Math.min(100, gradeWeight)),
    // 교수님이 학점을 짜게 줄수록(받기 어려울수록) 더 신경 쓰도록 높인다.
    grading: ascendingScore(toScale(grading)),
    // 공부 분량(시험 범위)이 많을수록 미리 시작하도록 높인다.
    studyAmount: ascendingScore(toScale(studyAmount)),
    // 확보 가능한 공부 시간이 적을수록(빠듯할수록) 미리 시작하도록 높인다. (1 -> 100, 7 -> 0)
    availableTime: ((SCALE_MAX - toScale(availableTime)) / (SCALE_MAX - 1)) * 100,
    // 이전 시험 점수(중간·1차·2차 등)가 높을수록 이미 잘하는 과목이니 점수를 낮춘다.
    // 선택 입력이라 값이 없으면 중립(50)으로 본다.
    previousScore:
      100 -
      Math.max(
        0,
        Math.min(100, typeof previousScore === "number" ? previousScore : PREVIOUS_SCORE_NEUTRAL)
      ),
  };
}

export function calculatePriorityScore(input, weights = WEIGHT_PRESETS.balanced) {
  const breakdown = getScoreBreakdown(input);

  const score =
    breakdown.understanding * weights.understanding +
    breakdown.difficulty * weights.difficulty +
    breakdown.urgency * weights.urgency +
    breakdown.gradeWeight * weights.gradeWeight +
    breakdown.grading * weights.grading +
    breakdown.studyAmount * weights.studyAmount +
    breakdown.availableTime * weights.availableTime +
    breakdown.previousScore * weights.previousScore;

  return Math.round(score);
}

function calculateUrgencyScore(daysUntil) {
  if (daysUntil === null || daysUntil >= URGENCY_HORIZON) {
    return 0;
  }

  if (daysUntil <= 0) {
    return 100;
  }

  return ((URGENCY_HORIZON - daysUntil) / URGENCY_HORIZON) * 100;
}
