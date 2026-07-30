// NEIS 공식 수치를 "확정값"으로 다루는 규칙 고정 테스트.
// 핵심 보장: 공식으로 받은 값은 **절대 바뀌지 않고**, 안 받은 값만 남은 열량에서 역산된다.
import { describe, it, expect } from 'vitest'
import { applyOfficialAnchors, applyProportionalCalibration } from './anchoredNutrients.js'

const ESTIMATE = { calories: 1000, protein: 30, carbs: 120, fat: 35, fiber: 6, sodium: 1400 }

const atwater = (n) => n.carbs * 4 + n.protein * 4 + n.fat * 9

describe('applyOfficialAnchors', () => {
  it('공식으로 받은 값은 그대로 둔다', () => {
    const { nutrients, confirmed } = applyOfficialAnchors(ESTIMATE, { calories: 800, protein: 15 })
    expect(nutrients.calories).toBe(800)
    expect(nutrients.protein).toBe(15)
    expect(confirmed).toEqual(['calories', 'protein'])
  })

  // 사용자 요구 그대로: "칼로리 800, 단백질 15를 받으면 나머지 칼로리 기반으로 지방·탄수화물을 산출"
  it('안 받은 다량영양소는 남은 열량에서 역산하고, 합이 공식 열량과 맞는다', () => {
    const { nutrients, derived } = applyOfficialAnchors(ESTIMATE, { calories: 800, protein: 15 })
    expect(derived).toContain('carbs')
    expect(derived).toContain('fat')
    // 단백질 15g = 60kcal → 남은 740kcal이 탄수·지방으로 간다
    expect(atwater(nutrients)).toBeCloseTo(800, 0)
    expect(nutrients.carbs).toBeGreaterThan(0)
    expect(nutrients.fat).toBeGreaterThan(0)
  })

  it('배분 비율은 우리 추정치의 에너지 구성을 따른다 — 탄수 위주 추정이면 탄수가 더 간다', () => {
    const carbHeavy = applyOfficialAnchors({ ...ESTIMATE, carbs: 200, fat: 5 }, { calories: 800, protein: 15 })
    const fatHeavy = applyOfficialAnchors({ ...ESTIMATE, carbs: 20, fat: 60 }, { calories: 800, protein: 15 })
    expect(carbHeavy.nutrients.carbs).toBeGreaterThan(fatHeavy.nutrients.carbs)
    expect(fatHeavy.nutrients.fat).toBeGreaterThan(carbHeavy.nutrients.fat)
  })

  it('추정치가 배분 근거를 못 주면 KDRI 에너지적정비율로 나눈다', () => {
    const { nutrients } = applyOfficialAnchors({ calories: 800, carbs: 0, fat: 0 }, { calories: 800, protein: 15 })
    expect(atwater(nutrients)).toBeCloseTo(800, 0)
    expect(nutrients.carbs).toBeGreaterThan(nutrients.fat) // 탄수 60% vs 지방 25%
  })

  // NEIS에 식이섬유·나트륨은 아예 없다. 열량이 0.8배로 조정됐으면 이것들도 함께 줄어야 한다 —
  // 예전엔 그대로 남아서 "열량은 줄었는데 나트륨만 그대로"인 합계가 나왔다.
  it('열량과 무관한 항목(식이섬유·나트륨)은 열량 조정 비율만큼 함께 조정한다', () => {
    const { nutrients } = applyOfficialAnchors(ESTIMATE, { calories: 800, protein: 15 })
    expect(nutrients.sodium).toBeCloseTo(1120, 0) // 1400 × 0.8
    expect(nutrients.fiber).toBeCloseTo(4.8, 1)
  })

  it('공식이 6개를 다 주면 전부 확정이고 아무것도 역산하지 않는다', () => {
    const anchors = { calories: 800, protein: 15, carbs: 110, fat: 25, fiber: 5, sodium: 900 }
    const { nutrients, derived } = applyOfficialAnchors(ESTIMATE, anchors)
    expect(nutrients).toMatchObject(anchors)
    expect(derived).toEqual([])
  })

  // NEIS 값끼리 Atwater가 정확히 안 맞는 경우가 실제로 있다. 그래도 **공식 값을 고치지 않는다** —
  // "확정된 것은 바꾸지 않는다"가 이 모듈의 계약이다.
  it('공식 값끼리 Atwater가 안 맞아도 공식 값을 고치지 않는다', () => {
    const anchors = { calories: 800, protein: 15, carbs: 110, fat: 25 }
    const { nutrients } = applyOfficialAnchors(ESTIMATE, anchors)
    expect(atwater(nutrients)).toBeCloseTo(725, 0) // 800과 어긋나지만 그대로 둔다
    expect(nutrients.calories).toBe(800)
  })

  it('확정된 다량영양소만으로 공식 열량을 넘으면 나머지는 0 — 음수를 만들지 않는다', () => {
    const { nutrients } = applyOfficialAnchors(ESTIMATE, { calories: 100, protein: 40 })
    expect(nutrients.carbs).toBe(0)
    expect(nutrients.fat).toBe(0)
  })

  it('공식 수치가 없으면 추정치를 그대로 돌려준다', () => {
    const { nutrients, confirmed } = applyOfficialAnchors(ESTIMATE, {})
    expect(nutrients).toEqual(ESTIMATE)
    expect(confirmed).toEqual([])
  })
})

