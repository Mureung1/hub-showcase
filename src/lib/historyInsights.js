const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toTimestamp(value) {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function toKstDayOrdinal(value) {
  const timestamp = toTimestamp(value);
  return timestamp === null
    ? null
    : Math.floor((timestamp + KST_OFFSET_MS) / DAY_MS);
}

function dayParts(dayOrdinal) {
  const date = new Date(dayOrdinal * DAY_MS);
  return {
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    weekday: date.getUTCDay(),
  };
}

export function formatFocusDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0분";
  if (totalSeconds < 60) return "1분 미만";

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

export function formatAverageEntryLevel(averageEntryLevel) {
  if (averageEntryLevel === null) return "—";
  const rounded = Math.round(averageEntryLevel * 10) / 10;
  return `Lv${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}`;
}

export function calculateHistoryInsights(historyItems, now) {
  const nowTimestamp = toTimestamp(now);
  const todayOrdinal = toKstDayOrdinal(now);
  if (nowTimestamp === null || todayOrdinal === null) {
    throw new TypeError("now는 유효한 날짜여야 합니다.");
  }

  const todayWeekday = dayParts(todayOrdinal).weekday;
  const daysSinceMonday = (todayWeekday + 6) % 7;
  const weekStartOrdinal = todayOrdinal - daysSinceMonday;
  const recentStartOrdinal = todayOrdinal - 6;

  const recentCounts = new Map();
  const weeklyItems = [];

  for (const item of historyItems) {
    const completedTimestamp = toTimestamp(item.completedAt);
    const completedDay = toKstDayOrdinal(item.completedAt);
    if (
      completedTimestamp === null ||
      completedDay === null ||
      completedTimestamp > nowTimestamp
    ) {
      continue;
    }

    if (completedDay >= recentStartOrdinal && completedDay <= todayOrdinal) {
      recentCounts.set(completedDay, (recentCounts.get(completedDay) ?? 0) + 1);
    }
    if (completedDay >= weekStartOrdinal && completedDay <= todayOrdinal) {
      weeklyItems.push(item);
    }
  }

  const weeklyFocusSeconds = weeklyItems.reduce((total, item) => {
    const duration = item.durationSeconds;
    return typeof duration === "number" &&
      Number.isFinite(duration) &&
      duration >= 0
      ? total + duration
      : total;
  }, 0);

  const validEntryLevels = weeklyItems
    .map((item) => item.entryLevel)
    .filter(
      (level) => Number.isInteger(level) && level >= 1 && level <= 4,
    );
  const averageEntryLevel =
    validEntryLevels.length === 0
      ? null
      : validEntryLevels.reduce((sum, level) => sum + level, 0) /
        validEntryLevels.length;

  const recentDays = Array.from({ length: 7 }, (_, index) => {
    const dayOrdinal = recentStartOrdinal + index;
    const parts = dayParts(dayOrdinal);
    return {
      dayOrdinal,
      count: recentCounts.get(dayOrdinal) ?? 0,
      weekdayLabel: WEEKDAY_LABELS[parts.weekday],
      dateLabel: `${parts.month}월 ${parts.day}일`,
      isToday: dayOrdinal === todayOrdinal,
    };
  });
  const maxCount = Math.max(0, ...recentDays.map((day) => day.count));

  return {
    weeklyCompletedCount: weeklyItems.length,
    weeklyFocusSeconds,
    averageEntryLevel,
    recentDays: recentDays.map((day) => ({
      ...day,
      ratio: maxCount === 0 ? 0 : day.count / maxCount,
    })),
  };
}
