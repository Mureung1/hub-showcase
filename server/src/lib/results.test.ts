import { describe, it, expect } from 'vitest'
import { aggregateSlotCounts, countCompletedParticipants, type ResponseRow } from './results.js'

function row(overrides: Partial<ResponseRow>): ResponseRow {
  return { participant_id: 'p1', date: '2026-07-20', time: '09:00:00', is_preferred: false, ...overrides }
}

describe('aggregateSlotCounts', () => {
  it('같은 슬롯에 여러 명이 응답하면 availableCount를 합산한다', () => {
    const rows = [row({ participant_id: 'p1' }), row({ participant_id: 'p2' }), row({ participant_id: 'p3' })]

    expect(aggregateSlotCounts(rows)).toEqual([
      { date: '2026-07-20', time: '09:00', availableCount: 3, preferredCount: 0 },
    ])
  })

  it('is_preferred가 섞여 있으면 preferredCount만 별도로 집계한다', () => {
    const rows = [
      row({ participant_id: 'p1', is_preferred: true }),
      row({ participant_id: 'p2', is_preferred: false }),
      row({ participant_id: 'p3', is_preferred: true }),
    ]

    expect(aggregateSlotCounts(rows)).toEqual([
      { date: '2026-07-20', time: '09:00', availableCount: 3, preferredCount: 2 },
    ])
  })

  it('서로 다른 슬롯은 각각 따로 집계한다', () => {
    const rows = [
      row({ participant_id: 'p1', time: '09:00:00' }),
      row({ participant_id: 'p1', time: '09:30:00' }),
      row({ participant_id: 'p2', date: '2026-07-21', time: '09:00:00' }),
    ]

    expect(aggregateSlotCounts(rows)).toEqual([
      { date: '2026-07-20', time: '09:00', availableCount: 1, preferredCount: 0 },
      { date: '2026-07-20', time: '09:30', availableCount: 1, preferredCount: 0 },
      { date: '2026-07-21', time: '09:00', availableCount: 1, preferredCount: 0 },
    ])
  })

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(aggregateSlotCounts([])).toEqual([])
  })
})

describe('countCompletedParticipants', () => {
  it('한 참여자가 여러 슬롯을 응답해도 완료 인원은 1명으로 센다', () => {
    const rows = [
      row({ participant_id: 'p1', time: '09:00:00' }),
      row({ participant_id: 'p1', time: '09:30:00' }),
      row({ participant_id: 'p1', time: '10:00:00' }),
    ]

    expect(countCompletedParticipants(rows)).toBe(1)
  })

  it('서로 다른 참여자 수만큼 센다', () => {
    const rows = [row({ participant_id: 'p1' }), row({ participant_id: 'p2' }), row({ participant_id: 'p3' })]

    expect(countCompletedParticipants(rows)).toBe(3)
  })

  it('빈 배열이면 0을 반환한다', () => {
    expect(countCompletedParticipants([])).toBe(0)
  })
})
