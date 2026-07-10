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

// 흔한 한식의 표준 1인분(그릇 기준, 국물 포함) 참고 범위(g). AI의 estimatedGrams가 이 범위를 크게
// 벗어나면(예: 음식은 맞게 인식했는데 양만 과대/과소 추정한 경우) 영양소가 뻥튀기/과소평가되지 않도록
// 이 범위로 보정한다. 곱빼기/소식 등 정상 변주는 허용하도록 폭을 넉넉히 잡았다. foodName에 키워드가
// 포함되는지로 느슨하게 매칭하고, 매칭되는 게 없으면 기존 범용 범위([20, 1500])를 그대로 쓴다.
const PORTION_REFERENCE_G = [
  { keywords: ['짜장면', '자장면'], min: 450, max: 900 },
  { keywords: ['비빔밥'], min: 350, max: 700 },
  { keywords: ['찌개'], min: 250, max: 600 },
  { keywords: ['라면'], min: 350, max: 700 },
  { keywords: ['공기밥', '쌀밥', '흰밥'], min: 150, max: 300 },
]

function findPortionReference(foodName) {
  if (!foodName) return null
  return PORTION_REFERENCE_G.find(({ keywords }) => keywords.some((k) => foodName.includes(k))) ?? null
}

// AI가 추정한 섭취량(g)이 비현실적인 값이면 현실적인 1인분 범위로 보정한다.
// foodName이 PORTION_REFERENCE_G의 흔한 한식 키워드에 걸리면 그 음식 전용 범위로, 아니면 기존 범용 범위로 clamp한다.
export function clampEstimatedGrams(grams, foodName) {
  const n = Number(grams)
  const ref = findPortionReference(foodName)
  const min = ref?.min ?? ESTIMATED_GRAMS_MIN
  const max = ref?.max ?? ESTIMATED_GRAMS_MAX
  if (!Number.isFinite(n) || n <= 0) return ref ? Math.round((ref.min + ref.max) / 2) : 100
  return Math.min(max, Math.max(min, n))
}

// 가공식품 DB의 1회 섭취참고량(servSize)이 있으면 그걸 우선 쓰고(포장 단위라 사진 추정보다 정확한 경우가 많다),
// 없거나 파싱 안 되면 AI가 추정한 섭취량을 쓴다(foodName이 있으면 음식별 표준 1인분 범위로 보정).
export function resolveConsumedGrams(match, estimatedGrams, foodName) {
  const servValue = match?.servSize?.value
  if (typeof servValue === 'number' && servValue > 0) return servValue
  return clampEstimatedGrams(estimatedGrams, foodName)
}

// PORTION_REFERENCE_G와 짝을 이루는 "표준 1인분" 현실 영양 범위(IDENTIFICATION_SYSTEM_PROMPT 6번
// 검증 기준과 동일한 값). DB 매칭에 성공해도 그 레코드 자체의 수치가(예: 특정 산출 레시피가 실제보다
// 고단백/고지방으로 계산된 경우) 이 범위를 크게 벗어날 수 있다 — 식약처 DB "짜장면" 레코드들은 여러 건이
// 모두 100g당 단백질 4g 안팎으로 일관되는데, 이를 표준 1인분(650g)으로 환산하면 약 26~28g으로 실제
// 통념(12~16g)보다 크게 높다. 이런 "DB는 찾았지만 그 값 자체가 튀는" 경우를 잡기 위해, 하한의 50%
// 미만이거나 상한의 150% 초과인 영양소만 경계값으로 눌러 DB와 현실 감각을 함께 반영한다.
// referenceGrams는 실제 사용된 grams에 비례해 범위를 스케일하는 기준량이다(예: 포장식품처럼 표준보다
// 작은 1회분을 쓰면 범위도 비례해 줄어들어, 정상적으로 작은 서빙을 오탐하지 않는다).
const NUTRIENT_PLAUSIBILITY = [
  {
    keywords: ['짜장면', '자장면'],
    referenceGrams: 650,
    ranges: { protein: [12, 16], carbs: [110, 130], fat: [12, 18], calories: [650, 800], sodium: [1200, 1800] },
  },
  {
    keywords: ['비빔밥'],
    referenceGrams: 500,
    ranges: { protein: [12, 16], fat: [8, 14], carbs: [90, 110], calories: [550, 700] },
  },
  {
    keywords: ['찌개'],
    referenceGrams: 400,
    ranges: { protein: [12, 18], sodium: [1500, 2000] },
  },
]

