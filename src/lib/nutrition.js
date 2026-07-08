// 권장 영양소 계산(BMR/TDEE 기반) 순수함수

const ACTIVITY_FACTORS = {
  low: 1.375,
  moderate: 1.55,
  high: 1.725,
}

const MACRO_RATIO = {
  carbs: 0.5,
  protein: 0.2,
  fat: 0.3,
}

const KCAL_PER_GRAM = {
  carbs: 4,
  protein: 4,
  fat: 9,
}

const FIBER_G = {
  male: 30,
  female: 25,
}

const SODIUM_LIMIT_MG = 2000

const NUTRIENT_KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium']

export function isNutrientSet(value) {
  return Boolean(value) && typeof value === 'object' && NUTRIENT_KEYS.every((key) => typeof value[key] === 'number')
}

export function isMealAnalysis(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.items) &&
    value.items.every((item) => item && typeof item.name === 'string' && isNutrientSet(item.nutrients)) &&
    isNutrientSet(value.total)
  )
}

// 영양소별 (실제/권장) 비율을 1로 캡핑해 평균낸 하루 목표 달성률(%). Result.jsx의 계산과 동일한 정의.
export function calcAchievementPercent(recommended, total) {
  if (!isNutrientSet(recommended) || !isNutrientSet(total)) return 0
  const sum = NUTRIENT_KEYS.reduce((acc, key) => acc + Math.min(1, recommended[key] > 0 ? total[key] / recommended[key] : 0), 0)
  return Math.round((sum / NUTRIENT_KEYS.length) * 100)
}

export function calcBMR({ sex, weightKg, heightCm, age }) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

export function calcTDEE(bmr, activity) {
  const factor = ACTIVITY_FACTORS[activity] ?? ACTIVITY_FACTORS.moderate
  return bmr * factor
}

export function calcRecommendedNutrients({ age, heightCm, weightKg, sex, activity, conditions = [] }) {
  const bmr = calcBMR({ sex, weightKg, heightCm, age })
  const tdee = calcTDEE(bmr, activity)

  let carbsRatio = MACRO_RATIO.carbs
  let proteinRatio = MACRO_RATIO.protein
  // 기저질환 보정(MVP, 얇게): 당뇨면 탄수 비율 5%p를 단백질로 이전
  if (conditions.includes('diabetes')) {
    carbsRatio -= 0.05
    proteinRatio += 0.05
  }

  const recommended = {
    calories: Math.round(tdee),
    protein: Math.round((tdee * proteinRatio) / KCAL_PER_GRAM.protein),
    carbs: Math.round((tdee * carbsRatio) / KCAL_PER_GRAM.carbs),
    fat: Math.round((tdee * MACRO_RATIO.fat) / KCAL_PER_GRAM.fat),
    fiber: FIBER_G[sex] ?? FIBER_G.female,
    sodium: SODIUM_LIMIT_MG,
  }

  // TODO: 검증용 임시 로그 - 확인 후 제거 가능
  console.log('[nutrition] bmr:', Math.round(bmr), 'tdee:', Math.round(tdee), 'recommended:', recommended)

  return recommended
}
