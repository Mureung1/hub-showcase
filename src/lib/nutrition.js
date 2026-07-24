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

// 라벨 스캔은 표에 없는 항목을 null로 남기는 게 정상(추정 금지)이라, 값마다 number 또는 null만 허용한다.
export function isNutrientSetOrNull(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    NUTRIENT_KEYS.every((key) => value[key] === null || typeof value[key] === 'number')
  )
}

export function isMealAnalysis(value) {
  return (
    Boolean(value) &&
    Array.isArray(value.items) &&
    value.items.every((item) => item && typeof item.name === 'string' && isNutrientSetOrNull(item.nutrients)) &&
    isNutrientSet(value.total)
  )
}

// 음식 항목의 영양수치 출처. DB(가공)은 식약처 가공식품DB(편의점/포장/프랜차이즈 제품) 매칭을 뜻한다.
// LABEL은 영양성분표 사진에서 그대로 읽어낸 값(추정이 아니라 추출)이라 ESTIMATED와 구분한다.
export const NUTRITION_SOURCE = {
  DB: '식약처DB',
  DB_PROCESS: '식약처DB(가공)',
  OFFICIAL: '공식',
  LABEL: '라벨 추출',
  ESTIMATED: '추정',
}

const ESTIMATED_GRAMS_MIN = 20
const ESTIMATED_GRAMS_MAX = 1500

