import { describe, expect, it } from 'vitest'
import { getKstDateString, moveDateToMonth, shiftMonth } from './date'

describe('date utilities', () => {
  it('주어진 시각을 Asia/Seoul 날짜 문자열로 변환한다', () => {
    expect(getKstDateString(new Date('2026-07-24T16:30:00Z'))).toBe('2026-07-25')
  })

  it('연도 경계를 넘어 표시 월을 이동한다', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('대상 월에 같은 날짜가 없으면 마지막 날로 보정한다', () => {
    expect(moveDateToMonth('2026-03-31', '2026-02')).toBe('2026-02-28')
    expect(moveDateToMonth('2026-03-15', '2026-02')).toBe('2026-02-15')
  })
})
