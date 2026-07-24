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

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 주어진 날짜가 속한 주의 월요일을 'YYYY-MM-DD'로 반환
export function getMonday(baseDate = new Date()) {
  // 'YYYY-MM-DD' 문자열은 그냥 new Date()에 넘기면 UTC 자정으로 해석돼서
  // 타임존에 따라 하루 밀릴 수 있어 로컬 자정으로 고정해서 파싱한다
  const d = typeof baseDate === 'string' ? new Date(baseDate + 'T00:00:00') : new Date(baseDate);
  const day = d.getDay(); // 0(일)~6(토)
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function addDaysToDateString(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function formatMonthDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${m}.${day}`;
}

export function getWeekdayLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
}

export function formatMonthDayWeekday(dateStr) {
  return `${formatMonthDay(dateStr)}(${getWeekdayLabel(dateStr)})`;
}

export function formatMonthDaySlash(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatMonthDaySlashWeekday(dateStr) {
  return `${formatMonthDaySlash(dateStr)}(${getWeekdayLabel(dateStr)})`;
}

export function daysBetween(dateStrA, dateStrB) {
  const a = new Date(dateStrA + 'T00:00:00');
  const b = new Date(dateStrB + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

// 프로젝트 기간(startDate~endDate)을 월요일 기준 주 단위로 나눴을 때
// 전체 주차 수와, "오늘" 기준으로 처음에 보여줄 주차 인덱스(0부터)를 계산.
// startDate/endDate가 없으면 오늘이 속한 주 하나만 있는 것으로 취급(1주차, 화살표 둘 다 비활성화).
export function getWeekPlan(startDate, endDate, today = getTodayDateString()) {
  const hasRange = Boolean(startDate && endDate);
  const projectStartMonday = getMonday(hasRange ? startDate : today);
  const rangeEnd = hasRange ? endDate : today;

  const totalDays = daysBetween(projectStartMonday, rangeEnd) + 1;
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  let initialWeekIndex = 0;
  if (hasRange && today >= startDate && today <= endDate) {
    const todayMonday = getMonday(today);
    initialWeekIndex = Math.floor(daysBetween(projectStartMonday, todayMonday) / 7);
  }
  initialWeekIndex = Math.min(Math.max(initialWeekIndex, 0), totalWeeks - 1);

  return { projectStartMonday, totalWeeks, initialWeekIndex };
}
