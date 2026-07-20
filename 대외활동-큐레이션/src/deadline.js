// 마감일 유틸. 오늘 기준으로 며칠 남았는지, 지났는지, D-day 라벨.
export function daysLeft(deadline, today = new Date()) {
  if (!deadline) return Infinity; // 마감 없음(상시) - 정렬에서 가장 여유있게 취급, 마감 지남 아님
  const end = new Date(deadline + "T23:59:59");
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((end - start) / 86400000);
}

export function isPast(deadline, today = new Date()) {
  return daysLeft(deadline, today) < 0;
}

export function ddayLabel(deadline, today = new Date()) {
  if (!deadline) return "상시";
  const n = daysLeft(deadline, today);
  if (n < 0) return "마감";
  if (n === 0) return "오늘 마감";
  return `D-${n}`;
}
