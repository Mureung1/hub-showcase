const DAY_MS = 24 * 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

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

function toKstDayOrdinal(timestamp) {
  return Math.floor((timestamp + KST_OFFSET_MS) / DAY_MS);
}

function getKstDateParts(timestamp) {
  const shifted = new Date(timestamp + KST_OFFSET_MS);
  return {
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

export function getTaskDeadlinePresentation(deadline, now) {
  const nowTimestamp = toTimestamp(now);
  if (nowTimestamp === null) {
    throw new TypeError("now는 유효한 날짜여야 합니다.");
  }

  const deadlineTimestamp = toTimestamp(deadline);
  if (deadlineTimestamp === null) return null;

  if (deadlineTimestamp < nowTimestamp) {
    return {
      kind: "overdue",
      desktopLabel: "기한 초과",
      mobileLabel: "기한 초과",
    };
  }

  const deadlineDay = toKstDayOrdinal(deadlineTimestamp);
  const today = toKstDayOrdinal(nowTimestamp);

  if (deadlineDay === today) {
    return {
      kind: "urgent",
      desktopLabel: "오늘 마감",
      mobileLabel: "오늘 마감",
    };
  }

  if (deadlineDay === today + 1) {
    return {
      kind: "urgent",
      desktopLabel: "내일 마감",
      mobileLabel: "내일 마감",
    };
  }

  const { month, day } = getKstDateParts(deadlineTimestamp);
  const daysLeft = deadlineDay - today;

  return {
    kind: "standard",
    desktopLabel: `${month}월 ${day}일 · D-${daysLeft}`,
    mobileLabel: `${month}/${day} · D-${daysLeft}`,
  };
}
