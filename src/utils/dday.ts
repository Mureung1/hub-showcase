/** D-day 뱃지 색상 클래스 — 와이어프레임 ddayClass() */
export function getDdayClass(dday: number): string {
  if (dday <= 7) return 'dday-urgent'
  if (dday <= 14) return 'dday-soon'
  return 'dday-normal'
}
