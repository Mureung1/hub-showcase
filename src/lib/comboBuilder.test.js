import { describe, it, expect } from 'vitest'
import { isMealAnalysis } from './nutrition.js'
import { buildComboAnalysis } from './comboBuilder.js'

describe('buildComboAnalysis', () => {
  it('선택된 재료를 servingGrams×qty로 환산해 합산한다', () => {
    const selected = [
      { name: '흰쌀밥', nutrients: { calories: 130, protein: 2.5, carbs: 28, fat: 0.3, fiber: 0.3, sodium: 1 }, baseQuantity: 100, servingGrams: 210, qty: 1 },
      { name: '제육볶음', nutrients: { calories: 250, protein: 15, carbs: 10, fat: 18, fiber: 1, sodium: 500 }, baseQuantity: 100, servingGrams: 150, qty: 1 },
    ]
    const result = buildComboAnalysis(selected)
    expect(result.items).toHaveLength(2)
    // 흰쌀밥 210g: 130*2.1=273
    expect(result.items[0].nutrients.calories).toBeCloseTo(273, 0)
    // 제육볶음 150g: 250*1.5=375
    expect(result.items[1].nutrients.calories).toBeCloseTo(375, 0)
    expect(result.total.calories).toBeCloseTo(273 + 375, 0)
  })

  it('qty가 2 이상이면 그만큼 더 곱해진다', () => {
    const selected = [{ name: '만두', nutrients: { calories: 100 }, baseQuantity: 100, servingGrams: 100, qty: 3 }]
    const result = buildComboAnalysis(selected)
    expect(result.items[0].nutrients.calories).toBeCloseTo(300, 0)
  })

  it('servingGrams/qty가 없으면 기본값(100g×1회)으로 계산한다', () => {
    const selected = [{ name: '김치', nutrients: { calories: 20 }, baseQuantity: 100 }]
    const result = buildComboAnalysis(selected)
    expect(result.items[0].nutrients.calories).toBeCloseTo(20, 0)
  })

  it('빈 선택은 items 0개·total 전부 0인 결과를 반환한다', () => {
    const result = buildComboAnalysis([])
    expect(result.items).toEqual([])
    expect(result.total).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 })
  })

  it('isMealAnalysis 계약을 충족해 AnalysisResultCard가 그대로 재사용할 수 있다', () => {
    const selected = [{ name: '흰쌀밥', nutrients: { calories: 130, protein: 2.5, carbs: 28, fat: 0.3, fiber: 0.3, sodium: 1 }, baseQuantity: 100, servingGrams: 210, qty: 1 }]
    expect(isMealAnalysis(buildComboAnalysis(selected))).toBe(true)
  })
})
