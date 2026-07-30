// precisionEngine.js 빠른 단위 테스트 — 실제 OpenRouter를 호출하지 않는다(options.geminiEstimate로
// 목 주입). 실제 20샘플 정확도 측정(진짜 Gemini 호출, 유료)은 별도 스크립트
// scripts/precisionEngineAccuracy.js를 수동으로 돌려서 확인한다 — npm test에 넣으면 돌릴 때마다
// 과금이 발생하고 네트워크에 좌우돼 CI에 적합하지 않다.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { analyzeTray, PORTION_FACTORS, _clearCacheForTest } from './precisionEngine.js'
import { NUTRITION_SOURCE } from '../../src/lib/nutrition.js'

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

  // 트랙 2 §2 — confidence/matchType은 이제 내부 값이 아니라 클라이언트(ConfidenceBadge,
  // AnalysisResultCard의 항목별 칩)가 그대로 그리는 UI 계약이다. 값의 집합이 바뀌면 화면에 아무
  // 배지도 안 뜨는 조용한 회귀가 생기므로 여기서 못 박아둔다.
  it('confidence/matchType이 클라이언트가 아는 값 집합 안에서만 나온다(UI 계약)', async () => {
    const result = await analyzeTray(
      { menus: ['잡곡밥', '미역국'], mealType: 'lunch', schoolType: 'univ' },
      { calibrate: false, useCache: false },
    )

    expect(['high', 'medium', 'low']).toContain(result.confidence)
    for (const item of result.items) {
      expect([null, 'exact', 'alias', 'partial', 'fuzzy']).toContain(item.matchType)
    }
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

  it('메뉴 2개 이상이고 officialTotals 없이 비상식적인 총 칼로리면 전체 항목을 한 번 더 Gemini로 교차검증한다', async () => {
    // "미역국+배추김치" 트레이는 합계 43.2kcal로 300kcal 미만(sanity 하한 미달)이라 교차검증이 걸려야 한다.
    const geminiEstimate = vi.fn().mockResolvedValue({
      items: [
        { name: '미역국', weight: 400, calories: 250, protein: 8, carbs: 40, fat: 8, sodium: 900, fiber: 3 },
        { name: '배추김치', weight: 40, calories: 100, protein: 2, carbs: 10, fat: 1, sodium: 300, fiber: 1 },
      ],
      total: { calories: 350, protein: 10, carbs: 50, fat: 9, sodium: 1200, fiber: 4 },
    })

    const result = await analyzeTray(
      { menus: ['미역국', '배추김치'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: true, useCache: false },
    )

    expect(geminiEstimate).toHaveBeenCalledTimes(1)
    expect(result.method).toBe('llm_reviewed')
  })

  it('메뉴가 1개뿐이면(단일 항목 모드) 칼로리가 낮아도 LLM sanity 교차검증을 하지 않는다', async () => {
    // 학식·급식 카드의 메뉴별 [영양 분석](6주차 §1-B)은 반찬 하나만 조회할 수 있는데, KDRI 한 끼
    // 범위(300~1400kcal)는 트레이 전체 기준이라 반찬 하나엔 안 맞다 — 리뷰에서 발견해 고친 버그.
    const geminiEstimate = vi.fn()
    const result = await analyzeTray(
      { menus: ['미역국'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: true, useCache: false },
    )

    expect(geminiEstimate).not.toHaveBeenCalled()
    expect(result.method).toBe('estimated')
  })

  // 위 KDRI 교차검증(트레이 전체 기준)과 달리, 음식별 현실범위 보정은 단일 메뉴에도 걸려야 한다.
  // 예전엔 트레이 경로가 이 보정을 통째로 건너뛰어서 단일 메뉴 조회가 아무 검증도 못 받았다 —
  // foodDB의 미역국 급식 레코드는 7kcal/100g이라 국 한 그릇이 21kcal로 나온다(실제 20kcal/100g 수준).
  it('단일 메뉴도 음식별 현실범위 보정은 받는다(LLM 호출 없이)', async () => {
    const geminiEstimate = vi.fn()
    const result = await analyzeTray(
      { menus: ['미역국'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: true, useCache: false },
    )

    expect(geminiEstimate).not.toHaveBeenCalled()
    // 트레이 중량은 역할 표준(국 300g) → foodData 범위[80,220]@400g를 300g로 스케일한 하한 60으로 보정.
    expect(result.total.calories).toBe(60)
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

  it('칼로리는 같아도 officialTotals의 단백질이 다르면 캐시를 공유하지 않는다(리뷰에서 발견한 버그)', async () => {
    const first = await analyzeTray(
      { menus: ['잡곡밥'], mealType: 'lunch', schoolType: 'high', officialTotals: { calories: 500, protein: 20 } },
      {},
    )
    const second = await analyzeTray(
      { menus: ['잡곡밥'], mealType: 'lunch', schoolType: 'high', officialTotals: { calories: 500, protein: 40 } },
      {},
    )

    expect(first.total.protein).not.toBe(second.total.protein)
  })

  it('Gemini 추정이 요청한 이름 일부를 빠뜨리면 confidence가 low로 떨어진다', async () => {
    const geminiEstimate = vi.fn().mockResolvedValue({
      items: [{ name: '창작메뉴XYZ', weight: 120, calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 }],
      total: { calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 },
    })
    // 두 항목이 매칭 실패인데 Gemini는 하나만 돌려준다 — 이름이 다르게 오거나 누락된 상황을 흉내낸다.
    const result = await analyzeTray(
      { menus: ['창작메뉴XYZ', '창작메뉴ABC'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: false, useCache: false },
    )

    expect(result.confidence).toBe('low')
    expect(result.items.find((i) => i.name === '창작메뉴ABC').nutrients.calories).toBeNull()
  })

  it('Gemini 호출 자체가 실패해도 전체 요청이 죽지 않고 해당 항목만 결측 처리한다', async () => {
    const geminiEstimate = vi.fn().mockRejectedValue(new Error('OpenRouter API error(500)'))
    const result = await analyzeTray(
      { menus: ['잡곡밥', '창작메뉴XYZ'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: false, useCache: false },
    )

    expect(result.items.find((i) => i.name === '잡곡밥').matched).toBe(true)
    expect(result.items.find((i) => i.name === '창작메뉴XYZ').nutrients.calories).toBeNull()
    expect(result.confidence).toBe('low')
  })

  it('officialTotals가 있어도 캘리브레이션이 실제로 안 걸리면(합계 0) confidence는 high가 아니다', async () => {
    const geminiEstimate = vi.fn().mockRejectedValue(new Error('실패'))
    const result = await analyzeTray(
      { menus: ['창작메뉴XYZ'], mealType: 'lunch', schoolType: 'univ', officialTotals: { calories: 500 } },
      { geminiEstimate, calibrate: true, useCache: false },
    )

    expect(result.method).toBe('estimated')
    expect(result.confidence).not.toBe('high')
  })

  // 레시피DB(recipeDB.json) 도입 전에는 foodDB에서 편집거리로 겨우 걸린 결과를 무조건 채택해서,
  // "가자미쑥국"이 "가자미구이"(361.95kcal), "가지겉절이"가 "배추 겉절이"(19.68kcal)로 잡혔다.
  // 두 메뉴 다 레시피DB에는 완전일치로 존재한다 — 소스 순서가 아니라 매칭 신뢰도로 골라야 한다.
  it('레시피DB 완전일치가 식약처DB 편집거리 매칭을 이긴다(오매칭 회귀 방지)', async () => {
    const result = await analyzeTray(
      { menus: ['가자미쑥국', '가지겉절이'], mealType: 'lunch', schoolType: 'middle' },
      { calibrate: false, useCache: false },
    )

    for (const item of result.items) {
      expect(item.matched).toBe(true)
      expect(item.matchType).toBe('exact')
    }
    // 잘못 매칭됐을 때의 값(가자미구이 361.95 / 배추겉절이 19.68)으로 돌아가지 않았는지 확인한다.
    const soup = result.items.find((i) => i.name === '가자미쑥국')
    expect(soup.nutrients.calories).toBeLessThan(200)
    const sideDish = result.items.find((i) => i.name === '가지겉절이')
    expect(sideDish.nutrients.calories).toBeGreaterThan(50)
  })

  // 급식 중량은 **역할 표준만** 쓴다. 다른 후보(foodData referenceGrams = 식당 1인분,
  // 식약처 foodSize = 대개 외식 레코드의 포장량)는 트레이 기준이 아니다.
  //
  // ⚠️ 한때 역할을 못 알아본 음식(31.8%)에 한해 저 둘로 흘려보낸 적이 있다. NEIS 실제 115끼로 재보니
  // DB매칭분이 공식 열량의 53.9%→61.4%로 부풀고 **DB 매칭분만으로 공식을 넘긴 끼니가 5→13끼**로
  // 늘었다(쇠고기샤브샤브 50g→930g, 삼치카레구이 50g→450g). 아래 두 테스트가 그 되돌림을 막는다.
  it('역할을 못 알아본 급식 메뉴가 외식 포장량을 배식량으로 쓰지 않는다', async () => {
    const result = await analyzeTray(
      { menus: ['쇠고기샤브샤브'], mealType: 'lunch', schoolType: 'middle' },
      { calibrate: false, useCache: false },
    )
    const item = result.items[0]
    expect(item.matched).toBe(true)
    // 매칭된 레코드의 foodSize는 930g(외식 기준)이다. 트레이 기본값(반찬 50g × 0.95 ≈ 48g)이 나와야 한다.
    expect(item.weight).toBeLessThan(100)
  })

  it('역할을 아는 급식 메뉴는 DB 제공량이 아니라 역할 표준을 쓴다', async () => {
    const result = await analyzeTray(
      { menus: ['잡곡밥'], mealType: 'lunch', schoolType: 'middle' },
      { calibrate: false, useCache: false },
    )
    const item = result.items[0]
    // 잡곡밥 레코드의 foodSize는 450g이지만 rice 표준은 210g × 0.95 ≈ 200g이다 —
    // 한 트레이 안에서 밥 무게가 메뉴 이름에 따라 달라지면 안 된다(재현성).
    expect(item.weight).toBeGreaterThan(150)
    expect(item.weight).toBeLessThan(260)
  })

  // 리뷰에서 발견한 회귀: matchedItems/estimatedItems에 source 필드가 빠져 있으면
  // macroPlausibility.correctMealMacros가 모든 항목을 "근거 동급"으로 취급해, 근거가 약한 AI
  // 추정치가 아니라 배열 앞쪽(DB 실측값)부터 깎는 정반대 결과가 났다(macroPlausibility.js의
  // "DB 실측값은 절대 건드리면 안 된다" 원칙 위반). source가 있어야 그 우선순위가 성립한다.
  it('DB 매칭 항목과 AI 추정 항목에 서로 다른 source가 붙는다', async () => {
    const geminiEstimate = vi.fn().mockResolvedValue({
      items: [{ name: '창작메뉴XYZ', weight: 120, calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 }],
      total: { calories: 300, protein: 10, carbs: 40, fat: 8, sodium: 500, fiber: 2 },
    })
    const result = await analyzeTray(
      { menus: ['잡곡밥', '창작메뉴XYZ'], mealType: 'lunch', schoolType: 'univ' },
      { geminiEstimate, calibrate: false, useCache: false },
    )

    const dbItem = result.items.find((i) => i.name === '잡곡밥')
    const estimatedItem = result.items.find((i) => i.name === '창작메뉴XYZ')
    expect(dbItem.source).toBe(NUTRITION_SOURCE.DB)
    expect(estimatedItem.source).toBe(NUTRITION_SOURCE.ESTIMATED)
  })
})
