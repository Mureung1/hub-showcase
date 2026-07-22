// 우선순위 성향 프리셋. 사용자가 결과 화면에서 선택할 수 있다.
// 각 가중치의 합은 1.0 이 되도록 맞춘다. (서버 priorityService.js 와 값을 맞춘다.)
export const WEIGHT_PRESETS = {
  balanced: {
    key: "balanced",
    label: "균형",
    understanding: 0.25,
    difficulty: 0.15,
    urgency: 0.2,
    gradeWeight: 0.2,
    grading: 0.1,
    studyAmount: 0.1,
  },
  difficulty: {
    key: "difficulty",
    label: "난이도 중시",
    understanding: 0.2,
    difficulty: 0.3,
    urgency: 0.1,
    gradeWeight: 0.15,
    grading: 0.1,
    studyAmount: 0.15,
  },
  urgency: {
    key: "urgency",
    label: "임박도 중시",
    understanding: 0.15,
    difficulty: 0.1,
    urgency: 0.4,
    gradeWeight: 0.15,
    grading: 0.1,
    studyAmount: 0.1,
  },
  grade: {
    key: "grade",
    label: "학점 전략",
    understanding: 0.15,
    difficulty: 0.1,
    urgency: 0.15,
    gradeWeight: 0.3,
    grading: 0.2,
    studyAmount: 0.1,
  },
};

export const DEFAULT_WEIGHT_KEY = "balanced";

// 1~5 척도 필드에 값이 없을 때 쓰는 중립값.
const NEUTRAL = 3;

// 시험이 이 일수 이상 남으면 급함 점수는 0으로 본다.
const URGENCY_HORIZON = 30;

// 1~5 값을 "클수록 높은 점수(0~100)"로 바꾼다. (1 -> 0, 5 -> 100)
function ascendingScore(value) {
  return ((value - 1) / 4) * 100;
}

// 각 요인을 0~100 점수로 분해한다.
export function getScoreBreakdown({
  understanding = NEUTRAL,
  difficulty = NEUTRAL,
  daysUntil,
  gradeWeight = 40,
  grading = NEUTRAL,
  studyAmount = NEUTRAL,
}) {
  return {
    // 이해도가 낮을수록 먼저 공부해야 하므로 점수를 높인다. (1 -> 100, 5 -> 0)
    understanding: ((5 - understanding) / 4) * 100,
    // 난이도가 높을수록 우선순위를 높인다.
    difficulty: ascendingScore(difficulty),
    // 시험이 가까울수록 높인다.
    urgency: calculateUrgencyScore(daysUntil),
    // 학점 반영 비율은 이미 0~100 이므로 그 값을 그대로 점수로 쓴다.
    gradeWeight: Math.max(0, Math.min(100, gradeWeight)),
    // 교수님이 학점을 짜게 줄수록(받기 어려울수록) 더 신경 쓰도록 높인다.
    grading: ascendingScore(grading),
    // 공부 분량(시험 범위)이 많을수록 미리 시작하도록 높인다.
    studyAmount: ascendingScore(studyAmount),
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
    breakdown.studyAmount * weights.studyAmount;

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
