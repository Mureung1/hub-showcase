import { describe, expect, it } from 'vitest'
import { kstToday } from './kst.js'

describe('kstToday', () => {
  it('KST 자정 직후(UTC 15:00, 실행 서버 TZ와 무관) 인스턴트는 그 다음 KST 날짜를 반환한다', () => {
    // 2026-07-26T15:00:00Z = 2026-07-27 00:00 KST — 실행 서버가 UTC 기준으로 "오늘"을
    // 계산하면 07-26으로 하루 뒤처지는 게 이슈 #87의 버그였다.
    const now = new Date(Date.UTC(2026, 6, 26, 15, 0, 0))
    const result = kstToday(now)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(6) // 0-indexed = 7월
    expect(result.getDate()).toBe(27)
  })

  it('KST 자정 직전(UTC 14:59) 인스턴트는 그 전날 KST 날짜를 반환한다', () => {
    const now = new Date(Date.UTC(2026, 6, 26, 14, 59, 0))
    const result = kstToday(now)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(6)
    expect(result.getDate()).toBe(26)
  })

  it('UTC 정오처럼 KST 날짜 경계와 먼 시각도 올바른 KST 날짜를 반환한다', () => {
    // 2026-07-26T12:00:00Z = 2026-07-26 21:00 KST
    const now = new Date(Date.UTC(2026, 6, 26, 12, 0, 0))
    const result = kstToday(now)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(6)
    expect(result.getDate()).toBe(26)
  })
})
