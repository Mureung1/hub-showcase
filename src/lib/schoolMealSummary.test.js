import { describe, it, expect } from 'vitest'
import { buildSchoolMealSummary } from './schoolMealSummary.js'

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

describe('buildSchoolMealSummary', () => {
  it('가장 부족한 영양소를 짚어 다음 끼니(중식→석식)로 안내한다', () => {
    // 단백질만 낮게(10/60≈17%), 나머지는 충분히.
    const mealTotal = { calories: 700, protein: 10, carbs: 100, fat: 20, fiber: 10, sodium: 500 }
    const result = buildSchoolMealSummary(RECOMMENDED, mealTotal, 'lunch')

    expect(result.rows[0].key).toBe('protein')
    expect(result.message).toBe('이 급식엔 단백질이 부족했어요. 저녁에 채워보세요.')
  })

  it('조식 다음은 점심, 석식 다음은 다음 날 아침으로 안내한다', () => {
    const mealTotal = { calories: 200, protein: 5, carbs: 20, fat: 5, fiber: 3, sodium: 300 }
    expect(buildSchoolMealSummary(RECOMMENDED, mealTotal, 'breakfast').message).toMatch(/점심에 채워보세요/)
    expect(buildSchoolMealSummary(RECOMMENDED, mealTotal, 'dinner').message).toMatch(/다음 날 아침에 채워보세요/)
  })

  it('식이섬유가 부족하면 조사 "가"를 쓴다(다른 셋은 "이")', () => {
    // 식이섬유만 낮게.
    const mealTotal = { calories: 900, protein: 40, carbs: 200, fat: 40, fiber: 2, sodium: 500 }
    const result = buildSchoolMealSummary(RECOMMENDED, mealTotal, 'lunch')
    expect(result.rows[0].key).toBe('fiber')
    expect(result.message).toMatch(/식이섬유가 부족했어요/)
  })

  it('4대 목표 영양소를 이 한 끼로 이미 충분히 채웠으면 축하 메시지를 반환하고 rows는 비어있다', () => {
    const mealTotal = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 500 }
    const result = buildSchoolMealSummary(RECOMMENDED, mealTotal, 'lunch')
    expect(result.rows).toEqual([])
    expect(result.message).toBe('이 급식으로 필요한 영양을 고루 채웠어요.')
  })

  it('mealType이 없거나 모르는 값이면 "다음 끼니"로 폴백한다', () => {
    const mealTotal = { calories: 200, protein: 5, carbs: 20, fat: 5, fiber: 3, sodium: 300 }
    expect(buildSchoolMealSummary(RECOMMENDED, mealTotal, undefined).message).toMatch(/다음 끼니에 채워보세요/)
    expect(buildSchoolMealSummary(RECOMMENDED, mealTotal, 'unknown').message).toMatch(/다음 끼니에 채워보세요/)
  })
})
