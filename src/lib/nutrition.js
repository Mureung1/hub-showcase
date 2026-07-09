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

// 6대 영양소 표시 정보(키/라벨/단위) 단일 소스. 화면에서 이 순서/라벨/단위를 공통으로 사용한다.
export const NUTRIENT_LABELS = [
  { key: 'calories', label: '칼로리', unit: 'kcal' },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'carbs', label: '탄수화물', unit: 'g' },
  { key: 'fat', label: '지방', unit: 'g' },
  { key: 'fiber', label: '식이섬유', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

const NUTRIENT_KEYS = NUTRIENT_LABELS.map((n) => n.key)

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

// 음식 항목의 영양수치 출처. DB(가공)은 식약처 가공식품DB(편의점/포장/프랜차이즈 제품) 매칭을 뜻한다.
export const NUTRITION_SOURCE = {
  DB: '식약처DB',
  DB_PROCESS: '식약처DB(가공)',
  OFFICIAL: '공식',
  ESTIMATED: '추정',
}

const ESTIMATED_GRAMS_MIN = 20
const ESTIMATED_GRAMS_MAX = 1500

// AI가 추정한 섭취량(g)이 비현실적인 값이면 현실적인 1인분 범위로 보정한다.
export function clampEstimatedGrams(grams) {
  const n = Number(grams)
  if (!Number.isFinite(n) || n <= 0) return 100
  return Math.min(ESTIMATED_GRAMS_MAX, Math.max(ESTIMATED_GRAMS_MIN, n))
}

// 가공식품 DB의 1회 섭취참고량(servSize)이 있으면 그걸 우선 쓰고(포장 단위라 사진 추정보다 정확한 경우가 많다),
// 없거나 파싱 안 되면 AI가 추정한 섭취량을 쓴다.
export function resolveConsumedGrams(match, estimatedGrams) {
  const servValue = match?.servSize?.value
  if (typeof servValue === 'number' && servValue > 0) return servValue
  return clampEstimatedGrams(estimatedGrams)
}

// 식약처 DB의 기준량(baseValue, 보통 100g) 대비 실제 섭취량(grams)으로 영양소를 환산한다.
// dbNutrients에 없는 항목(null)은 결과에서도 null로 남긴다(호출부에서 AI 추정치로 보완).
export function scaleNutrients(dbNutrients, baseValue, grams) {
  const base = Number(baseValue)
  const factor = base > 0 ? grams / base : 1
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const value = dbNutrients?.[key]
      return [key, typeof value === 'number' ? Math.round(value * factor * 10) / 10 : null]
    }),
  )
}

// scaled(DB 환산값)에서 null인 항목만 fallback(AI 추정치)으로 채워 완전한 NutrientSet을 만든다.
export function fillMissingNutrients(scaled, fallback) {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => [
      key,
      typeof scaled?.[key] === 'number' ? scaled[key] : Number(fallback?.[key]) || 0,
    ]),
  )
}

// AI가 계산한 "1인분 예상 섭취량"(expected)을 "단백질 18g · 지방 4g 섭취 가능" 형태로 요약.
// 없거나 형식이 어긋나면 null을 반환해 표시를 생략하게 한다.
export function formatExpectedIntake(expected) {
  if (!expected || typeof expected !== 'object') return null

  const parts = NUTRIENT_LABELS.filter(({ key }) => typeof expected[key] === 'number').map(
    ({ key, label, unit }) => `${label} ${Math.round(expected[key])}${unit}`,
  )

  return parts.length > 0 ? `${parts.join(' · ')} 섭취 가능` : null
}

// ── 하루 영양 상태 3단계 판정 ──────────────────────────────────────────────
// 목표형 영양소(칼로리·단백·탄수·지방·식이섬유)는 권장량의 NUTRIENT_SATISFY_RATIO 이상 도달 시 "충족",
// 나트륨(상한형)은 권장 상한 이하일 때 "충족"으로 본다(식단 탭의 한도 개념과 동일).
export const NUTRIENT_SATISFY_RATIO = 0.8

// 충족 개수 → 상태 임계값: good 이상 충족이면 '좋음', normal 이상이면 '보통', 그 미만은 '위험/나쁨'
export const DAY_STATUS_THRESHOLDS = { good: 5, normal: 2 }

export function countSatisfiedNutrients(recommended, total) {
  if (!isNutrientSet(recommended) || !isNutrientSet(total)) return 0
  return NUTRIENT_KEYS.reduce((count, key) => {
    const satisfied =
      key === 'sodium' ? total[key] <= recommended[key] : total[key] >= recommended[key] * NUTRIENT_SATISFY_RATIO
    return count + (satisfied ? 1 : 0)
  }, 0)
}

// 'good' | 'normal' | 'bad' (판정 불가면 null)
export function calcDayStatus(recommended, total) {
  if (!isNutrientSet(recommended) || !isNutrientSet(total)) return null
  const satisfied = countSatisfiedNutrients(recommended, total)
  if (satisfied >= DAY_STATUS_THRESHOLDS.good) return 'good'
  if (satisfied >= DAY_STATUS_THRESHOLDS.normal) return 'normal'
  return 'bad'
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

  return recommended
}
