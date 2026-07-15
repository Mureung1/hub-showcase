export function getPriorityLevel(priorityScore) {
  if (priorityScore >= 80) {
    return "high";
  }

  if (priorityScore >= 50) {
    return "medium";
  }

  return "low";
}

export const priorityLevelLabel = {
  high: "높음",
  medium: "중간",
  low: "낮음",
};