// applyOfficialAnchors는 합계만 확정/역산한다 — 항목별 수치는 그대로라 합계와 항목 합이 어긋난다.
// 이 함수가 항목들을 합계와 같은 비율로 나눠 맞춘다. server/nutrition/precisionEngine.js와
// src/pages/Analyze.jsx 사진 분석 경로가 공유하는 단일 소스 — 리뷰에서 발견: 예전엔 후자에 이
// 단계가 아예 없어서 NEIS 공식 수치가 사진 분석 결과에 전혀 반영되지 않았다.
describe('applyProportionalCalibration', () => {
  it('현재 합계와 목표 합계의 비율만큼 각 항목을 스케일한다', () => {
    const items = [
      { name: '밥', nutrients: { calories: 300, protein: 6, carbs: 66, fat: 1, fiber: 1, sodium: 5 } },
      { name: '김치찌개', nutrients: { calories: 700, protein: 24, carbs: 54, fat: 34, fiber: 5, sodium: 1395 } },
    ]
    const currentTotal = { calories: 1000, protein: 30, carbs: 120, fat: 35, fiber: 6, sodium: 1400 }
    const referenceTotal = { calories: 800, protein: 15, carbs: 111.7, fat: 32.6, fiber: 4.8, sodium: 1120 }

    const scales = applyProportionalCalibration(items, referenceTotal, currentTotal)

    expect(scales.calories).toBeCloseTo(0.8, 2)
    expect(items[0].nutrients.calories).toBeCloseTo(240, 0) // 300 × 0.8
    expect(items[1].nutrients.calories).toBeCloseTo(560, 0) // 700 × 0.8
  })

  it('현재 합계가 0이면 나눌 수 없으니 아무것도 하지 않는다', () => {
    const items = [{ name: '밥', nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 } }]
    expect(applyProportionalCalibration(items, { calories: 800 }, { calories: 0 })).toBeNull()
    expect(items[0].nutrients.calories).toBe(0)
  })

  it('목표 합계에 없는 영양소는 항목을 건드리지 않는다', () => {
    const items = [{ name: '밥', nutrients: { calories: 300, protein: 6 } }]
    applyProportionalCalibration(items, { calories: 300 }, { calories: 300 })
    expect(items[0].nutrients.protein).toBe(6) // 스케일 1배라 안 변해야 정상이지만, 애초에 protein 기준은 안 만들어졌는지 확인
  })
})
