// 6주차 §0 — server/data/foodDB.json(scripts/buildFoodDB.js가 생성) 기반 로컬 식품 매칭.
// 기존 /api/fooddb(findFoodMatch, 사진 분석용)는 요청마다 식약처 API를 실시간 호출하지만, 이 모듈은
// 서버 기동 시 1회 메모리에 올려두고 그 안에서만 찾는다 — precisionEngine(6주차 §1)이 요청마다
// 외부 API를 기다리지 않고 즉시 매칭하기 위한 것으로, 기존 findFoodMatch 경로와는 별개다.
//
// 매칭 순서(PRD): 정규화 → 완전일치 → 별칭 → 부분포함(긴 이름 우선) → 편집거리 ≤2.
// - 정규화: textNormalize.js(공백 제거 + 흔한 오탈자) — buildFoodDB.js와 동일 규칙 공유.
// - 별칭: foodDB.json에 저장된 별칭(src/lib/foodData.js 유래) 우선 확인 + getCanonicalName을
//   호출해 역방향(예: "돈가스"로 검색해도 "돈까스" 항목을 찾음)까지 커버.
// - 부분포함: mealPortions.js의 "머리명사 우선"과 같은 철학 — 접미사로 먼저 찾고, 그래도 없으면
//   포함 관계로 찾는다. 후보가 여럿이면 가장 긴 DB 이름이 이긴다(더 구체적인 쪽 우선).
// - 편집거리: 그래도 없으면 마지막 안전망으로 오탈자 최대 2글자 차이까지 허용.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCanonicalName, getPlausibility } from '../../src/lib/foodData.js'
import { normalizeFoodName } from './textNormalize.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FOOD_DB_PATH = path.join(__dirname, '..', 'data', 'foodDB.json')

const MIN_PARTIAL_LEN = 2 // 이보다 짧은 DB 이름은 부분포함 후보에서 제외(과매칭 방지, 예: "국"·"밥" 단독)
const MAX_EDIT_DISTANCE = 2

let items = null // 이름 길이 내림차순 정렬(부분포함 "긴 이름 우선"을 find() 한 번으로 처리하기 위함)
let exactIndex = null // Map<정규화된 이름, item> — name + aliases 전부 포함

function load() {
  if (items) return
  const raw = JSON.parse(readFileSync(FOOD_DB_PATH, 'utf8'))
  items = [...raw.items].sort((a, b) => b.name.length - a.name.length)

  exactIndex = new Map()
  for (const item of items) {
    const key = normalizeFoodName(item.name)
    if (key && !exactIndex.has(key)) exactIndex.set(key, item)
    for (const alias of item.aliases ?? []) {
      const aliasKey = normalizeFoodName(alias)
      if (aliasKey && !exactIndex.has(aliasKey)) exactIndex.set(aliasKey, item)
    }
  }
}

// 서버 재기동 없이 foodDB.json을 다시 만들었을 때 테스트/스크립트에서 강제로 다시 읽고 싶을 때만 사용.
export function _resetForTest() {
  items = null
  exactIndex = null
}

function levenshtein(a, b) {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i]
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
    }
    prev = curr
  }
  return prev[b.length]
}

function findPartialMatch(query) {
  const suffixMatch = items.find((item) => {
    const dbName = normalizeFoodName(item.name)
    return dbName.length >= MIN_PARTIAL_LEN && query.endsWith(dbName)
  })
  if (suffixMatch) return suffixMatch

  return (
    items.find((item) => {
      const dbName = normalizeFoodName(item.name)
      return dbName.length >= MIN_PARTIAL_LEN && query.includes(dbName)
    }) ?? null
  )
}

function findFuzzyMatch(query) {
  let best = null
  let bestDistance = MAX_EDIT_DISTANCE + 1
  for (const item of items) {
    const dbName = normalizeFoodName(item.name)
    if (Math.abs(dbName.length - query.length) > MAX_EDIT_DISTANCE) continue // 사전 컷 — levenshtein 호출 절약
    const distance = levenshtein(query, dbName)
    if (distance < bestDistance) {
      bestDistance = distance
      best = item
    }
  }
  return bestDistance <= MAX_EDIT_DISTANCE ? best : null
}

// FR-8 — /api/fooddb의 기존 응답 모양(normalizeFoodItem 참고 — name/baseQuantity/servSize/foodSize/
// brand/nutrients)에 맞춰 이 모듈의 item(nutrientsPer100 등)을 변환한다. findFoodMatch(Analyze.jsx)의
// 나머지 7단계가 전부 이 모양을 기대하므로, 로컬 폴백만 다른 모양을 쓰면 호출부를 또 분기해야 한다.
export function toFoodItemResponse(item) {
  return {
    name: item.name,
    baseQuantity: 100, // nutrientsPer100 기준
    servSize: item.servingGram ?? null,
    foodSize: null,
    brand: null,
    nutrients: item.nutrientsPer100,
  }
}

