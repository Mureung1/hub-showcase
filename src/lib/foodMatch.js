// 식품 검색 결과 중 "이게 정말 그 음식인가"를 판정하는 순수 로직 — 이름 유사도 + 최적 후보 선택.
//
// 원래 src/lib/fooddb.js 안에 있었는데, 그 파일은 fetchWithTimeout → apiBase.js(import.meta.env)를
// 끌고 들어와 **Node(서버)에서 import할 수 없다**. 서버의 통합 해석 엔진(server/nutrition/
// resolveFood.js)이 클라이언트와 **똑같은 기준**으로 매칭을 검증해야 해서(기준이 갈리면 "웹에선
// 잡히는데 급식 분석에선 안 잡힌다" 같은 문제가 조용히 생긴다) 브라우저 의존이 전혀 없는 이 파일로
// 뽑았다. fooddb.js는 이 모듈을 그대로 재수출하므로 기존 import 경로·테스트는 손대지 않아도 된다.
const NUTRIENT_KEYS = ['calories', 'protein', 'fat', 'carbs', 'fiber', 'sodium']

// 공백 무시 정규화 — 식약처 DB에는 같은 음식이 "돌솥 비빔밥"처럼 띄어쓰기만 다른 표기로 등록된
// 경우가 있어, 이름 비교는 공백을 무시하는 게 맞다.
export function normalizeName(name) {
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

// searchFoodDB 결과 중 가장 적합한 항목 선택: 검색어와 이름이 정확히 일치(공백 무시)하는 항목들을
// 우선한다. averageExactMatches가 true면(음식/조리식 DB) 이름이 일치하는 항목이 여럿일 때 평균값을
// 쓰고, false면(가공식품 DB — 이름이 같아도 서로 다른 브랜드 제품일 수 있어 평균하면 실존하지 않는
// 값이 나올 수 있다) 첫 번째 일치 항목을 그대로 쓴다.
//
// 정확 일치가 없으면 유사도 검증을 거친다 — 예전엔 results[0]을 무조건 썼는데, 그러면 업스트림이
// 부분일치 결과를 돌려주는 순간 "라면" 검색에 "라면땅"이 조용히 선택될 수 있다. 기준 미달이면 매칭
// 실패(null)로 처리해 호출부의 다음 폴백 단계로 넘긴다.
//
// onDebug: 개발 빌드 진단 로그를 붙이고 싶을 때만 주입한다(이 모듈 자체는 import.meta.env를 모른다 —
// 그래야 서버에서도 import할 수 있다).
export function pickBestFoodMatch(results, searchName, { averageExactMatches = false, onDebug } = {}) {
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
  onDebug?.(results, best, bestScore, accepted)
  return accepted ? best : null
}
