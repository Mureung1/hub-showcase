import { describe, it, expect } from 'vitest'
import { logicalDateKey, logicalWeekKey } from './logicalDate.js'

describe('logicalDateKey', () => {
  it('오전 4시 이전은 전날로 취급한다', () => {
    expect(logicalDateKey(new Date(2026, 6, 29, 3, 59, 59))).toBe('2026-07-28')
  })

  it('오전 4시 정각부터는 오늘로 취급한다', () => {
    expect(logicalDateKey(new Date(2026, 6, 29, 4, 0, 0))).toBe('2026-07-29')
  })

  it('오전 4시 이후 낮 시간은 그대로 오늘이다', () => {
    expect(logicalDateKey(new Date(2026, 6, 29, 15, 30, 0))).toBe('2026-07-29')
  })

  it('resetHour를 다르게 지정할 수 있다', () => {
    expect(logicalDateKey(new Date(2026, 6, 29, 1, 0, 0), 2)).toBe('2026-07-28')
    expect(logicalDateKey(new Date(2026, 6, 29, 1, 0, 0), 0)).toBe('2026-07-29')
  })

  it('월 경계를 넘어가도 정확하다', () => {
    expect(logicalDateKey(new Date(2026, 6, 1, 1, 0, 0))).toBe('2026-06-30')
  })
})

describe('logicalWeekKey', () => {
  // 2026-07-27은 월요일, 2026-08-03은 다음주 월요일.
  it('월요일 오전 4시 이전은 지난주 월요일을 반환한다', () => {
    expect(logicalWeekKey(new Date(2026, 6, 27, 3, 0, 0))).toBe('2026-07-20')
  })

  it('월요일 오전 4시부터는 이번주 월요일을 반환한다', () => {
    expect(logicalWeekKey(new Date(2026, 6, 27, 4, 0, 0))).toBe('2026-07-27')
  })

  it('주중 아무 날이나 같은 주의 월요일을 반환한다', () => {
    expect(logicalWeekKey(new Date(2026, 6, 29, 12, 0, 0))).toBe('2026-07-27')
    expect(logicalWeekKey(new Date(2026, 6, 31, 23, 0, 0))).toBe('2026-07-27')
  })

  it('일요일은 그 주(월요일 시작)의 월요일을 반환한다', () => {
    expect(logicalWeekKey(new Date(2026, 7, 2, 12, 0, 0))).toBe('2026-07-27')
  })
})
