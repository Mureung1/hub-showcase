// /api/fooddb 프록시 경유 식약처 전국통합식품영양성분정보 검색 헬퍼.
// source: 'food'(조리식·기본) | 'process'(가공식품, 편의점/포장/프랜차이즈 제품 보완용 폴백)
import { fetchWithTimeout } from './fetchWithTimeout.js'
import { pickBestFoodMatch as pickBestFoodMatchPure } from './foodMatch.js'

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

// 매칭 판정 로직 자체는 src/lib/foodMatch.js(브라우저 의존 없는 순수 모듈)에 있다 — 서버의 통합
// 해석 엔진(server/nutrition/resolveFood.js)이 같은 기준을 써야 하는데, 이 파일은 fetchWithTimeout →
// apiBase.js(import.meta.env)를 끌고 들어와 Node에서 import할 수 없기 때문이다. 기존 import 경로를
// 유지하려고 여기서 그대로 재수출한다.
export { foodNameSimilarity, FOOD_MATCH_SIMILARITY_THRESHOLD } from './foodMatch.js'

// 개발 빌드 전용 매칭 진단 로그 — 어떤 검색어가 어떤 후보 중 무엇을(혹은 아무것도) 골랐는지 남겨,
// 기준값(threshold) 조정의 근거로 쓴다. import.meta.env를 아는 건 이 파일(클라이언트 전용)뿐이라,
// 순수 모듈에는 콜백으로 주입한다.
function logMatchDebug(searchName, results, best, score, accepted) {
  if (!import.meta.env.DEV) return
  console.log(
    `[DB매칭 진단] "${searchName}" 후보 ${results.length}건 [${results.map((r) => r.name).join(', ')}] → ` +
      (best ? `"${best.name}" (유사도 ${score.toFixed(2)}, ${accepted ? '채택' : '기준 미달 → 폴백'})` : '후보 없음'),
  )
}

// foodMatch.js의 pickBestFoodMatch에 개발용 진단 로그만 붙인 래퍼. 판정 규칙은 전혀 바꾸지 않는다.
export function pickBestFoodMatch(results, searchName, { averageExactMatches = false } = {}) {
  return pickBestFoodMatchPure(results, searchName, {
    averageExactMatches,
    onDebug: (candidates, best, score, accepted) => logMatchDebug(searchName, candidates, best, score, accepted),
  })
}
