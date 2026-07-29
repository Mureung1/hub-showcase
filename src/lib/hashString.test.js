import { describe, it, expect } from 'vitest'
import { hashString } from './hashString.js'

describe('hashString', () => {
  it('같은 문자열은 항상 같은 값을 반환한다', () => {
    expect(hashString('user1:2026-07-29')).toBe(hashString('user1:2026-07-29'))
  })

  it('다른 문자열은 대체로 다른 값을 반환한다', () => {
    expect(hashString('user1:2026-07-29')).not.toBe(hashString('user1:2026-07-30'))
    expect(hashString('user1')).not.toBe(hashString('user2'))
  })

  it('항상 음이 아닌 32bit 정수를 반환한다', () => {
    for (const s of ['', 'a', 'guest:2026-07-29:daily-all-clear', '한글도 포함']) {
      const h = hashString(s)
      expect(Number.isInteger(h)).toBe(true)
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0xffffffff)
    }
  })

  it('빈 문자열은 0을 반환한다', () => {
    expect(hashString('')).toBe(0)
  })
})
