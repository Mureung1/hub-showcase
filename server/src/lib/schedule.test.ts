import { describe, it, expect } from 'vitest'
import { generateSlots, submitResponseRequestSchema, type ScheduleSlot } from 'shared'

describe('generateSlots', () => {
  it('종료 시각은 exclusive - 09:00~10:00이면 09:00, 09:30 두 슬롯만 생성한다', () => {
    const slots = generateSlots('2026-07-20', '2026-07-20', '09:00', '10:00')
    expect(slots).toEqual([
      { date: '2026-07-20', time: '09:00' },
      { date: '2026-07-20', time: '09:30' },
    ])
  })

  it('월말을 넘어 날짜가 증가한다', () => {
    const slots = generateSlots('2026-01-31', '2026-02-01', '09:00', '09:30')
    expect(slots.map((s) => s.date)).toEqual(['2026-01-31', '2026-02-01'])
  })

  it('연말을 넘어 날짜가 증가한다', () => {
    const slots = generateSlots('2026-12-31', '2027-01-01', '09:00', '09:30')
    expect(slots.map((s) => s.date)).toEqual(['2026-12-31', '2027-01-01'])
  })

  it('윤년의 2월 29일을 포함해서 계산한다', () => {
    const slots = generateSlots('2024-02-28', '2024-03-01', '09:00', '09:30')
    expect(slots.map((s) => s.date)).toEqual(['2024-02-28', '2024-02-29', '2024-03-01'])
  })

  it('시작 날짜가 종료 날짜보다 뒤면 빈 배열을 반환한다', () => {
    expect(generateSlots('2026-07-21', '2026-07-20', '09:00', '10:00')).toEqual([])
  })
})

describe('submitResponseRequestSchema', () => {
  function makeSlots(count: number): ScheduleSlot[] {
    return Array.from({ length: count }, (_, i) => ({ date: '2026-07-20', time: i % 2 === 0 ? '09:00' : '09:30' }))
  }

  it('슬롯 2000개는 통과한다', () => {
    const result = submitResponseRequestSchema.safeParse({ availableSlots: makeSlots(2000), preferredSlots: [] })
    expect(result.success).toBe(true)
  })

  it('슬롯 2001개는 zod 에러가 난다', () => {
    const result = submitResponseRequestSchema.safeParse({ availableSlots: makeSlots(2001), preferredSlots: [] })
    expect(result.success).toBe(false)
  })
})
