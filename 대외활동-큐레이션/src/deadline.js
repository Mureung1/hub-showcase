// 마감일 유틸. 오늘 기준으로 며칠 남았는지, 지났는지, D-day 라벨.
export function daysLeft(deadline, today = new Date()) {
  const end = new Date(deadline + "T23:59:59");
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((end - start) / 86400000);
}

export function isPast(deadline, today = new Date()) {
  return daysLeft(deadline, today) < 0;
}

export function ddayLabel(deadline, today = new Date()) {
  const n = daysLeft(deadline, today);
  if (n < 0) return "마감";
  if (n === 0) return "오늘 마감";
  return `D-${n}`;
}
