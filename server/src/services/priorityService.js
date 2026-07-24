// 우선순위 성향 프리셋. 클라이언트의 priorityCalculator.js와 값을 맞춘다.
// 각 가중치의 합은 1.0 이다.
export const WEIGHT_PRESETS = {
  balanced: { understanding: 0.18, difficulty: 0.13, urgency: 0.18, gradeWeight: 0.13, grading: 0.08, studyAmount: 0.09, availableTime: 0.09, previousScore: 0.12 },
  difficulty: { understanding: 0.18, difficulty: 0.22, urgency: 0.09, gradeWeight: 0.13, grading: 0.09, studyAmount: 0.09, availableTime: 0.09, previousScore: 0.11 },
  urgency: { understanding: 0.13, difficulty: 0.09, urgency: 0.31, gradeWeight: 0.13, grading: 0.05, studyAmount: 0.09, availableTime: 0.09, previousScore: 0.11 },
  grade: { understanding: 0.09, difficulty: 0.09, urgency: 0.13, gradeWeight: 0.27, grading: 0.13, studyAmount: 0.09, availableTime: 0.09, previousScore: 0.11 },
};

export const DEFAULT_WEIGHT_KEY = "balanced";

// 1~7 척도의 최댓값. (클라이언트 priorityCalculator.js 와 값을 맞춘다.)
const SCALE_MAX = 7;

// 1~7 척도 필드에 값이 없을 때 쓰는 중립값(정확한 중앙값).
const NEUTRAL = 4;

// 시험이 이 일수 이상 남으면 급함 점수는 0으로 본다.
const URGENCY_HORIZON = 30;

// 1~7 값을 "클수록 높은 점수(0~100)"로 바꾼다.
function ascendingScore(value) {
  return ((value - 1) / (SCALE_MAX - 1)) * 100;
}

// 1~7 범위를 벗어난 값(0="모르겠다", null, 미설정)은 중립값으로 본다.
function toScale(value) {
  return value >= 1 && value <= SCALE_MAX ? value : NEUTRAL;
}

// 중요도(과목 학점 수) 배수. 3학점을 기준(1배)으로 한다. (클라이언트와 값을 맞춘다.)
const REFERENCE_CREDITS = 3;

function creditMultiplier(credits) {
  const c = typeof credits === "number" && credits > 0 ? credits : REFERENCE_CREDITS;
  return c / REFERENCE_CREDITS;
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

// 이전 시험 점수(0~100)가 없을 때 쓰는 중립값. "평균 정도 봤다"고 가정해 유리·불리를 안 준다.
const PREVIOUS_SCORE_NEUTRAL = 50;

export function calculatePriorityScore(
  {
    understanding = NEUTRAL,
    difficulty = NEUTRAL,
    daysUntil,
    gradeWeight = 40,
    grading = NEUTRAL,
    studyAmount = NEUTRAL,
    availableTime = NEUTRAL,
    previousScore,
  },
  weights
) {
  const understandingScore = ((SCALE_MAX - toScale(understanding)) / (SCALE_MAX - 1)) * 100;
  const difficultyScore = ascendingScore(toScale(difficulty));
  const urgencyScore = calculateUrgencyScore(daysUntil);
  // 학점 반영 비율은 이미 0~100 이므로 그 값을 그대로 점수로 쓴다.
  const gradeWeightScore = Math.max(0, Math.min(100, gradeWeight));
  const gradingScore = ascendingScore(toScale(grading));
  const studyAmountScore = ascendingScore(toScale(studyAmount));
  // 확보 가능한 공부 시간이 적을수록(빠듯할수록) 점수를 높인다. (1 -> 100, 7 -> 0)
  const availableTimeScore = ((SCALE_MAX - toScale(availableTime)) / (SCALE_MAX - 1)) * 100;
  // 이전 시험 점수가 높을수록(이미 잘하니) 점수를 낮춘다. 선택 입력이라 없으면 중립(50).
  const previousScoreScore =
    100 -
    Math.max(
      0,
      Math.min(100, typeof previousScore === "number" ? previousScore : PREVIOUS_SCORE_NEUTRAL)
    );

  const score =
    understandingScore * weights.understanding +
    difficultyScore * weights.difficulty +
    urgencyScore * weights.urgency +
    gradeWeightScore * weights.gradeWeight +
    gradingScore * weights.grading +
    studyAmountScore * weights.studyAmount +
    availableTimeScore * weights.availableTime +
    previousScoreScore * weights.previousScore;

  return Math.round(score);
}

// 과목 목록에 우선순위 점수를 채워 돌려준다.
export function scoreSubjects(subjects, weightKey) {
  const weights = WEIGHT_PRESETS[weightKey] || WEIGHT_PRESETS[DEFAULT_WEIGHT_KEY];

  return subjects.map((subject) => {
    const base = calculatePriorityScore(
      {
        understanding: subject.understanding,
        difficulty: subject.difficulty,
        daysUntil: getDaysUntil(subject.examDate),
        gradeWeight: subject.gradeWeight,
        grading: subject.grading,
        studyAmount: subject.studyAmount,
        availableTime: subject.availableTime,
        previousScore: subject.previousScore,
      },
      weights
    );

    return {
      ...subject,
      // 기본 점수에 중요도(학점) 배수를 곱해 최종 점수를 낸다.
      priorityScore: Math.round(base * creditMultiplier(subject.credits)),
    };
  });
}
