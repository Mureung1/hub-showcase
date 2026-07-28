import { describe, it, expect } from 'vitest'
import { applyManualNutrientEdit } from './mealEdit.js'

describe('applyManualNutrientEdit', () => {
  it('baseNutrients가 있으면 같은 배율(servings)로 함께 갱신한다', () => {
    const item = {
      name: '잡곡밥',
      nutrients: { calories: 600, protein: 12, carbs: 130, fat: 2, fiber: 6, sodium: 10 },
      baseNutrients: { calories: 300, protein: 6, carbs: 65, fat: 1, fiber: 3, sodium: 5 },
      servings: 2,
    }
    const next = { calories: 500, protein: 12, carbs: 130, fat: 2, fiber: 6, sodium: 10 }

    const result = applyManualNutrientEdit(item, next)

    expect(result.nutrients).toEqual(next)
    expect(result.baseNutrients.calories).toBe(250) // 500 / 2
    expect(result.source).toBe('직접입력')
    expect(result.matchType).toBeNull()
  })

  it('baseNutrients가 원래 없던 구버전 기록은 새로 만들지 않는다', () => {
    const item = { name: '된장찌개', nutrients: { calories: 150 } }
    const result = applyManualNutrientEdit(item, { calories: 200 })

    expect(result.baseNutrients).toBeUndefined()
    expect(result.nutrients.calories).toBe(200)
  })

  it('servings가 없으면(1인분 기록) 1로 취급해 baseNutrients가 nutrients와 같아진다', () => {
    const item = {
      name: '김치찌개',
      nutrients: { calories: 300 },
      baseNutrients: { calories: 300 },
    }
    const result = applyManualNutrientEdit(item, { calories: 350 })

    expect(result.baseNutrients.calories).toBe(350)
  })

  it('name/brand 등 nutrients 외 필드는 그대로 유지된다', () => {
    const item = { name: '떡볶이', brand: '죠스떡볶이', id: 'abc', nutrients: { calories: 400 } }
    const result = applyManualNutrientEdit(item, { calories: 450 })

    expect(result.name).toBe('떡볶이')
    expect(result.brand).toBe('죠스떡볶이')
    expect(result.id).toBe('abc')
  })
})
