import { describe, it, expect } from 'vitest'
import { buildDietSummary } from './dietSummary.js'

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

function meal(name, nutrients) {
  return { id: 'm', mealType: 'lunch', createdAt: '2026-07-27T12:00:00Z', items: [{ name, nutrients }] }
}

describe('buildDietSummary', () => {
  it('빈 기록이면 null(호출부가 API 호출 자체를 건너뛰는 신호)', () => {
    expect(buildDietSummary({}, RECOMMENDED)).toBeNull()
  })

  it('기록이 1일뿐이면(2일 미만) null', () => {
    const mealsByDate = { '2026-07-27': [meal('비빔밥', { calories: 700, protein: 20, carbs: 100, fat: 15, fiber: 5, sodium: 800 })] }
    expect(buildDietSummary(mealsByDate, RECOMMENDED)).toBeNull()
  })

  it('7일 기록 — 기간·기록일수·일평균 칼로리·달성률·자주 등장 음식·과다/부족 항목을 계산한다', () => {
    const mealsByDate = {}
    for (let i = 0; i < 7; i++) {
      const date = `2026-07-${21 + i}`
      mealsByDate[date] = [
        meal('닭가슴살', { calories: 1000, protein: 90, carbs: 150, fat: 20, fiber: 5, sodium: 2600 }),
      ]
    }
    const summary = buildDietSummary(mealsByDate, RECOMMENDED)

    expect(summary.startDate).toBe('2026-07-21')
    expect(summary.endDate).toBe('2026-07-27')
    expect(summary.recordedDays).toBe(7)
    expect(summary.avgCalories).toBe(1000)
    // avgIntake는 프롬프트가 인용할 절대 섭취량 — achievementRates(%)와 별개로 실제 그램/mg을 담는다.
    expect(summary.avgIntake).toEqual({ calories: 1000, protein: 90, carbs: 150, fat: 20, fiber: 5, sodium: 2600 })
    // protein: 90/60=150% → 과다, fiber: 5/25=20% → 부족, sodium: 2600/2000=130%(초과 임계값 130% 자체는 포함 안 됨)
    expect(summary.achievementRates.protein).toBe(150)
    expect(summary.achievementRates.fiber).toBe(20)
    expect(summary.exceededNutrients).toContain('단백질')
    expect(summary.deficientNutrients).toContain('식이섬유')
    expect(summary.topFoods[0]).toEqual({ name: '닭가슴살', count: 7 })
  })

  it('기록이 있는 날짜만 세고, 빈 배열인 날짜는 기록일수에서 제외한다', () => {
    const mealsByDate = {
      '2026-07-25': [meal('김밥', { calories: 500, protein: 10, carbs: 90, fat: 8, fiber: 3, sodium: 900 })],
      '2026-07-26': [],
      '2026-07-27': [meal('라면', { calories: 500, protein: 10, carbs: 90, fat: 8, fiber: 3, sodium: 900 })],
    }
    const summary = buildDietSummary(mealsByDate, RECOMMENDED)
    expect(summary.recordedDays).toBe(2)
  })

  it('recommended가 없으면 달성률/과다/부족 계산 없이도 나머지 요약은 계산된다', () => {
    const mealsByDate = {
      '2026-07-26': [meal('김밥', { calories: 500, protein: 10, carbs: 90, fat: 8, fiber: 3, sodium: 900 })],
      '2026-07-27': [meal('라면', { calories: 500, protein: 10, carbs: 90, fat: 8, fiber: 3, sodium: 900 })],
    }
    const summary = buildDietSummary(mealsByDate, null)
    expect(summary.recordedDays).toBe(2)
    expect(summary.avgCalories).toBe(500)
    expect(summary.achievementRates).toBeNull()
    expect(summary.exceededNutrients).toEqual([])
    expect(summary.deficientNutrients).toEqual([])
  })
})
