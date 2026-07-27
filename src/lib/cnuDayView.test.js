import { describe, it, expect } from 'vitest'
import { buildDaySlots, isDayEmpty } from './cnuDayView.js'

const OPEN_SLOT = { status: 'open', price: 6000, note: null, menus: [{ name: '비빔밥', allergyCodes: [], estimated: true }] }
const CLOSED_SLOT = { status: 'closed', price: null, note: null, menus: [] }
const SUSPENDED_SLOT = { status: 'suspended', price: null, note: '운영중단(내부공사)', menus: [] }
const UNKNOWN_SLOT = { status: 'unknown', price: null, note: '알 수 없는 형식', menus: [] }

describe('buildDaySlots', () => {
  it('조식→중식→석식 순서로 항상 3개를 반환한다', () => {
    const meals = {
      breakfast: { student: CLOSED_SLOT, staff: CLOSED_SLOT },
      lunch: { student: OPEN_SLOT, staff: CLOSED_SLOT },
      dinner: { student: CLOSED_SLOT, staff: CLOSED_SLOT },
    }
    const slots = buildDaySlots(meals, 'student')
    expect(slots.map((s) => s.key)).toEqual(['breakfast', 'lunch', 'dinner'])
    expect(slots[1].slot).toBe(OPEN_SLOT)
  })

  it('student/staff 트랙을 정확히 골라온다', () => {
    const meals = { breakfast: null, lunch: { student: OPEN_SLOT, staff: SUSPENDED_SLOT }, dinner: null }
    expect(buildDaySlots(meals, 'student')[1].slot).toBe(OPEN_SLOT)
    expect(buildDaySlots(meals, 'staff')[1].slot).toBe(SUSPENDED_SLOT)
  })

  it('끼니 데이터 자체가 없으면(null) slot도 null — 화면이 안전하게 빈 상태로 처리할 수 있게', () => {
    const slots = buildDaySlots({ breakfast: null, lunch: null, dinner: null }, 'student')
    expect(slots.every((s) => s.slot === null)).toBe(true)
  })
})

describe('isDayEmpty', () => {
  it('전부 closed/null이면 빈 하루', () => {
    const slots = buildDaySlots({ breakfast: null, lunch: { student: CLOSED_SLOT }, dinner: { student: CLOSED_SLOT } }, 'student')
    expect(isDayEmpty(slots)).toBe(true)
  })

  it('하나라도 open이면 빈 하루가 아니다', () => {
    const slots = buildDaySlots({ breakfast: { student: CLOSED_SLOT }, lunch: { student: OPEN_SLOT }, dinner: { student: CLOSED_SLOT } }, 'student')
    expect(isDayEmpty(slots)).toBe(false)
  })

  it('suspended는 보여줄 실질 정보(사유)가 있으므로 빈 하루가 아니다', () => {
    const slots = buildDaySlots({ breakfast: { student: CLOSED_SLOT }, lunch: { student: SUSPENDED_SLOT }, dinner: { student: CLOSED_SLOT } }, 'student')
    expect(isDayEmpty(slots)).toBe(false)
  })

  it('unknown뿐이면(원문만 있고 실질 메뉴 없음) 빈 하루로 취급', () => {
    const slots = buildDaySlots({ breakfast: { student: UNKNOWN_SLOT }, lunch: { student: CLOSED_SLOT }, dinner: null }, 'student')
    expect(isDayEmpty(slots)).toBe(true)
  })
})
