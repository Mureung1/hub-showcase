import { describe, it, expect } from 'vitest'
import { todaySummary, qtyByDeal, remainingTime } from './ownerStats.js'

/*
 * 대시보드 집계는 사장님이 보는 숫자의 근거라, 건수/수량 혼동과 상태 분류를 특히 검증한다.
 */

const today = new Date('2026-07-24T12:00:00+09:00')
const iso = (d) => d.toISOString()
const hoursAgo = (h) => iso(new Date(today.getTime() - h * 3600_000))

describe('qtyByDeal', () => {
  it('건수가 아니라 수량으로 합산한다', () => {
    const map = qtyByDeal([
      { dealId: 1, qty: 2, status: 'reserved' },
      { dealId: 1, qty: 3, status: 'reserved' },
      { dealId: 1, qty: 1, status: 'picked' },
    ])
    // 예약 2건이지만 수량은 5개여야 한다
    expect(map[1].reserved).toBe(5)
    expect(map[1].picked).toBe(1)
  })

  it('딜별로 분리하고 만료는 따로 센다', () => {
    const map = qtyByDeal([
      { dealId: 1, qty: 2, status: 'reserved' },
      { dealId: 2, qty: 4, status: 'picked' },
      { dealId: 2, qty: 1, status: 'expired' },
    ])
    expect(map[1]).toEqual({ reserved: 2, picked: 0, expired: 0 })
    expect(map[2]).toEqual({ reserved: 0, picked: 4, expired: 1 })
  })

  it('예약이 없으면 빈 객체', () => {
    expect(qtyByDeal([])).toEqual({})
  })
})

describe('todaySummary', () => {
  const deals = [
    { id: 1, remainingQty: 3, status: 'active' },
    { id: 2, remainingQty: 7, status: 'active' },
    { id: 3, remainingQty: 5, status: 'expired' }, // 만료 딜은 남은 재고에서 빠져야
  ]

  it('오늘 픽업된 수량과 매출만 집계한다', () => {
    const reservations = [
      { dealId: 1, qty: 2, salePrice: 2000, status: 'picked', createdAt: hoursAgo(1) },
      { dealId: 2, qty: 1, salePrice: 3000, status: 'picked', createdAt: hoursAgo(2) },
      { dealId: 1, qty: 5, salePrice: 2000, status: 'picked', createdAt: hoursAgo(30) }, // 어제
    ]
    const s = todaySummary(reservations, deals, today)
    expect(s.pickedQty).toBe(3) // 어제 5개는 제외
    expect(s.revenue).toBe(2 * 2000 + 1 * 3000)
  })

  it('예약중·만료는 매출에 포함하지 않는다', () => {
    const reservations = [
      { dealId: 1, qty: 4, salePrice: 2000, status: 'reserved', createdAt: hoursAgo(1) },
      { dealId: 1, qty: 3, salePrice: 2000, status: 'expired', createdAt: hoursAgo(1) },
    ]
    const s = todaySummary(reservations, deals, today)
    expect(s.pickedQty).toBe(0)
    expect(s.revenue).toBe(0)
  })

  it('픽업 대기는 건수, 남은 재고는 활성 딜만 합산', () => {
    const reservations = [
      { dealId: 1, qty: 2, salePrice: 2000, status: 'reserved', createdAt: hoursAgo(1) },
      { dealId: 2, qty: 1, salePrice: 3000, status: 'reserved', createdAt: hoursAgo(1) },
    ]
    const s = todaySummary(reservations, deals, today)
    expect(s.waitingCount).toBe(2) // 수량 3이 아니라 건수 2
    expect(s.remainingQty).toBe(10) // 3 + 7, 만료 딜 5는 제외
  })
})

describe('remainingTime', () => {
  const at = (min) => iso(new Date(today.getTime() + min * 60_000))

  it('한 시간 이상이면 시간·분으로 표시', () => {
    expect(remainingTime(at(83), today)).toMatchObject({
      text: '1시간 23분 남음',
      urgent: false,
      expired: false,
    })
  })

  it('30분 이하이면 urgent', () => {
    expect(remainingTime(at(30), today).urgent).toBe(true)
    expect(remainingTime(at(31), today).urgent).toBe(false)
  })

  it('마감이 지났으면 expired', () => {
    expect(remainingTime(at(-1), today)).toMatchObject({ text: '마감', expired: true })
    expect(remainingTime(at(0), today).expired).toBe(true)
  })
})
