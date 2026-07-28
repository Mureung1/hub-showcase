import { describe, it, expect } from 'vitest'
import { buildRelogNavState } from './relog.js'
import { isMealAnalysis } from './nutrition.js'

describe('buildRelogNavState', () => {
  it('baseNutrients가 있으면 그걸 1인분 기준으로 쓴다(저장된 최종 nutrients가 아니라)', () => {
    const record = {
      mealType: 'lunch',
      items: [
        {
          name: '잡곡밥',
          brand: null,
          source: 'db',
          nutrients: { calories: 600, protein: 12, carbs: 130, fat: 2, fiber: 6, sodium: 10 }, // 2인분 스케일된 값
          baseNutrients: { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 }, // 원본 1인분
          servings: 2,
        },
      ],
    }

    const navState = buildRelogNavState(record)

    expect(navState.prefillTrayAnalysis.pendingAnalysis.items[0].nutrients).toEqual({
      calories: 300,
      protein: 6,
      carbs: 65,
      fat: 1,
      fiber: 3,
      sodium: 5,
    })
    expect(navState.prefillTrayAnalysis.servings).toBe(2)
    expect(navState.prefillTrayAnalysis.mealType).toBe('lunch')
  })

  it('baseNutrients가 없는 구버전 기록은 저장된 nutrients를 1인분으로 해석하고 servings는 1이다', () => {
    const record = {
      mealType: 'dinner',
      items: [
        { name: '된장찌개', brand: null, source: '추정', nutrients: { calories: 150, protein: 8, carbs: 10, fat: 6, fiber: 2, sodium: 900 } },
      ],
    }

    const navState = buildRelogNavState(record)

    expect(navState.prefillTrayAnalysis.pendingAnalysis.items[0].nutrients.calories).toBe(150)
    expect(navState.prefillTrayAnalysis.servings).toBe(1)
  })

  it('결과가 Analyze.jsx의 isMealAnalysis 검증을 통과한다(형식이 안 맞으면 결과 화면이 토스트로 거부한다)', () => {
    const record = {
      mealType: 'lunch',
      items: [
        {
          name: '김치찌개',
          brand: null,
          source: 'db',
          nutrients: { calories: 200, protein: 10, carbs: 8, fat: 12, fiber: 2, sodium: 1200 },
          baseNutrients: { calories: 200, protein: 10, carbs: 8, fat: 12, fiber: 2, sodium: 1200 },
          servings: 1,
        },
        { name: '흰쌀밥', brand: null, source: 'db', nutrients: { calories: 300, protein: 5, carbs: 68, fat: 1, fiber: 1, sodium: 2 } },
      ],
    }

    const navState = buildRelogNavState(record)

    expect(isMealAnalysis(navState.prefillTrayAnalysis.pendingAnalysis)).toBe(true)
    expect(navState.prefillTrayAnalysis.pendingAnalysis.total.calories).toBe(500)
  })

  it('음식이 여러 개(한 끼 세트)여도 각 항목이 자기 baseNutrients를 그대로 쓴다', () => {
    const record = {
      mealType: 'breakfast',
      items: [
        { name: '토스트', brand: null, source: 'db', nutrients: { calories: 400 }, baseNutrients: { calories: 200 }, servings: 2 },
        { name: '우유', brand: null, source: 'db', nutrients: { calories: 250 }, baseNutrients: { calories: 125 }, servings: 2 },
      ],
    }

    const navState = buildRelogNavState(record)
    const items = navState.prefillTrayAnalysis.pendingAnalysis.items

    expect(items[0].nutrients.calories).toBe(200)
    expect(items[1].nutrients.calories).toBe(125)
    expect(navState.prefillTrayAnalysis.servings).toBe(2)
  })
})
