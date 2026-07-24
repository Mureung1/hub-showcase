import { getDaysUntil, formatDday } from "./daysUntil.js";
import { getScoreBreakdown, WEIGHT_PRESETS, DEFAULT_WEIGHT_KEY } from "./priorityCalculator.js";

// 요인별 점수(0~100)에 실제 기여도(가중치 × 점수)가 이 값 이상일 때만 이유로 언급한다.
// 성향(가중치)을 바꾸면 같은 과목이라도 언급되는 이유가 달라진다.
const CONTRIBUTION_THRESHOLD = 12;

// 1~7 값을 "3/7" 형태로, "모르겠다"(0)는 그대로 표시한다.
function scaleLabel(value) {
  return value >= 1 && value <= 7 ? `${value}/7` : "모르겠음";
}

// 각 요인을 구체적인 수치와 함께 설명하는 문구. FACTORS 순서는 상관없다(기여도로 정렬한다).
const FACTORS = [
  {
    key: "understanding",
    describe: (subject) => `이해도가 부족해서(${scaleLabel(subject.understanding)})`,
  },
  {
    key: "difficulty",
    describe: (subject) => `난이도가 높아서(${scaleLabel(subject.difficulty)})`,
  },
  {
    key: "urgency",
    describe: (subject, { daysUntil }) =>
      daysUntil !== null && daysUntil <= 0
        ? "시험이 이미 시작돼서"
        : `시험이 ${formatDday(daysUntil)}로 임박해서`,
  },
  {
    key: "gradeWeight",
    describe: (subject) => `성적 반영 비율이 높아서(${subject.gradeWeight ?? 40}%)`,
  },
  {
    key: "grading",
    describe: (subject) => `교수님이 학점을 짜게 주셔서(${scaleLabel(subject.grading)})`,
  },
  {
    key: "studyAmount",
    describe: (subject) => `공부 분량이 많아서(${scaleLabel(subject.studyAmount)})`,
  },
  {
    key: "availableTime",
    describe: (subject) => `공부할 시간이 빠듯해서(${scaleLabel(subject.availableTime)})`,
  },
  {
    key: "previousScore",
    describe: (subject) => `이전 시험 점수가 낮아서(${subject.previousScore}점)`,
  },
];

// 우선순위 점수의 근거를, 실제로 선택된 성향(weightKey)의 가중치를 반영해
// 기여도가 큰 순서로 최대 3가지까지 구체적인 수치와 함께 설명한다.
export function buildPriorityReason(subject, weightKey = DEFAULT_WEIGHT_KEY) {
  const daysUntil = getDaysUntil(subject.examDate);
  const weights = WEIGHT_PRESETS[weightKey] || WEIGHT_PRESETS[DEFAULT_WEIGHT_KEY];
  const breakdown = getScoreBreakdown({
    understanding: subject.understanding,
    difficulty: subject.difficulty,
    daysUntil,
    gradeWeight: subject.gradeWeight,
    grading: subject.grading,
    studyAmount: subject.studyAmount,
    availableTime: subject.availableTime,
    previousScore: subject.previousScore,
  });
  const ctx = { daysUntil };

  const ranked = FACTORS
    // 이전 시험 점수를 입력하지 않았으면(값이 숫자가 아니면) 애초에 후보에서 뺀다.
    .filter((factor) => factor.key !== "previousScore" || typeof subject.previousScore === "number")
    .map((factor) => ({
      factor,
      contribution: breakdown[factor.key] * weights[factor.key],
    }))
    .filter((item) => item.contribution >= CONTRIBUTION_THRESHOLD)
    .sort((a, b) => b.contribution - a.contribution);

  const reasons = ranked.slice(0, 3).map((item) => item.factor.describe(subject, ctx));

  if (subject.credits && subject.credits > 3) {
    reasons.push(`학점이 높아서(${subject.credits}학점)`);
  }

  if (reasons.length === 0) {
    const gentle = [];
    if (daysUntil !== null && daysUntil > 14) {
      gentle.push(`시험까지 ${daysUntil}일 여유가 있고`);
    }
    if (subject.understanding >= 6) {
      gentle.push(`이해도도 괜찮은 편이라(${scaleLabel(subject.understanding)})`);
    }
    if (typeof subject.previousScore === "number" && subject.previousScore >= 80) {
      gentle.push(`이전 시험도 잘 봤어서(${subject.previousScore}점)`);
    }
    return gentle.length > 0
      ? `${gentle.join(" ")} 당장 서두르지 않아도 괜찮아요.`
      : "여유가 있는 편이니 다른 과목을 먼저 챙겨도 좋아요.";
  }

  return `${reasons.join(", ")} 우선순위가 높게 나왔어요.`;
}
