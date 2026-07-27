// AI 식습관 분석(PRD 4주차 3절)의 집계 요약 — 원본 끼니 기록을 그대로 Gemini에 보내지 않고, 이
// 순수 함수가 만든 요약 수치만 전달한다(개인 식별 정보 없음, FR-3.2). 프롬프트 조립은
// src/lib/prompts/dietAnalysis.js가 맡는다.
import { NUTRIENT_LABELS } from './nutrition.js'
import { flattenMealItems, sumMealRecordsNutrients } from './mealStore.js'

const EXCEEDED_THRESHOLD = 130 // 달성률 130% 초과 = 과다 섭취 경향
const DEFICIENT_THRESHOLD = 70 // 달성률 70% 미만 = 부족 섭취 경향
const MIN_RECORDED_DAYS = 2 // 이보다 적으면 분석 자체를 호출하지 않는다(FR-3.3)
const TOP_FOODS_LIMIT = 5

// mealsByDate: dataStore.getMealsByDateRange 결과({ [date]: mealRecord[] }).
// recommended: NutrientSet | null — 없으면 achievementRates/exceeded/deficient는 계산하지 않는다.
// 반환: null(기록 2일 미만 — 호출부가 API 호출 자체를 건너뛰는 신호) | 요약 객체.
export function buildDietSummary(mealsByDate, recommended) {
  const recordedDates = Object.keys(mealsByDate || {})
    .filter((date) => (mealsByDate[date]?.length ?? 0) > 0)
    .sort()

  if (recordedDates.length < MIN_RECORDED_DAYS) return null

  const dailyTotals = []
  const foodCounts = new Map()

  for (const date of recordedDates) {
    const records = mealsByDate[date]
    dailyTotals.push(sumMealRecordsNutrients(records))
    for (const item of flattenMealItems(records)) {
      if (!item?.name) continue
      foodCounts.set(item.name, (foodCounts.get(item.name) || 0) + 1)
    }
  }

  const dayCount = dailyTotals.length
  const avgTotal = Object.fromEntries(
    NUTRIENT_LABELS.map(({ key }) => [key, dailyTotals.reduce((sum, t) => sum + (Number(t[key]) || 0), 0) / dayCount]),
  )

  const hasRecommended = recommended && Object.keys(recommended).length > 0
  const achievementRates = hasRecommended
    ? Object.fromEntries(
        NUTRIENT_LABELS.map(({ key }) => [
          key,
          Number(recommended[key]) > 0 ? Math.round((avgTotal[key] / Number(recommended[key])) * 100) : null,
        ]),
      )
    : null

  const exceededNutrients = []
  const deficientNutrients = []
  if (achievementRates) {
    for (const { key, label } of NUTRIENT_LABELS) {
      const rate = achievementRates[key]
      if (rate == null) continue
      if (rate > EXCEEDED_THRESHOLD) exceededNutrients.push(label)
      else if (rate < DEFICIENT_THRESHOLD) deficientNutrients.push(label)
    }
  }

  const topFoods = [...foodCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_FOODS_LIMIT)
    .map(([name, count]) => ({ name, count }))

  return {
    startDate: recordedDates[0],
    endDate: recordedDates[recordedDates.length - 1],
    recordedDays: dayCount,
    avgCalories: Math.round(avgTotal.calories || 0),
    achievementRates,
    topFoods,
    exceededNutrients,
    deficientNutrients,
  }
}
