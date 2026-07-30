// 음식명 매칭 전략(정규화 → 완전일치 → 별칭 → 부분포함 → 편집거리)을 **데이터와 분리**한 공용 매처.
//
// 원래 이 로직은 server/nutrition/foodLookup.js 안에 식약처 음식DB(foodDB.json) 전용으로 박혀
// 있었다. 레시피DB(recipeDB.json)가 똑같은 전략을 필요로 하면서 복제 대신 여기로 뽑았다 —
// 두 데이터셋이 서로 다른 매칭 규칙으로 갈라지면 "왜 이 음식은 사진에선 잡히고 급식에선 안 잡히나"
// 같은 문제가 조용히 생긴다.
//
// **동작은 foodLookup.js가 하던 것과 1비트도 다르지 않다**(그 모듈의 기존 테스트가 무수정으로
// 통과하는 것이 이 추출의 완료 기준이다). 유일한 차이는 성능이다: 예전엔 부분포함·편집거리 단계가
// 쿼리마다 DB 이름 전체(음식DB 기준 11,347개)를 normalizeFoodName으로 다시 정규화했는데, 이제
// 인덱스를 만들 때 한 번만 계산해두고 재사용한다.
import { normalizeFoodName } from './textNormalize.js'

const MIN_PARTIAL_LEN = 2 // 이보다 짧은 DB 이름은 부분포함 후보에서 제외(과매칭 방지, 예: "국"·"밥" 단독)
const MAX_EDIT_DISTANCE = 2

export const MATCH_TYPES = ['exact', 'alias', 'partial', 'fuzzy']

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

// items: 임의의 레코드 배열. getName/getAliases로 이 매처가 볼 필드를 지정한다.
// getCanonicalName: 역방향 별칭 조회(예: "돈가스"로 검색해도 "돈까스" 항목을 찾음). 데이터셋마다
//   같은 함수(src/lib/foodData.js)를 쓰지만, 이 모듈이 그 파일에 직접 의존하지 않도록 주입받는다.
export function createNameMatcher(items, { getName, getAliases = () => [], getCanonicalName = () => null } = {}) {
  // 부분포함 단계의 "긴 이름 우선"을 find() 한 번으로 처리하기 위해 이름 길이 내림차순 정렬.
  // 정규화된 이름을 여기서 한 번만 계산해 들고 다닌다(예전엔 쿼리마다 전량 재계산했다).
  const entries = items
    .map((item) => ({ item, normalized: normalizeFoodName(getName(item)) }))
    .sort((a, b) => getName(b.item).length - getName(a.item).length)

  const exactIndex = new Map()
  for (const entry of entries) {
    if (entry.normalized && !exactIndex.has(entry.normalized)) exactIndex.set(entry.normalized, entry.item)
    for (const alias of getAliases(entry.item) ?? []) {
      const aliasKey = normalizeFoodName(alias)
      if (aliasKey && !exactIndex.has(aliasKey)) exactIndex.set(aliasKey, entry.item)
    }
  }

  function findPartialMatch(query) {
    const suffixMatch = entries.find((e) => e.normalized.length >= MIN_PARTIAL_LEN && query.endsWith(e.normalized))
    if (suffixMatch) return suffixMatch.item
    return entries.find((e) => e.normalized.length >= MIN_PARTIAL_LEN && query.includes(e.normalized))?.item ?? null
  }

  function findFuzzyMatch(query) {
    let best = null
    let bestDistance = MAX_EDIT_DISTANCE + 1
    for (const entry of entries) {
      if (Math.abs(entry.normalized.length - query.length) > MAX_EDIT_DISTANCE) continue // 사전 컷 — levenshtein 호출 절약
      const distance = levenshtein(query, entry.normalized)
      if (distance < bestDistance) {
        bestDistance = distance
        best = entry.item
      }
    }
    return bestDistance <= MAX_EDIT_DISTANCE ? best : null
  }

  // 반환: { item, matchType: 'exact'|'alias'|'partial'|'fuzzy' } | null
  return function match(rawName) {
    const query = normalizeFoodName(rawName)
    if (!query) return null

    const exact = exactIndex.get(query)
    if (exact) return { item: exact, matchType: 'exact' }

    const canonical = getCanonicalName(rawName)
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
}
