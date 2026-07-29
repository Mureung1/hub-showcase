// useQuestBoard.js(MY 탭/홈 화면 조회+자동클레임)와 Analyze.jsx(끼니 저장 직후 runGamification)가
// "이번 주 요일별 집계"(quests.js의 buildWeeklyStats가 소비하는 days[])를 똑같이 계산해야 주간 퀘스트
// 판정이 어느 클레임 경로로 이뤄지든 같은 결과가 나온다. 예전엔 두 파일이 이 day-loop를 각자 복사해
// 갖고 있었는데(quests.js는 순수 함수만 두는 계약이라 I/O 루프를 호출부마다 둔다는 이유였다), 다양화
// 퀘스트(단백질/탄수화물/지방/식이섬유/칼로리/다양성/기능사용 판정 필드)가 useQuestBoard.js 쪽에만
// 추가되고 Analyze.jsx에는 반영되지 않아 "끼니 저장 직후엔 그 퀘스트들이 절대 완료 판정을 못 받는"
// 드리프트 버그가 실제로 있었다. 이제 이 파일 하나로 합쳐 그 클래스의 버그 자체를 없앤다.
import { getClaimedQuestIds } from './dataStore.js'
import { sumMealRecordsNutrients } from './mealStore.js'
import { isMet } from './nutrientCriteria.js'
import { NUTRIENT_SATISFY_RATIO } from './nutrition.js'
import { COMBO_BUILDER_TRY_ID, MAP_DUEL_TRY_ID } from './quests.js'
import { toDateKey } from './records.js'
import { getWaterIntake } from './waterIntake.js'

// streak.js의 내부 dateKeyToDayNumber와 동일한 방식(UTC 정수 산술) — 주간 연속기록 계산 전용이라
// streak.js를 export 확장하는 대신 여기서 다시 만든다.
export function dateKeyToDayNumber(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

// weekKey(그 주의 월요일, YYYY-MM-DD)로부터 월~일 7개 날짜 키를 만든다.
export function weekDateKeys(weekKey) {
  const [y, m, d] = weekKey.split('-').map(Number)
  const monday = new Date(y, m - 1, d)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return toDateKey(day)
  })
}

function isRangeMet(actual, recommended, lowRatio, highRatio) {
  if (!(recommended > 0)) return false
  return actual >= recommended * lowRatio && actual <= recommended * highRatio
}

// mealsForDate(dayKey) — 그 날짜의 meal 배열을 돌려주는 콜백. useQuestBoard.js는 조회된 byDate[dayKey]를
// 그대로 주고, Analyze.jsx는 오늘 날짜에 한해 방금 저장한 record까지 합친 mergedMeals를 준다(저장
// 직후라 아직 조회 결과에 반영 안 됐을 수 있어서).
export async function buildWeekDays({ weekKey, todayCalendarKey, mealsForDate, effectiveUserId, targetMl, effectiveRecommended }) {
  const days = []
  for (const dayKey of weekDateKeys(weekKey).filter((k) => k <= todayCalendarKey)) {
    const meals = mealsForDate(dayKey)
    const mealCount = meals.length
    const types = new Set(meals.map((m) => m.mealType))
    const total = sumMealRecordsNutrients(meals)
    const dayWater = getWaterIntake(effectiveUserId, dayKey)
    // eslint-disable-next-line no-await-in-loop
    const dayClaimed = await getClaimedQuestIds(dayKey)
    days.push({
      dayNumber: dateKeyToDayNumber(dayKey),
      mealCount,
      threeMeals: ['breakfast', 'lunch', 'dinner'].every((t) => types.has(t)),
      breakfast: types.has('breakfast'),
      dinner: types.has('dinner'),
      sodiumOk: mealCount > 0 && isMet('sodium', total.sodium, effectiveRecommended?.sodium),
      proteinOk: isMet('protein', total.protein, effectiveRecommended?.protein, NUTRIENT_SATISFY_RATIO),
      carbsOk: isMet('carbs', total.carbs, effectiveRecommended?.carbs, NUTRIENT_SATISFY_RATIO),
      fatOk: isRangeMet(total.fat, effectiveRecommended?.fat, 0.8, 1.2),
      fiberOk: isMet('fiber', total.fiber, effectiveRecommended?.fiber, NUTRIENT_SATISFY_RATIO),
      calorieOk: isRangeMet(total.calories, effectiveRecommended?.calories, 0.85, 1.15),
      waterMet: dayWater.mlConsumed >= targetMl * 0.8,
      supplementTaken: dayWater.supplementTaken,
      quizSuccess: dayClaimed.includes('special-quiz'),
      foodNames: meals.flatMap((m) => (m.items ?? []).map((i) => i.name)),
      usedComboBuilder: dayClaimed.includes(COMBO_BUILDER_TRY_ID),
      usedMapDuel: dayClaimed.includes(MAP_DUEL_TRY_ID),
    })
  }
  return days
}
