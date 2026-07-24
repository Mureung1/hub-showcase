import { DEFAULT_NUTRITION_GOALS } from '../constants/nutritionGoals'
import type { MealLog } from '../types/meal'
import { macroProgress, summarizeTodayMeals } from './todayMealSummary'

function makeMeal(
  mealType: MealLog['mealType'],
  macros: Partial<MealLog['macros']> = {},
): MealLog {
  return {
    id: `meal-${mealType}`,
    userId: 'user-1',
    date: '2026-07-24',
    mealType,
    time: '12:00',
    memo: null,
    imageUrl: null,
    macros: {
      kcal: 0,
      carb: 0,
      protein: 0,
      fat: 0,
      ...macros,
    },
    aiFeedback: null,
    createdAt: '2026-07-24T12:00:00Z',
  }
}

describe('summarizeTodayMeals', () => {
  describe('정상 케이스', () => {
    it('여러 끼니의 탄단지·칼로리를 합산한다', () => {
      const meals = [
        makeMeal('아침', { kcal: 400, carb: 50, protein: 20, fat: 10 }),
        makeMeal('점심', { kcal: 600, carb: 70, protein: 30, fat: 15 }),
      ]

      const summary = summarizeTodayMeals(meals)

      expect(summary.totals).toEqual({
        kcal: 1000,
        carb: 120,
        protein: 50,
        fat: 25,
      })
      expect(summary.meals).toBe(meals)
      expect(summary.goals).toEqual(DEFAULT_NUTRITION_GOALS)
    })

    it('끼니별 칼로리를 mealKcalByType에 집계한다', () => {
      const meals = [
        makeMeal('간식', { kcal: 100 }),
        makeMeal('간식', { kcal: 150 }),
        makeMeal('저녁', { kcal: 500 }),
      ]

      const summary = summarizeTodayMeals(meals)

      expect(summary.mealKcalByType).toEqual([
        { mealType: '간식', kcal: 250 },
        { mealType: '저녁', kcal: 500 },
      ])
    })
  })

  describe('경계값', () => {
    it('빈 배열이면 0으로 초기화된 totals를 반환한다', () => {
      const summary = summarizeTodayMeals([])

      expect(summary.totals).toEqual({
        kcal: 0,
        carb: 0,
        protein: 0,
        fat: 0,
      })
      expect(summary.mealKcalByType).toEqual([])
    })
  })
})

describe('macroProgress', () => {
  describe('정상 케이스', () => {
    it('목표 대비 진행률을 퍼센트로 반환한다', () => {
      expect(macroProgress(1150, 2300)).toBe(50)
    })
  })

  describe('경계값', () => {
    it('goal이 0 이하면 0을 반환한다', () => {
      expect(macroProgress(100, 0)).toBe(0)
      expect(macroProgress(100, -10)).toBe(0)
    })

    it('100%를 넘으면 100으로 cap한다', () => {
      expect(macroProgress(3000, 2300)).toBe(100)
    })

    it('current가 0이면 0을 반환한다', () => {
      expect(macroProgress(0, 2300)).toBe(0)
    })
  })
})
