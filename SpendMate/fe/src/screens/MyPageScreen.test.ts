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

  it('결제일이 31일인데 이번 달이 30일까지밖에 없으면 그 달의 마지막 날로 계산한다', () => {
    const today = new Date(2026, 3, 5) // 2026-04-05 (4월은 30일까지)
    const result = getNextBillingInfo(31, today)

    expect(result.label).toBe('4월 30일')
    expect(result.dday).toBe(25)
  })

  it('이번 달엔 결제일이 이미 지났고, 이월할 다음 달이 더 짧으면 그 달의 마지막 날로 계산한다', () => {
    const today = new Date(2026, 0, 31) // 2026-01-31, 결제일 30일은 이미 지남
    const result = getNextBillingInfo(30, today)

    expect(result.label).toBe('2월 28일') // 2026년은 평년이라 2월은 28일까지
    expect(result.dday).toBe(28)
  })
})
