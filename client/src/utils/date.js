export function getTodayDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDaysUntilDue(dueDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

export function formatDue(value) {
  if (!value) return '마감일 미정';
  const parts = value.split('-');
  if (parts.length !== 3) return '마감일 미정';
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}월 ${day}일`;
}

export function formatDday(dueDateStr) {
  const days = getDaysUntilDue(dueDateStr);
  if (days === 0) return 'D-DAY';
  if (days > 0) return `D-${days}`;
  return `D+${Math.abs(days)}`;
}

// SQLite의 datetime('now')는 UTC라서, 로컬 시각과 정확히 비교하려면 ISO 형식으로 바꿔줘야 함
export function parseUtcDate(sqliteDatetime) {
  return new Date(sqliteDatetime.replace(' ', 'T') + 'Z');
}

export function formatLogTime(changedAt) {
  const date = parseUtcDate(changedAt);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
