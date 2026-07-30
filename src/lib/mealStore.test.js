// 트랙 2 §5 — 게스트 저장 경로의 updateMealRecord만 다룬다(나머지 함수는 기존에 커버 없이도 잘
// 동작해온 단순 CRUD라 이번 변경과 무관). localStorage는 jsdom이 실제로 제공한다.
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { addMealRecord, getMeals, removeMealRecord, updateMealRecord } from './mealStore.js'

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

// localStorage 용량 초과(QuotaExceededError 등)를 흉내내 storage.js의 set()이 false를 반환하는
// 상황을 재현한다. 이전엔 이 경우를 확인 없이 무시해 "저장 성공"으로 보이는 결과를 그대로 돌려줬다
// (실제로는 아무것도 저장 안 됨) — 이제는 명시적으로 던져 호출부의 기존 에러 토스트로 이어지게 한다.
describe('저장 공간 부족 시(storage.js set() 실패)', () => {
  let setItemSpy

  beforeEach(() => {
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
  })

  afterEach(() => {
    setItemSpy.mockRestore()
  })

  it('addMealRecord는 조용히 성공한 척하지 않고 에러를 던진다', () => {
    expect(() =>
      addMealRecord(USER_ID, DATE_KEY, { mealType: 'lunch', items: [{ name: '김치찌개', nutrients: { calories: 200 } }] }),
    ).toThrow('저장 공간이 가득 찼어요')
  })

  it('updateMealRecord도 에러를 던진다', () => {
    setItemSpy.mockRestore() // 먼저 정상 저장으로 레코드를 하나 만들어야 한다
    const record = addMealRecord(USER_ID, DATE_KEY, {
      mealType: 'lunch',
      items: [{ name: '김치찌개', nutrients: { calories: 200 } }],
    })
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() =>
      updateMealRecord(USER_ID, DATE_KEY, record.id, { items: [{ ...record.items[0], nutrients: { calories: 300 } }] }),
    ).toThrow('저장 공간이 가득 찼어요')
  })

  it('removeMealRecord도(남은 항목이 있어 set()을 타는 경우) 에러를 던진다', () => {
    setItemSpy.mockRestore()
    const a = addMealRecord(USER_ID, DATE_KEY, { mealType: 'breakfast', items: [{ name: '토스트', nutrients: { calories: 100 } }] })
    addMealRecord(USER_ID, DATE_KEY, { mealType: 'lunch', items: [{ name: '김밥', nutrients: { calories: 300 } }] })
    setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => removeMealRecord(USER_ID, DATE_KEY, a.id)).toThrow('저장 공간이 가득 찼어요')
  })
})

// 안정성 점검(Phase B) — 저장된 배열 안에 손상된(null/undefined) 항목이 섞여 있어도 그 날짜 전체를
// 못 읽는 크래시로 이어지지 않아야 한다.
describe('getMeals — 손상된 항목 방어', () => {
  it('배열 안에 null/undefined 항목이 섞여 있어도 나머지는 정상적으로 읽힌다', () => {
    const good = addMealRecord(USER_ID, DATE_KEY, {
      mealType: 'lunch',
      items: [{ name: '김치찌개', nutrients: { calories: 200 } }],
    })
    const stored = JSON.parse(localStorage.getItem(`cjmt:meals:${USER_ID}:${DATE_KEY}`))
    localStorage.setItem(`cjmt:meals:${USER_ID}:${DATE_KEY}`, JSON.stringify([...stored, null, undefined]))

    expect(() => getMeals(USER_ID, DATE_KEY)).not.toThrow()
    const result = getMeals(USER_ID, DATE_KEY)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(good.id)
  })
})
