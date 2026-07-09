/** 22.5, 26, 5.5 같은 소수 시각값을 "22:30", "02:00", "05:30" 형태로 바꾼다 (24시 넘어가면 다음날로 wrap) */
export function formatHourValue(hours: number): string {
  const wrapped = ((hours % 24) + 24) % 24;
  const h = Math.floor(wrapped);
  const m = Math.round((wrapped - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
