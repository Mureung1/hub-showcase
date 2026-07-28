const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKstDayOrdinal(date: Date): number | null {
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.floor((timestamp + KST_OFFSET_MS) / DAY_MS);
}

export function calculateDateStreak(
  doneOccurredAtList: Date[],
  now: Date,
): number {
  const today = toKstDayOrdinal(now);
  if (today === null) return 0;

  const completedDays = [
    ...new Set(
      doneOccurredAtList
        .map(toKstDayOrdinal)
        .filter(
          (day): day is number => day !== null && day <= today,
        ),
    ),
  ].sort((left, right) => right - left);

  const latestCompletedDay = completedDays[0];
  if (
    latestCompletedDay === undefined ||
    (latestCompletedDay !== today && latestCompletedDay !== today - 1)
  ) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < completedDays.length; index += 1) {
    if (completedDays[index] !== latestCompletedDay - streak) break;
    streak += 1;
  }
  return streak;
}
