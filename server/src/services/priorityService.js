// 우선순위 성향 프리셋. 클라이언트의 priorityCalculator.js와 값을 맞춘다.
// 각 가중치의 합은 1.0 이다.
export const WEIGHT_PRESETS = {
  balanced: { understanding: 0.2, difficulty: 0.15, urgency: 0.2, gradeWeight: 0.15, grading: 0.1, studyAmount: 0.1, availableTime: 0.1 },
  difficulty: { understanding: 0.2, difficulty: 0.25, urgency: 0.1, gradeWeight: 0.15, grading: 0.1, studyAmount: 0.1, availableTime: 0.1 },
  urgency: { understanding: 0.15, difficulty: 0.1, urgency: 0.35, gradeWeight: 0.15, grading: 0.05, studyAmount: 0.1, availableTime: 0.1 },
  grade: { understanding: 0.1, difficulty: 0.1, urgency: 0.15, gradeWeight: 0.3, grading: 0.15, studyAmount: 0.1, availableTime: 0.1 },
};

export const DEFAULT_WEIGHT_KEY = "balanced";

// 1~5 척도 필드에 값이 없을 때 쓰는 중립값.
const NEUTRAL = 3;

// 시험이 이 일수 이상 남으면 급함 점수는 0으로 본다.
const URGENCY_HORIZON = 30;

// 1~5 값을 "클수록 높은 점수(0~100)"로 바꾼다.
function ascendingScore(value) {
  return ((value - 1) / 4) * 100;
}

// 1~5 범위를 벗어난 값(0="모르겠다", null, 미설정)은 중립값으로 본다.
function toScale(value) {
  return value >= 1 && value <= 5 ? value : NEUTRAL;
}

export function getDaysUntil(examDate, today = new Date()) {
  if (!examDate) {
    return null;
  }

  const target = new Date(`${examDate}T00:00:00`);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffMs = target.getTime() - base.getTime();

  return Math.round(diffMs / (1000 * 60 * 60 * 24));
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

export function calculatePriorityScore(
  {
    understanding = NEUTRAL,
    difficulty = NEUTRAL,
    daysUntil,
    gradeWeight = 40,
    grading = NEUTRAL,
    studyAmount = NEUTRAL,
    availableTime = NEUTRAL,
  },
  weights
) {
  const understandingScore = ((5 - toScale(understanding)) / 4) * 100;
  const difficultyScore = ascendingScore(toScale(difficulty));
  const urgencyScore = calculateUrgencyScore(daysUntil);
  // 학점 반영 비율은 이미 0~100 이므로 그 값을 그대로 점수로 쓴다.
  const gradeWeightScore = Math.max(0, Math.min(100, gradeWeight));
  const gradingScore = ascendingScore(toScale(grading));
  const studyAmountScore = ascendingScore(toScale(studyAmount));
  // 확보 가능한 공부 시간이 적을수록(빠듯할수록) 점수를 높인다. (1 -> 100, 5 -> 0)
  const availableTimeScore = ((5 - toScale(availableTime)) / 4) * 100;

  const score =
    understandingScore * weights.understanding +
    difficultyScore * weights.difficulty +
    urgencyScore * weights.urgency +
    gradeWeightScore * weights.gradeWeight +
    gradingScore * weights.grading +
    studyAmountScore * weights.studyAmount +
    availableTimeScore * weights.availableTime;

  return Math.round(score);
}

// 과목 목록에 우선순위 점수를 채워 돌려준다.
export function scoreSubjects(subjects, weightKey) {
  const weights = WEIGHT_PRESETS[weightKey] || WEIGHT_PRESETS[DEFAULT_WEIGHT_KEY];

  return subjects.map((subject) => ({
    ...subject,
    priorityScore: calculatePriorityScore(
      {
        understanding: subject.understanding,
        difficulty: subject.difficulty,
        daysUntil: getDaysUntil(subject.examDate),
        gradeWeight: subject.gradeWeight,
        grading: subject.grading,
        studyAmount: subject.studyAmount,
        availableTime: subject.availableTime,
      },
      weights
    ),
  }));
}
