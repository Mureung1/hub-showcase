/* 날짜 유틸 — 'YYYY-MM-DD' 문자열은 로컬 자정 기준으로 파싱한다 (UTC 파싱으로 인한 하루 밀림 방지) */

export function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function diffDays(from, to) {
  const ms = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    - new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round(ms / 86400000);
}

export function formatKorean(dateStr) {
  const d = parseDate(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
