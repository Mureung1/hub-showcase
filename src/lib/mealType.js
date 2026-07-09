// 식사 시간대 분류. 표시 전용 분류이며 영양소 합계 계산에는 전혀 관여하지 않는다.

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'etc']

export const MEAL_TYPE_LABELS = {
  breakfast: '아침',
  lunch: '점심',
  dinner: '저녁',
  etc: '기타',
}

// 알 수 없거나 없는 값(기존 데이터 등)은 모두 '기타'로 간주한다.
export function normalizeMealType(value) {
  return MEAL_TYPES.includes(value) ? value : 'etc'
}

// 현재 시각 기준 추천 시간대: 아침 05~10시, 점심 10~15시, 저녁 15~21시, 그 외 기타.
export function getRecommendedMealType(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 10) return 'breakfast'
  if (hour >= 10 && hour < 15) return 'lunch'
  if (hour >= 15 && hour < 21) return 'dinner'
  return 'etc'
}
