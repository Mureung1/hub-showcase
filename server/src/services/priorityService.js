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

// 시험이 이 일수 이상 남으면 급함 점수는 0으로 본다.
const URGENCY_HORIZON = 30;

// 1~7 값을 "클수록 높은 점수(0~100)"로 바꾼다.
function ascendingScore(value) {
  return ((value - 1) / (SCALE_MAX - 1)) * 100;
}

// "모르겠다"(0)와 미입력·범위 밖 값은 척도 위의 값이 아니라 "정보가 없다"는 뜻이다.
// 중립값으로 채우면 사용자가 하지 않은 대답이 점수에 섞이므로 null(모름)을 돌려준다.
// (클라이언트 priorityCalculator.js 와 규칙을 맞춘다.)
function toScale(value) {
  return value >= 1 && value <= SCALE_MAX ? value : null;
}

// 1~7 값이 클수록 높은 점수. 모름이면 null.
function ascending(value) {
  const scale = toScale(value);
  return scale === null ? null : ascendingScore(scale);
}

// 1~7 값이 작을수록 높은 점수. (1 -> 100, 7 -> 0) 모름이면 null.
function descending(value) {
  const scale = toScale(value);
  return scale === null ? null : ((SCALE_MAX - scale) / (SCALE_MAX - 1)) * 100;
}

// 점수 계산에 쓰는 요인 목록. 가중치 프리셋의 키와 같아야 한다.
const FACTOR_KEYS = [
  "understanding",
  "difficulty",
  "urgency",
  "gradeWeight",
  "grading",
  "studyAmount",
  "availableTime",
  "previousScore",
];

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
  // 시험 날짜가 없으면 급한지 아닌지를 알 수 없다. (여유롭다는 뜻이 아니다)
  if (daysUntil === null || daysUntil === undefined) {
    return null;
  }

  if (daysUntil >= URGENCY_HORIZON) {
    return 0;
  }

  if (daysUntil <= 0) {
    return 100;
  }

  return ((URGENCY_HORIZON - daysUntil) / URGENCY_HORIZON) * 100;
}

// 아는 요인만으로 점수를 낸다.
// 모르는 요인은 합산에서 빼고, 남은 요인들의 가중치를 다시 나눠 합이 1이 되게 맞춘다(재정규화).
// 이렇게 해야 "모르겠다"가 중립값이라는 한 표를 몰래 행사하지 않는다.
export function calculatePriorityScore(
  {
    understanding,
    difficulty,
    daysUntil,
    gradeWeight = 40,
    grading,
    studyAmount,
    availableTime,
    previousScore,
  },
  weights
) {
  const breakdown = {
    understanding: descending(understanding),
    difficulty: ascending(difficulty),
    urgency: calculateUrgencyScore(daysUntil),
    // 학점 반영 비율은 이미 0~100 이므로 그 값을 그대로 점수로 쓴다.
    gradeWeight: Math.max(0, Math.min(100, gradeWeight)),
    grading: ascending(grading),
    studyAmount: ascending(studyAmount),
    availableTime: descending(availableTime),
    // 이전 시험 점수가 높을수록 이미 잘하는 과목이니 점수를 낮춘다.
    // 선택 입력이라 안 넣었으면 "평균 봤다"가 아니라 모름(null)으로 둔다.
    previousScore:
      typeof previousScore === "number"
        ? 100 - Math.max(0, Math.min(100, previousScore))
        : null,
  };

  let weightedSum = 0;
  let knownWeight = 0;

  for (const key of FACTOR_KEYS) {
    const value = breakdown[key];
    if (value === null) {
      continue;
    }
    weightedSum += value * weights[key];
    knownWeight += weights[key];
  }

  // 아는 요인이 하나도 없으면 판단할 근거가 없다.
  if (knownWeight === 0) {
    return 0;
  }

  return Math.round(weightedSum / knownWeight);
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
