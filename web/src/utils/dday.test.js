import { describe, expect, it } from 'vitest'
import { calculateDday } from './dday'

describe('calculateDday', () => {
  it('미래 마감 → D-3', () => {
    expect(
      calculateDday('2026-07-30T12:00:00+09:00', new Date('2026-07-27T09:00:00+09:00')),
    ).toBe('D-3')
  })

  it('오늘 마감 → 오늘 12시 마감', () => {
    expect(
      calculateDday('2026-07-27T12:00:00+09:00', new Date('2026-07-27T09:00:00+09:00')),
    ).toBe('오늘 12시 마감')
  })

  it('마감 지남 → 마감 지남', () => {
    expect(
      calculateDday('2026-07-20T12:00:00+09:00', new Date('2026-07-27T09:00:00+09:00')),
    ).toBe('마감 지남')
  })

  it('deadline 빈 값 → null', () => {
    expect(calculateDday('', new Date('2026-07-27T09:00:00+09:00'))).toBe(null)
  })
})
