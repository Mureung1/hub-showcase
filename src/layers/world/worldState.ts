import type { QuestStatus, ThemeId, TimeOfDay, WorldState } from "../../domain/types";

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function buildWorldState(theme: ThemeId, questStatus: QuestStatus): WorldState {
  const timeOfDay = getTimeOfDay();

  return {
    theme,
    timeOfDay,
    managerMood:
      questStatus === "done"
        ? "happy"
        : questStatus === "failed"
          ? "recovering"
          : questStatus === "accepted"
            ? "focused"
            : "waiting",
    tvMode: questStatus === "accepted" ? "pixel-reality" : questStatus === "done" ? "quest-log" : "idle",
  };
}

export const timeLabels: Record<TimeOfDay, string> = {
  morning: "아침",
  afternoon: "낮",
  evening: "저녁",
  night: "밤",
};
