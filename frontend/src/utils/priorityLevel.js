// 경계값은 실제 점수 분포에 맞춘 것이다.
// 예전에는 안 답한 항목을 4·40 으로 채워서 점수가 50~65 에 몰렸고, 그때 기준이 80/50 이었다.
// 지금은 답한 것만으로 계산해 0~100 으로 퍼지는데, 옛 경계를 그대로 두니
// 시험 당일에 이해도가 절반이어도(75점) "중간" 으로 보였다.
const HIGH_THRESHOLD = 75;
const MEDIUM_THRESHOLD = 45;

export function getPriorityLevel(priorityScore) {
  if (priorityScore >= HIGH_THRESHOLD) {
    return "high";
  }

  if (priorityScore >= MEDIUM_THRESHOLD) {
    return "medium";
  }

  return "low";
}

export const priorityLevelLabel = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};
