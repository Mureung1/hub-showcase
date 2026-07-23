import { describe, it, expect } from 'vitest'
import { getNextBillingInfo } from './MyPageScreen'

describe('getNextBillingInfo', () => {
  it('결제일이 이번 달 안에 남아있으면 이번 달 날짜로 계산한다', () => {
    const today = new Date(2026, 6, 10) // 2026-07-10
    const result = getNextBillingInfo(15, today)

    expect(result.label).toBe('7월 15일')
    expect(result.dday).toBe(5)
  })

  it('결제일이 이미 지났으면 다음 달로 이월한다', () => {
    const today = new Date(2026, 6, 20) // 2026-07-20
    const result = getNextBillingInfo(15, today)

    expect(result.label).toBe('8월 15일')
    expect(result.dday).toBe(26)
  })

  it('오늘이 결제일이면 이월하지 않고 오늘 날짜, D-0으로 계산한다', () => {
    const today = new Date(2026, 6, 15) // 2026-07-15
    const result = getNextBillingInfo(15, today)

    expect(result.label).toBe('7월 15일')
    expect(result.dday).toBe(0)
  })

  it('12월에 결제일이 지났으면 다음 해 1월로 이월한다', () => {
    const today = new Date(2026, 11, 20) // 2026-12-20
    const result = getNextBillingInfo(15, today)

    expect(result.label).toBe('1월 15일')
    expect(result.dday).toBe(26)
  })
})
