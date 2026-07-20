import { describe, it, expect } from 'vitest'
import { rankSlots } from './resultRanking.ts'

function slot(date: string, time: string, availableCount: number, preferredCount: number) {
  return { date, time, availableCount, preferredCount }
}

describe('rankSlots', () => {
  it('빈 배열이면 빈 Map을 반환한다', () => {
    expect(rankSlots([]).size).toBe(0)
  })

  it('완전히 동률(같은 조합)이면 같은 등급을 준다', () => {
    const slots = [slot('2026-07-20', '09:00', 3, 1), slot('2026-07-20', '09:30', 3, 1)]
    const levels = rankSlots(slots)

    expect(levels.get('2026-07-20T09:00')).toBe(levels.get('2026-07-20T09:30'))
  })

  it('availableCount가 크면 더 높은 등급을 받는다', () => {
    const slots = [slot('2026-07-20', '09:00', 5, 0), slot('2026-07-20', '09:30', 2, 0)]
    const levels = rankSlots(slots)

    expect(levels.get('2026-07-20T09:00')).toBe(5)
    expect(levels.get('2026-07-20T09:30')).toBe(1)
  })

  it('availableCount가 같으면 preferredCount가 큰 쪽이 더 높은 등급을 받는다', () => {
    const slots = [slot('2026-07-20', '09:00', 4, 3), slot('2026-07-20', '09:30', 4, 1)]
    const levels = rankSlots(slots)

    expect(levels.get('2026-07-20T09:00')).toBe(5)
    expect(levels.get('2026-07-20T09:30')).toBe(1)
  })

  it('순위가 뒤집히지 않는다(가능 인원이 많을수록 등급이 낮아지지 않음)', () => {
    const slots = [
      slot('2026-07-20', '09:00', 5, 0),
      slot('2026-07-20', '09:30', 3, 0),
      slot('2026-07-20', '10:00', 1, 0),
    ]
    const levels = rankSlots(slots)

    expect(levels.get('2026-07-20T09:00')).toBe(5)
    expect(levels.get('2026-07-20T09:30')).toBe(3)
    expect(levels.get('2026-07-20T10:00')).toBe(1)
  })

  it('고유 조합이 하나뿐이면 전부 최고 등급을 받는다', () => {
    const slots = [
      slot('2026-07-20', '09:00', 2, 0),
      slot('2026-07-20', '09:30', 2, 0),
      slot('2026-07-20', '10:00', 2, 0),
    ]
    const levels = rankSlots(slots)

    expect(levels.get('2026-07-20T09:00')).toBe(5)
    expect(levels.get('2026-07-20T09:30')).toBe(5)
    expect(levels.get('2026-07-20T10:00')).toBe(5)
  })

  it('고유 조합이 등급 수(5단계)보다 많으면 여러 순위가 같은 등급을 공유한다', () => {
    const slots = [7, 6, 5, 4, 3, 2, 1].map((count, i) => slot('2026-07-20', `0${i}:00`, count, 0))
    const levels = rankSlots(slots)

    expect([...levels.values()]).toEqual([5, 4, 4, 3, 2, 2, 1])
  })
})
