import { normalizeAnalysisResult } from "../utils/normalizeAnalysisResult.js";
import { createTasks } from "./createTasks.js";
import { matchOpportunity } from "./matchOpportunity.js";

export function rematchAnalysisResult(result, profile) {
  if (!result) {
    return null;
  }

  const normalizedResult = normalizeAnalysisResult(result);
  const match = matchOpportunity({
    profile,
    opportunity: normalizedResult.opportunity,
  });
  const previousTaskStatus = new Map(
    normalizedResult.tasks.map((task) => [task.id, task.status]),
  );
  const tasks = createTasks(normalizedResult.opportunity, match).map((task) => ({
    ...task,
    status: previousTaskStatus.get(task.id) || task.status,
  }));

  return normalizeAnalysisResult({
    ...normalizedResult,
    match,
    tasks,
  });
}
