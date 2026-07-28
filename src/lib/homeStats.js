const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const URGENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function toTimestamp(value) {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0)
  ) {
    return null;
  }
  const timestamp =
    value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toKstDayOrdinal(value) {
  const timestamp = toTimestamp(value);
  return timestamp === null
    ? null
    : Math.floor((timestamp + KST_OFFSET_MS) / DAY_MS);
}

export function calculateHomeStats(tasks, history, streak, now) {
  const nowTimestamp = toTimestamp(now);
  const todayOrdinal = toKstDayOrdinal(now);
  if (nowTimestamp === null || todayOrdinal === null) {
    throw new TypeError("now는 유효한 날짜여야 합니다.");
  }

  const taskItems = Array.isArray(tasks) ? tasks : [];
  const historyItems = Array.isArray(history) ? history : [];
  const urgentDeadline = nowTimestamp + URGENT_WINDOW_MS;

  const activeCount = taskItems.filter(
    (task) => task.status === "active",
  ).length;
  const urgentCount = taskItems.filter((task) => {
    if (task.status === "done") return false;
    const deadlineTimestamp = toTimestamp(task.deadline);
    return deadlineTimestamp !== null && deadlineTimestamp <= urgentDeadline;
  }).length;
  const todayCompletedCount = historyItems.reduce((count, item) => {
    return toKstDayOrdinal(item.completedAt) === todayOrdinal
      ? count + 1
      : count;
  }, 0);
  const normalizedStreak =
    typeof streak === "number" &&
    Number.isFinite(streak) &&
    Number.isInteger(streak) &&
    streak >= 0
      ? streak
      : 0;

  return {
    activeCount,
    urgentCount,
    todayCompletedCount,
    streak: normalizedStreak,
  };
}
