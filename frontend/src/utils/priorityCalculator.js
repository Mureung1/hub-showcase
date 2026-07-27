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

// "모르겠다"(0)와 미입력·범위 밖 값은 척도 위의 값이 아니라 "정보가 없다"는 뜻이다.
// 중립값(4)으로 바꿔 채우면 사용자가 하지 않은 대답이 점수에 섞이므로 null(모름)을 돌려준다.
function toScale(value) {
  return value >= 1 && value <= SCALE_MAX ? value : null;
}

// 점수 계산에 쓰는 요인 목록. getScoreBreakdown 의 키와 가중치 프리셋의 키가 같아야 한다.
export const FACTOR_KEYS = [
  "understanding",
  "difficulty",
  "urgency",
  "gradeWeight",
  "grading",
  "studyAmount",
  "availableTime",
  "previousScore",
];

// 1~7 값이 클수록 높은 점수. 모름이면 null 을 그대로 넘긴다.
function ascending(value) {
  const scale = toScale(value);
  return scale === null ? null : ascendingScore(scale);
}

// 1~7 값이 작을수록 높은 점수. (1 -> 100, 7 -> 0) 모름이면 null.
function descending(value) {
  const scale = toScale(value);
  return scale === null ? null : ((SCALE_MAX - scale) / (SCALE_MAX - 1)) * 100;
}

// 각 요인을 0~100 점수로 분해한다. 모르는 요인은 null 이다.
export function getScoreBreakdown({
  understanding,
  difficulty,
  daysUntil,
  gradeWeight = 40,
  grading,
  studyAmount,
  availableTime,
  previousScore,
}) {
  return {
    // 이해도가 낮을수록 먼저 공부해야 하므로 점수를 높인다. (1 -> 100, 7 -> 0)
    understanding: descending(understanding),
    // 난이도가 높을수록 우선순위를 높인다.
    difficulty: ascending(difficulty),
    // 시험이 가까울수록 높인다. 시험 날짜를 모르면 급함도 모른다.
    urgency: calculateUrgencyScore(daysUntil),
    // 학점 반영 비율은 이미 0~100 이므로 그 값을 그대로 점수로 쓴다.
    gradeWeight: Math.max(0, Math.min(100, gradeWeight)),
    // 교수님이 학점을 짜게 줄수록(받기 어려울수록) 더 신경 쓰도록 높인다.
    grading: ascending(grading),
    // 공부 분량(시험 범위)이 많을수록 미리 시작하도록 높인다.
    studyAmount: ascending(studyAmount),
    // 확보 가능한 공부 시간이 적을수록(빠듯할수록) 미리 시작하도록 높인다.
    availableTime: descending(availableTime),
    // 이전 시험 점수가 높을수록 이미 잘하는 과목이니 점수를 낮춘다.
    // 선택 입력이라 안 넣었으면 "평균 봤다"가 아니라 모름(null)으로 둔다.
    previousScore:
      typeof previousScore === "number"
        ? 100 - Math.max(0, Math.min(100, previousScore))
        : null,
  };
}

// 아는 요인만으로 점수를 낸다.
// 모르는 요인은 합산에서 빼고, 남은 요인들의 가중치를 다시 나눠 합이 1이 되게 맞춘다(재정규화).
// 이렇게 해야 "모르겠다"가 중립값이라는 한 표를 몰래 행사하지 않는다.
export function calculatePriorityScore(input, weights = WEIGHT_PRESETS.balanced) {
  const breakdown = getScoreBreakdown(input);

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