const PLAUSIBILITY_OUTLIER_LOW = 0.5
const PLAUSIBILITY_OUTLIER_HIGH = 1.5

// NUTRIENT_PLAUSIBILITY에 걸리는 음식이면, 실제 사용된 grams에 비례해 범위를 스케일한 뒤 그 범위를
// 크게 벗어나는 영양소만 경계값으로 보정한다. 걸리지 않는 음식/영양소는 손대지 않고 그대로 둔다.
export function clampToPlausibleNutrients(nutrients, foodName, grams) {
  const entry = foodName && NUTRIENT_PLAUSIBILITY.find(({ keywords }) => keywords.some((k) => foodName.includes(k)))
  if (!entry) return nutrients

  const scale = entry.referenceGrams > 0 && Number(grams) > 0 ? Number(grams) / entry.referenceGrams : 1
  const result = { ...nutrients }

  for (const [key, [min, max]] of Object.entries(entry.ranges)) {
    const value = result[key]
    if (typeof value !== 'number') continue
    const scaledMin = min * scale
    const scaledMax = max * scale
    if (value < scaledMin * PLAUSIBILITY_OUTLIER_LOW) result[key] = Math.round(scaledMin * 10) / 10
    else if (value > scaledMax * PLAUSIBILITY_OUTLIER_HIGH) result[key] = Math.round(scaledMax * 10) / 10
  }

  return result
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

// 영양소 표시값을 화면에 보여줄 때만 정수로 반올림한다(내부 계산·저장값은 그대로 정밀도를 유지하고,
// 렌더링 직전에만 이 함수를 거친다). scaleNutrients 등에서 소수점을 남겨두는 계산을 그대로 합산하면
// 부동소수점 오차로 24.999999999 같은 값이 나올 수 있는데, 표시 단계에서 여기로 한 번 걸러 정리한다.
// 숫자가 아니면(누락/NaN 등) 0으로 표시한다.
export function formatNutrient(value) {
  return Math.round(Number(value) || 0)
}

// AI가 계산한 "1인분 예상 섭취량"(expected)을 "단백질 18g · 지방 4g 섭취 가능" 형태로 요약.
// 없거나 형식이 어긋나면 null을 반환해 표시를 생략하게 한다.
export function formatExpectedIntake(expected) {
  if (!expected || typeof expected !== 'object') return null

  const parts = NUTRIENT_LABELS.filter(({ key }) => typeof expected[key] === 'number').map(
    ({ key, label, unit }) => `${label} ${formatNutrient(expected[key])}${unit}`,
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

// ── 영양소별 3단계 상태(충족/부족/초과) 판정 ────────────────────────────────
// 목표형 영양소가 권장량의 이 배수를 넘으면 "초과"로 본다(부족 기준은 NUTRIENT_SATISFY_RATIO=0.8 재사용).
export const NUTRIENT_EXCEED_RATIO = 1.5

export const NUTRIENT_STATUS = { SATISFIED: 'satisfied', DEFICIENT: 'deficient', EXCEEDED: 'exceeded' }

// 나트륨은 상한형이라 "부족"이 없다(상한 이하=충족, 상한 초과=초과). 나머지 5개는 목표형(부족/충족/초과 3단계).
export function classifyNutrientStatus(key, actual, recommended) {
  const rec = Number(recommended) || 0
  const ratio = rec > 0 ? Number(actual) / rec : 0

  if (key === 'sodium') {
    return ratio <= 1 ? NUTRIENT_STATUS.SATISFIED : NUTRIENT_STATUS.EXCEEDED
  }
  if (ratio < NUTRIENT_SATISFY_RATIO) return NUTRIENT_STATUS.DEFICIENT
  if (ratio > NUTRIENT_EXCEED_RATIO) return NUTRIENT_STATUS.EXCEEDED
  return NUTRIENT_STATUS.SATISFIED
}

// NUTRIENT_LABELS 순서대로 각 영양소의 비율·퍼센트·상태를 계산한 행 목록.
export function buildNutrientStatusRows(recommended, total) {
  return NUTRIENT_LABELS.map(({ key, label, unit }) => {
    const actual = Number(total?.[key]) || 0
    const rec = Number(recommended?.[key]) || 0
    const ratio = rec > 0 ? actual / rec : 0

    return {
      key,
      label,
      unit,
      actual,
      recommended: rec,
      ratio,
      percent: Math.round(ratio * 100),
      status: classifyNutrientStatus(key, actual, rec),
    }
  })
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
