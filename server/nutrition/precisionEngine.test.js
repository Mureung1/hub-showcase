// precisionEngine.js 빠른 단위 테스트 — 실제 OpenRouter를 호출하지 않는다(options.geminiEstimate로
// 목 주입). 실제 20샘플 정확도 측정(진짜 Gemini 호출, 유료)은 별도 스크립트
// scripts/precisionEngineAccuracy.js를 수동으로 돌려서 확인한다 — npm test에 넣으면 돌릴 때마다
// 과금이 발생하고 네트워크에 좌우돼 CI에 적합하지 않다.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeTray, PORTION_FACTORS, _clearCacheForTest } from './precisionEngine.js'

beforeEach(() => {
  _clearCacheForTest()
})

describe('analyzeTray', () => {
  it('DB에 매칭되는 메뉴만 있으면 Gemini를 호출하지 않는다', async () => {
    const geminiEstimate = vi.fn()
    const result = await analyzeTray(
      { menus: ['잡곡밥', '미역국'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: false, useCache: false },
    )

    expect(geminiEstimate).not.toHaveBeenCalled()
    expect(result.items).toHaveLength(2)
    expect(result.items.every((i) => i.matched)).toBe(true)
    expect(result.confidence).toBe('high')
  })

  it('schoolType 계수가 중량(→영양값)에 그대로 반영된다', async () => {
    const base = { menus: ['잡곡밥'], mealType: 'lunch' }
    const elementary = await analyzeTray({ ...base, schoolType: 'elementary' }, { calibrate: false, useCache: false })
    const high = await analyzeTray({ ...base, schoolType: 'high' }, { calibrate: false, useCache: false })

    expect(elementary.items[0].weight).toBeLessThan(high.items[0].weight)
    // 그램 단위 반올림이 끼어들어 완전히 정확하진 않다(예: 158g vs 221g) — 소수 1자리(0.05 오차)
    // 이내로만 검증한다.
    const expectedRatio = PORTION_FACTORS.high / PORTION_FACTORS.elementary
    const actualRatio = high.items[0].nutrients.calories / elementary.items[0].nutrients.calories
    expect(actualRatio).toBeCloseTo(expectedRatio, 1)
  })

  it('매칭 실패 항목만 모아 Gemini를 1회만 호출한다(항목별 호출 금지)', async () => {
    const geminiEstimate = vi.fn().mockResolvedValue({
      items: [{ name: '창작메뉴XYZ', weight: 120, calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 }],
      total: { calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 },
    })

    const result = await analyzeTray(
      { menus: ['잡곡밥', '창작메뉴XYZ'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: false, useCache: false },
    )

    expect(geminiEstimate).toHaveBeenCalledTimes(1)
    const failedItem = result.items.find((i) => i.name === '창작메뉴XYZ')
    expect(failedItem.matched).toBe(false)
    expect(failedItem.nutrients.calories).toBe(300)
  })

  it('officialTotals가 있으면 합계 칼로리가 정확히 그 값과 일치한다(캘리브레이션)', async () => {
    const result = await analyzeTray(
      { menus: ['잡곡밥', '미역국'], mealType: 'lunch', schoolType: 'high', officialTotals: { calories: 999 } },
      { calibrate: true, useCache: false },
    )

    expect(result.total.calories).toBe(999)
    expect(result.method).toBe('official')
    expect(result.confidence).toBe('high')
  })

  it('calibrate=false면 officialTotals가 있어도 원본 합계를 그대로 반환한다(정확도 테스트용)', async () => {
    const result = await analyzeTray(
      { menus: ['잡곡밥'], mealType: 'lunch', schoolType: 'high', officialTotals: { calories: 9999 } },
      { calibrate: false, useCache: false },
    )

    expect(result.total.calories).not.toBe(9999)
    expect(result.method).toBe('estimated')
  })

  it('officialTotals 없이 비상식적인 총 칼로리면 전체 항목을 한 번 더 Gemini로 교차검증한다', async () => {
    // "미역국" 1개만 담긴 트레이는 300kcal 미만(sanity 하한 미달)이라 교차검증이 걸려야 한다.
    const geminiEstimate = vi.fn().mockResolvedValue({
      items: [{ name: '미역국', weight: 400, calories: 350, protein: 8, carbs: 40, fat: 8, sodium: 900, fiber: 3 }],
      total: { calories: 350, protein: 8, carbs: 40, fat: 8, sodium: 900, fiber: 3 },
    })

    const result = await analyzeTray(
      { menus: ['미역국'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: true, useCache: false },
    )

    expect(geminiEstimate).toHaveBeenCalledTimes(1)
    expect(geminiEstimate.mock.calls[0][0]).toEqual([{ name: '미역국', role: 'soup', weight: 400 }])
    expect(result.method).toBe('llm_reviewed')
  })

  it('같은 입력이면 캐시로 같은 결과를 반환하고 Gemini를 다시 호출하지 않는다(결정성)', async () => {
    const geminiEstimate = vi.fn().mockResolvedValue({
      items: [{ name: '창작메뉴XYZ', weight: 120, calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 }],
      total: { calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 },
    })
    const input = { menus: ['잡곡밥', '창작메뉴XYZ'], mealType: 'lunch', schoolType: 'univ' }

    const first = await analyzeTray(input, { geminiEstimate })
    const second = await analyzeTray(input, { geminiEstimate })

    expect(geminiEstimate).toHaveBeenCalledTimes(1)
    expect(second).toEqual(first)
  })

  it('officialTotals가 다르면 메뉴 조합이 같아도 캐시를 공유하지 않는다', async () => {
    const first = await analyzeTray(
      { menus: ['잡곡밥'], mealType: 'lunch', schoolType: 'high', officialTotals: { calories: 500 } },
      {},
    )
    const second = await analyzeTray(
      { menus: ['잡곡밥'], mealType: 'lunch', schoolType: 'high', officialTotals: { calories: 800 } },
      {},
    )

    expect(first.total.calories).toBe(500)
    expect(second.total.calories).toBe(800)
  })
})