// 흔한 한식의 표준 1인분(그릇 기준, 국물 포함) 참고 범위(g). AI의 estimatedGrams가 이 범위를 크게
// 벗어나면(예: 음식은 맞게 인식했는데 양만 과대/과소 추정한 경우) 영양소가 뻥튀기/과소평가되지 않도록
// 이 범위로 보정한다. 곱빼기/소식 등 정상 변주는 허용하도록 폭을 넉넉히 잡았다. foodName에 키워드가
// 포함되는지로 느슨하게 매칭하고, 매칭되는 게 없으면 기존 범용 범위([20, 1500])를 그대로 쓴다.
// 주의(순서): findPortionReference는 "먼저 걸리는 항목"을 쓴다. 한 키워드가 다른 키워드의 부분
// 문자열이면(예: '국수'⊂'칼국수', '비빔밥'⊂'돌솥비빔밥'), 더 구체적인(긴) 쪽을 위에 두거나 하나로
// 합쳐 오탐을 막는다. '찌개'/'볶음밥'/'국밥' 같은 넓은 키워드는 의도적으로 대표 범위를 공유한다.
const PORTION_REFERENCE_G = [
  // 면류
  { keywords: ['짜장면', '자장면'], min: 450, max: 900 },
  { keywords: ['짬뽕'], min: 500, max: 950 },
  { keywords: ['라면'], min: 350, max: 700 },
  { keywords: ['냉면'], min: 400, max: 850 },
  { keywords: ['우동'], min: 400, max: 850 },
  { keywords: ['국수'], min: 380, max: 850 }, // 칼국수/잔치국수/쌀국수 포함(부분일치)
  { keywords: ['파스타', '스파게티'], min: 300, max: 600 },
  // 밥류
  { keywords: ['볶음밥'], min: 280, max: 560 },
  { keywords: ['비빔밥'], min: 350, max: 700 }, // 돌솥비빔밥 포함(부분일치)
  { keywords: ['국밥'], min: 400, max: 850 },
  { keywords: ['덮밥'], min: 350, max: 700 },
  { keywords: ['카레'], min: 350, max: 700 },
  { keywords: ['공기밥', '쌀밥', '흰밥'], min: 150, max: 300 },
  // 국/탕/찌개 (넓은 '탕'/'국' 키워드보다 구체적인 탕수육/감자탕을 반드시 위에 둔다)
  { keywords: ['찌개'], min: 250, max: 600 }, // 김치/된장/순두부/부대찌개 포함(부분일치)
  { keywords: ['탕수육'], min: 150, max: 500 },
  { keywords: ['감자탕'], min: 400, max: 950 },
  { keywords: ['탕', '국'], min: 300, max: 800 }, // 미역국/설렁탕 등 국물 요리 일반
  // 고기/반찬/분식
  { keywords: ['삼겹살'], min: 100, max: 450 },
  { keywords: ['치킨'], min: 100, max: 900 },
  { keywords: ['돈까스', '돈가스'], min: 150, max: 450 },
  { keywords: ['제육', '불고기'], min: 150, max: 500 },
  { keywords: ['찜닭'], min: 300, max: 800 },
  { keywords: ['떡볶이'], min: 180, max: 500 },
  { keywords: ['김밥'], min: 150, max: 500 },
  { keywords: ['순대'], min: 120, max: 450 },
  { keywords: ['만두'], min: 100, max: 400 },
  { keywords: ['부침개', '파전', '김치전', '해물전', '빈대떡'], min: 120, max: 500 },
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
// 순서 규칙은 PORTION_REFERENCE_G와 동일(먼저 걸리는 항목 사용). '찌개'는 김치/된장/순두부/부대찌개를,
// '국수'는 칼국수/잔치국수를 부분일치로 함께 커버한다. referenceGrams는 그 범위가 기준으로 삼는 표준
// 1인분 무게 — 실제 섭취량(grams)에 비례해 범위를 스케일한 뒤 하한 50% 미만/상한 150% 초과만 보정한다.
const NUTRIENT_PLAUSIBILITY = [
  // 면류 (짜장면·라면은 목표 출력 범위를 좁게 유지 — DB 레코드가 표준 1인분으로 환산 시 과대해지는
  // 값을 1.5배 허용치로 잡아 눌러야 하므로, 폭을 넓히면 그 보정이 풀린다. 검증된 값이라 손대지 않는다.)
  { keywords: ['짜장면', '자장면'], referenceGrams: 650, ranges: { protein: [12, 16], carbs: [110, 130], fat: [12, 18], calories: [650, 800], sodium: [1200, 1800] } },
  { keywords: ['짬뽕'], referenceGrams: 700, ranges: { protein: [18, 30], carbs: [80, 115], calories: [500, 780], sodium: [1800, 3200] } },
  { keywords: ['라면'], referenceGrams: 500, ranges: { protein: [10, 14], carbs: [65, 90], fat: [12, 20], calories: [450, 600], sodium: [1500, 1900] } },
  { keywords: ['냉면'], referenceGrams: 600, ranges: { protein: [12, 24], carbs: [85, 125], calories: [480, 700], sodium: [1300, 2600] } },
  { keywords: ['우동'], referenceGrams: 600, ranges: { protein: [10, 18], carbs: [70, 100], calories: [380, 620], sodium: [1500, 2800] } },
  { keywords: ['국수'], referenceGrams: 550, ranges: { protein: [10, 24], carbs: [60, 100], calories: [380, 660], sodium: [1000, 2400] } }, // 칼국수/잔치국수 포함
  // 밥류
  { keywords: ['볶음밥'], referenceGrams: 400, ranges: { protein: [10, 22], carbs: [68, 105], fat: [10, 28], calories: [500, 800], sodium: [800, 1800] } },
  { keywords: ['비빔밥'], referenceGrams: 500, ranges: { protein: [12, 16], fat: [8, 14], carbs: [90, 110], calories: [550, 700] } },
  { keywords: ['국밥'], referenceGrams: 500, ranges: { protein: [16, 34], carbs: [55, 90], calories: [360, 620], sodium: [1500, 2900] } },
  { keywords: ['카레'], referenceGrams: 450, ranges: { protein: [10, 22], carbs: [78, 120], calories: [500, 800] } },
  // 국/탕/찌개 ('찌개'는 부대찌개처럼 열량 편차가 큰 변형을 함께 잡으므로 열량은 넣지 않고 검증된 단백질·나트륨만 둔다)
  { keywords: ['찌개'], referenceGrams: 400, ranges: { protein: [12, 18], sodium: [1500, 2000] } },
  { keywords: ['감자탕'], referenceGrams: 600, ranges: { protein: [24, 46], calories: [420, 760], sodium: [1500, 2900] } },
  // 고기/반찬/분식
  { keywords: ['삼겹살'], referenceGrams: 150, ranges: { protein: [20, 34], fat: [28, 56], calories: [360, 620] } },
  { keywords: ['치킨'], referenceGrams: 300, ranges: { protein: [40, 78], fat: [24, 58], calories: [540, 980] } },
  { keywords: ['돈까스', '돈가스'], referenceGrams: 200, ranges: { protein: [18, 36], fat: [18, 42], carbs: [35, 70], calories: [430, 780] } },
  { keywords: ['제육'], referenceGrams: 250, ranges: { protein: [20, 40], fat: [14, 34], calories: [340, 620], sodium: [900, 2000] } },
  { keywords: ['불고기'], referenceGrams: 200, ranges: { protein: [20, 40], fat: [8, 26], calories: [260, 520], sodium: [800, 1900] } },
  { keywords: ['탕수육'], referenceGrams: 250, ranges: { protein: [14, 30], fat: [18, 42], carbs: [42, 82], calories: [420, 780] } },
  { keywords: ['떡볶이'], referenceGrams: 250, ranges: { protein: [5, 13], carbs: [58, 102], calories: [290, 540], sodium: [700, 1700] } },
  { keywords: ['김밥'], referenceGrams: 230, ranges: { protein: [7, 15], carbs: [52, 82], calories: [320, 520], sodium: [550, 1400] } },
  { keywords: ['순대'], referenceGrams: 200, ranges: { protein: [8, 18], carbs: [28, 56], calories: [240, 460], sodium: [550, 1400] } },
  { keywords: ['만두'], referenceGrams: 200, ranges: { protein: [9, 21], carbs: [28, 56], fat: [7, 22], calories: [240, 500], sodium: [450, 1300] } },
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

// 사진 없이 메뉴명만으로 추정한 "표준 1인분" 수치 전용 보정. 실제 섭취 grams를 모르므로 그 음식의
// 표준 1인분(referenceGrams)을 기준(scale=1)으로 현실 범위 보정만 적용한다 — 사진 경로(DB 환산)와 달리
// 텍스트 경로는 AI 추정치를 그대로 쓰던 것을, 짜장면 단백질 20g처럼 튀는 값을 표준 범위로 눌러 정확도를 맞춘다.
export function clampToStandardPlausibleNutrients(nutrients, foodName) {
  const entry = foodName && NUTRIENT_PLAUSIBILITY.find(({ keywords }) => keywords.some((k) => foodName.includes(k)))
  if (!entry) return nutrients
  return clampToPlausibleNutrients(nutrients, foodName, entry.referenceGrams)
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

// formatNutrient와 같지만, 라벨 스캔에서 표에 없어 null로 남은 값은 0으로 뭉개지 않고 '-'로 표시한다.
export function formatNutrientOrDash(value, unit = '') {
  return value == null ? '-' : `${formatNutrient(value)}${unit}`
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

// ── 영양소 분류: "부족 판정 대상" vs "기록·경고 전용" ─────────────────────────
// 부족 영양소 선정(식당 추천·보충 메뉴 추천의 입력)은 4개 목표형 영양소만 대상으로 한다.
// - 칼로리는 다른 영양소의 합산 결과라 "칼로리가 부족해요"는 실질적 조언이 못 되고,
// - 나트륨은 상한형이라 "부족" 개념 자체가 성립하지 않는다.
// 이 둘은 화면 표시(섭취량 기록)와 초과 경고에서만 쓴다. 단, 달력의 하루 상태 판정
// (calcDayStatus)과 리더보드 점수(nutritionScore.js + supabase SQL)는 기존 6개 기준을
// 의도적으로 유지한다 — 바꾸면 과거 기록의 상태가 소급해서 달라지고, SQL 채점 공식과
// 어긋난다(CLAUDE.md의 "채점 공식은 반드시 동일하게 유지" 규칙).
export const DEFICIENCY_TARGET_KEYS = ['carbs', 'protein', 'fat', 'fiber']
export const RECORD_ONLY_KEYS = ['calories', 'sodium']
export const UPPER_LIMIT_KEYS = ['sodium']

// 오늘 부족한 영양소 상위 max개. 단위가 제각각(kcal/g/mg)인 절대량 대신 충족률(actual/recommended)
// 오름차순으로 정렬한다 — 절대량 비교는 스케일이 큰 칼로리·나트륨·탄수화물이 항상 상위를 독식해
// 단백질·식이섬유가 구조적으로 진입하지 못했다. 충족률 100% 이상인 영양소는 부족 목록에서 제외.
// 반환 row 모양은 기존 화면·프롬프트가 쓰던 것과 호환된다(key/label/unit/recommended/actual/deficiency).
export function buildDeficiencyRows(recommended, total, { max = 3 } = {}) {
  if (!isNutrientSet(recommended) || !isNutrientSet(total)) return []

  return NUTRIENT_LABELS.filter(({ key }) => DEFICIENCY_TARGET_KEYS.includes(key))
    .map(({ key, label, unit }) => {
      const rec = Number(recommended[key]) || 0
      const actual = Number(total[key]) || 0
      return {
        key,
        label,
        unit,
        recommended: rec,
        actual,
        // 프롬프트("약 Xg 부족")용 표시값 — 정수로 반올림해 소수점 노이즈를 없앤다.
        deficiency: Math.max(0, Math.round(rec - actual)),
        ratio: rec > 0 ? actual / rec : 1,
      }
    })
    .filter((row) => row.ratio < 1)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, max)
}

// 나트륨(상한형)이 오늘 이미 상한을 초과했는지 — 식당/메뉴 추천 프롬프트에
// "짠 메뉴를 피하라" 제약을 얹는 역방향 신호로 쓴다(부족 영양소로는 절대 취급하지 않는다).
export function isSodiumExceeded(recommended, total) {
  const limit = Number(recommended?.sodium) || 0
  const actual = Number(total?.sodium) || 0
  return limit > 0 && actual > limit
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

// 프로필(나이·키·몸무게) 없이 성별만 고른 게스트용 표준 성인 가정값(30세, 활동량 보통).
// 실제 프로필을 저장하면 UserContext.effectiveRecommended가 이 임시값을 곧바로 대체한다.
const ASSUMED_ADULT_PROFILE = {
  male: { age: 30, heightCm: 170, weightKg: 70 },
  female: { age: 30, heightCm: 160, weightKg: 58 },
}

export function calcAssumedRecommendedNutrients(sex) {
  const base = ASSUMED_ADULT_PROFILE[sex === 'female' ? 'female' : 'male']
  return calcRecommendedNutrients({ ...base, sex, activity: 'moderate', conditions: [] })
}
