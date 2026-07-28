// 트랙 2 §5 — 게스트 저장 경로의 updateMealRecord만 다룬다(나머지 함수는 기존에 커버 없이도 잘
// 동작해온 단순 CRUD라 이번 변경과 무관). localStorage는 jsdom이 실제로 제공한다.
import { describe, it, expect, beforeEach } from 'vitest'
import { addMealRecord, getMeals, updateMealRecord } from './mealStore.js'

const USER_ID = 'guest'
const DATE_KEY = '2026-07-28'

beforeEach(() => {
  localStorage.clear()
})

describe('updateMealRecord', () => {
  it('id가 일치하는 끼니의 items만 통째로 교체한다', () => {
    const record = addMealRecord(USER_ID, DATE_KEY, {
      mealType: 'lunch',
      items: [{ name: '김치찌개', nutrients: { calories: 200 }, source: '추정' }],
    })

    const nextItems = [{ ...record.items[0], nutrients: { calories: 250 }, source: '직접입력' }]
    const updated = updateMealRecord(USER_ID, DATE_KEY, record.id, { items: nextItems })

    expect(updated.items[0].nutrients.calories).toBe(250)
    expect(updated.items[0].source).toBe('직접입력')
    expect(updated.mealType).toBe('lunch') // items 외 필드는 그대로

    const stored = getMeals(USER_ID, DATE_KEY)
    expect(stored.find((r) => r.id === record.id).items[0].nutrients.calories).toBe(250)
  })

  it('id가 일치하는 항목의 id는 그대로 유지된다(addMealRecord처럼 새로 만들지 않음)', () => {
    const record = addMealRecord(USER_ID, DATE_KEY, {
      mealType: 'lunch',
      items: [{ name: '김치찌개', nutrients: { calories: 200 } }],
    })
    const originalItemId = record.items[0].id

    const updated = updateMealRecord(USER_ID, DATE_KEY, record.id, {
      items: [{ ...record.items[0], nutrients: { calories: 250 } }],
    })

    expect(updated.items[0].id).toBe(originalItemId)
  })

  it('없는 mealRecordId면 아무 것도 바꾸지 않고 null을 반환한다', () => {
    addMealRecord(USER_ID, DATE_KEY, { mealType: 'lunch', items: [{ name: '김치찌개', nutrients: { calories: 200 } }] })

    const result = updateMealRecord(USER_ID, DATE_KEY, 'no-such-id', { items: [{ name: 'x', nutrients: { calories: 1 } }] })

    expect(result).toBeNull()
    expect(getMeals(USER_ID, DATE_KEY)).toHaveLength(1)
  })

  it('같은 날짜의 다른 끼니는 건드리지 않는다', () => {
    const a = addMealRecord(USER_ID, DATE_KEY, { mealType: 'breakfast', items: [{ name: '토스트', nutrients: { calories: 100 } }] })
    const b = addMealRecord(USER_ID, DATE_KEY, { mealType: 'lunch', items: [{ name: '김밥', nutrients: { calories: 300 } }] })

    updateMealRecord(USER_ID, DATE_KEY, b.id, { items: [{ ...b.items[0], nutrients: { calories: 350 } }] })

    const stored = getMeals(USER_ID, DATE_KEY)
    expect(stored.find((r) => r.id === a.id).items[0].nutrients.calories).toBe(100)
    expect(stored.find((r) => r.id === b.id).items[0].nutrients.calories).toBe(350)
  })
})
