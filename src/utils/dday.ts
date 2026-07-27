import { NO_DEADLINE_DDAY, type Subsidy } from '@hub/shared'

/** D-day 뱃지 색상 클래스 — 와이어프레임 ddayClass() */
export function getDdayClass(dday: number): string {
  if (dday === NO_DEADLINE_DDAY) return 'dday-flexible'
  if (dday <= 7) return 'dday-urgent'
  if (dday <= 14) return 'dday-soon'
  return 'dday-normal'
}

/** D-day 뱃지 라벨 — 상시/소진시까지 공고는 원문 마감 텍스트를 보여준다 (이슈 #82) */
export function getDdayLabel(subsidy: Pick<Subsidy, 'dday' | 'deadline'>): string {
  if (subsidy.dday === NO_DEADLINE_DDAY) return subsidy.deadline
  return `D-${subsidy.dday}`
}
