// /api/fooddb 프록시 경유 식약처 전국통합식품영양성분정보 검색 헬퍼.
// source: 'food'(조리식·기본) | 'process'(가공식품, 편의점/포장/프랜차이즈 제품 보완용 폴백)
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function searchFoodDB(foodName, source = 'food') {
  if (!foodName || typeof foodName !== 'string' || !foodName.trim()) {
    throw new Error('foodName is required')
  }

  const res = await fetchWithTimeout('/api/fooddb', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ foodName: foodName.trim(), source }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(data?.error || `FoodDB request failed (${res.status})`)
    // 서버가 "식약처 연결 자체가 안 됨"을 code로 표시해주면 그대로 옮겨 담는다.
    // findFoodMatch가 이 code를 보고 나머지 재시도를 건너뛸지 판단한다.
    if (data?.code) err.code = data.code
    throw err
  }

  return Array.isArray(data) ? data : []
}

const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']

// baseQuantity(보통 100g/100ml)가 100이 아닌 항목이 섞여 있어도 공정하게 평균 내기 위해 "100 기준"으로 환산한다.
function nutrientsPerHundred(match) {
  const base = match.baseQuantity?.value > 0 ? match.baseQuantity.value : 100
  const factor = 100 / base
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const value = match.nutrients?.[key]
      return [key, typeof value === 'number' ? value * factor : null]
    }),
  )
}

function averageNutrientSets(nutrientSets) {
  return Object.fromEntries(
    NUTRIENT_KEYS.map((key) => {
      const values = nutrientSets.map((n) => n[key]).filter((v) => typeof v === 'number')
      return [key, values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null]
    }),
  )
}

// 같은 이름으로 여러 항목이 매칭되면(학교급식/외식 등 레시피별 변형) 임의로 첫 항목만 쓰지 않고 평균해서
// 더 대표성 있는 표준값을 만든다. 항목 하나를 그대로 고르는 것보다 레시피 변형 간 편차(예: 저지방 급식
// 레시피 vs 고지방 외식 레시피)로 인한 오차를 줄여준다.
function averageFoodMatches(exactMatches) {
  return {
    name: exactMatches[0].name,
    baseQuantity: { value: 100, unit: exactMatches[0].baseQuantity?.unit ?? 'g', raw: null },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: averageNutrientSets(exactMatches.map(nutrientsPerHundred)),
  }
}

// 공백 무시 정규화 — 식약처 DB에는 같은 음식이 "돌솥 비빔밥"처럼 띄어쓰기만 다른 표기로 등록된
// 경우가 있어, 이름 비교는 공백을 무시하는 게 맞다.
function normalizeName(name) {
  return typeof name === 'string' ? name.replace(/\s+/g, '') : ''
}

// 한국어 음식명 유사도(0~1). 핵심 직관: 한국어 복합 음식명은 핵심 음식명이 **뒤**에 온다
// ("돌솥비빔밥", "참치김치찌개"). 그래서
//   - 긴 쪽이 짧은 쪽으로 "끝나면"(접두 수식어 변형) 같은 음식일 가능성이 높고     → 높은 점수
//   - 긴 쪽이 짧은 쪽으로 "시작하면"("라면"→"라면땅", "김밥"→"김밥천국") 다른 음식 → 낮은 점수
//   - 중간 포함은 그 사이의 애매한 경우                                            → 낮은 점수
// 순수 함수라 테스트로 기준을 고정한다(fooddb.test.js).
export function foodNameSimilarity(searchName, resultName) {
  const a = normalizeName(searchName)
  const b = normalizeName(resultName)
  if (!a || !b) return 0
  if (a === b) return 1
  const shorter = a.length <= b.length ? a : b
  const longer = a.length <= b.length ? b : a
  const lengthRatio = shorter.length / longer.length
  if (longer.endsWith(shorter)) return 0.7 + 0.3 * lengthRatio
  if (longer.startsWith(shorter)) return 0.3 * lengthRatio
  if (longer.includes(shorter)) return 0.4 * lengthRatio
  return 0
}

// 이 값 이상이어야 비정확 매칭을 인정한다. endsWith(접두 수식어 변형)는 항상 0.7 초과라 통과하고,
// startsWith/중간 포함(최대 0.3/0.4)은 전부 탈락하도록 설계된 경계값. 완화가 필요하면 이 값만 낮추면 된다.
export const FOOD_MATCH_SIMILARITY_THRESHOLD = 0.7

// 개발 빌드 전용 매칭 진단 로그 — 어떤 검색어가 어떤 후보 중 무엇을(혹은 아무것도) 골랐는지 남겨,
// 기준값(threshold) 조정의 근거로 쓴다.
function logMatchDebug(searchName, results, best, score, accepted) {
  if (!import.meta.env.DEV) return
  console.log(
    `[DB매칭 진단] "${searchName}" 후보 ${results.length}건 [${results.map((r) => r.name).join(', ')}] → ` +
      (best ? `"${best.name}" (유사도 ${score.toFixed(2)}, ${accepted ? '채택' : '기준 미달 → 폴백'})` : '후보 없음'),
  )
}

// searchFoodDB 결과 중 가장 적합한 항목 선택: 검색어와 이름이 정확히 일치(공백 무시)하는 항목들을
// 우선한다. averageExactMatches가 true면(음식/조리식 DB) 이름이 일치하는 항목이 여럿일 때 평균값을
// 쓰고, false면(가공식품 DB — 이름이 같아도 서로 다른 브랜드 제품일 수 있어 평균하면 실존하지 않는
// 값이 나올 수 있다) 첫 번째 일치 항목을 그대로 쓴다.
//
// 정확 일치가 없으면 유사도 검증을 거친다 — 예전엔 results[0]을 무조건 썼는데, 그러면 업스트림이
// 부분일치 결과를 돌려주는 순간 "라면" 검색에 "라면땅"이 조용히 선택될 수 있다. 기준 미달이면 매칭
// 실패(null)로 처리해 호출부의 다음 폴백 단계(가공식품 DB → 재검색어 → AI 추정)로 넘긴다.
// (실측: 2026-07 기준 식약처 음식/가공식품 API 모두 foodNm 정확 일치만 반환해 이 경로가 실제로
//  발동하는 일은 드물다 — 업스트림 동작이 바뀌어도 오매칭이 새지 않게 하는 방어선이다.)
export function pickBestFoodMatch(results, searchName, { averageExactMatches = false } = {}) {
  if (!Array.isArray(results) || results.length === 0) return null

  const target = normalizeName(searchName)
  const exact = results.filter((r) => normalizeName(r.name) === target)
  if (exact.length === 1 || (exact.length > 1 && !averageExactMatches)) return exact[0]
  if (exact.length > 1) return averageFoodMatches(exact)

  let best = null
  let bestScore = 0
  for (const r of results) {
    const score = foodNameSimilarity(searchName, r.name)
    if (score > bestScore) {
      best = r
      bestScore = score
    }
  }
  const accepted = bestScore >= FOOD_MATCH_SIMILARITY_THRESHOLD
  logMatchDebug(searchName, results, best, bestScore, accepted)
  return accepted ? best : null
}
