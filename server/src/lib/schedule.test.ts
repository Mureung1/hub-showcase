import { describe, it, expect } from 'vitest'
import { generateSlots, submitResponseRequestSchema, type ScheduleSlot } from 'shared'

describe('generateSlots', () => {
  it('종료 시각도 포함해서 09:00~10:00이면 09:00, 09:30, 10:00 세 슬롯을 생성한다', () => {
    const slots = generateSlots('2026-07-20', '2026-07-20', '09:00', '10:00')
    expect(slots).toEqual([
      { date: '2026-07-20', time: '09:00' },
      { date: '2026-07-20', time: '09:30' },
      { date: '2026-07-20', time: '10:00' },
    ])
  })

  // claude: timeStart/timeEnd를 같은 값(09:00)으로 둬서 하루당 슬롯이 정확히 1개만 나오게 한다 - 이 테스트들은
  // 날짜 경계(월말/연말/윤년) 통과 여부만 확인하는 게 목적이라, 종료 시각 포함 여부(위 테스트)와는 무관하게 유지한다.
  it('월말을 넘어 날짜가 증가한다', () => {
    const slots = generateSlots('2026-01-31', '2026-02-01', '09:00', '09:00')
    expect(slots.map((s) => s.date)).toEqual(['2026-01-31', '2026-02-01'])
  })

  it('연말을 넘어 날짜가 증가한다', () => {
    const slots = generateSlots('2026-12-31', '2027-01-01', '09:00', '09:00')
    expect(slots.map((s) => s.date)).toEqual(['2026-12-31', '2027-01-01'])
  })

  it('윤년의 2월 29일을 포함해서 계산한다', () => {
    const slots = generateSlots('2024-02-28', '2024-03-01', '09:00', '09:00')
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
