export function formatKoreanClockTime(date: Date) {
  return `${padTimePart(date.getHours())}:${padTimePart(date.getMinutes())}`;
}

export function formatRemainingUntilEndOfDay(now: Date) {
  const deadline = new Date(now);
  deadline.setHours(23, 59, 59, 999);
  const diff = Math.max(0, deadline.getTime() - now.getTime());
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return [hours, minutes, seconds].map(padTimePart).join(":");
}

function padTimePart(value: number) {
  return String(value).padStart(2, "0");
}