// 1인분(servingGram) 기준 칼로리 — per100 값만으로는 1인분 크기가 다른 음식끼리 공정하게 비교할 수
// 없어(예: 국물류는 100g당 칼로리가 낮아도 1인분이 커서 총량은 높을 수 있음) 항상 이 환산값을 기준으로
// 비교한다. servingGram이 없는 항목(1인분 기준을 모름)은 null을 반환해 비교 대상에서 제외한다.
function perServingCalories(item) {
  const per100 = item?.nutrientsPer100?.calories
  const grams = item?.servingGram
  if (typeof per100 !== 'number' || !(typeof grams === 'number' && grams > 0)) return null
  return per100 * (grams / 100)
}

// FR-17 — 식단 퀴즈("○○와 칼로리가 비슷한 음식은?")용. targetFoodName과 1인분 칼로리가 비슷한
// 후보(neighbors, 오답 함정용)와 뚜렷이 다른 후보(farOptions, 명백한 오답용)를 함께 반환한다.
// 결정적으로 정렬해 반환하므로(랜덤 없음) 같은 target이면 항상 같은 후보 집합이 나온다 — 실제 오늘의
// 문제 보기 셔플은 호출부(src/lib/calorieQuiz.js)가 시드 기반으로 담당한다.
export function findByCaloriesNear(targetFoodName, { toleranceRatio = 0.15, count = 8 } = {}) {
  load()
  const targetLookup = lookupFood(targetFoodName)
  if (!targetLookup) return null

  // 실측 확인(6주차 §1 정확도 조사와 같은 이유) — DB 원본의 1인분 칼로리는 항목별 표본(급식/외식 등
  // 출처가 뒤섞임) 편차가 커서 실제와 크게 다를 수 있다(예: "김치찌개" 학교급식 표본 하나가 200g·
  // 19kcal/100g로 잡혀 1인분 38kcal로 계산되는 경우 확인됨 — 실제로는 훨씬 큼). foodData.js에 사람이
  // 검증한 현실 범위(plausible.calories)가 있으면 그 중앙값을 우선 신뢰하고, 없는 음식만 DB
  // servingGram 기반 값으로 폴백한다.
  const plausibleRange = getPlausibility(targetFoodName)?.ranges?.calories
  const targetCalories = plausibleRange ? (plausibleRange[0] + plausibleRange[1]) / 2 : perServingCalories(targetLookup.item)
  if (!(targetCalories > 0)) return null

  const others = items
    .filter((item) => item !== targetLookup.item)
    .map((item) => ({ name: item.name, calories: perServingCalories(item) }))
    .filter((c) => c.calories > 0)

  const near = others
    .filter((c) => Math.abs(c.calories - targetCalories) <= targetCalories * toleranceRatio)
    .sort((a, b) => Math.abs(a.calories - targetCalories) - Math.abs(b.calories - targetCalories))
    .slice(0, count)

  const far = others
    .filter((c) => Math.abs(c.calories - targetCalories) > targetCalories * toleranceRatio * 3)
    .sort((a, b) => Math.abs(b.calories - targetCalories) - Math.abs(a.calories - targetCalories))
    .slice(0, count)

  return {
    targetFood: targetLookup.item.name,
    targetCalories: Math.round(targetCalories),
    neighbors: near.map((c) => ({ name: c.name, calories: Math.round(c.calories) })),
    farOptions: far.map((c) => ({ name: c.name, calories: Math.round(c.calories) })),
  }
}

// FR-19 — 커스텀 조합 음식 빌더용 카테고리별 재료 목록. category: side/soup/kimchi/main/rice/dessert/
// drink/noodle(buildFoodDB.js가 채운 값) 중 하나. q가 있으면 이름 부분일치로 좁힌다.
export function listByCategory(category, { q = '', limit = 30 } = {}) {
  load()
  const query = normalizeFoodName(q || '')
  return items
    .filter((item) => item.category === category && (!query || normalizeFoodName(item.name).includes(query)))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .slice(0, limit)
    .map(toFoodItemResponse)
}

// 반환: { item, matchType: 'exact'|'alias'|'partial'|'fuzzy' } | null
export function lookupFood(menuName) {
  load()
  const query = normalizeFoodName(menuName)
  if (!query) return null

  const exact = exactIndex.get(query)
  if (exact) return { item: exact, matchType: 'exact' }

  const canonical = getCanonicalName(menuName)
  if (canonical) {
    const aliasHit = exactIndex.get(normalizeFoodName(canonical))
    if (aliasHit) return { item: aliasHit, matchType: 'alias' }
  }

  const partial = findPartialMatch(query)
  if (partial) return { item: partial, matchType: 'partial' }

  const fuzzy = findFuzzyMatch(query)
  if (fuzzy) return { item: fuzzy, matchType: 'fuzzy' }

  return null
}
