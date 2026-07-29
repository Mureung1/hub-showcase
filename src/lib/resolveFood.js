// /api/resolve-food 프록시 경유 통합 음식 해석 헬퍼.
//
// 예전엔 Analyze.jsx의 findFoodMatch가 항목마다 /api/fooddb를 **최대 9번 순차** 호출했다(음식 5개
// 사진이면 45요청, 최악 지연 75초, IP당 60요청/분 제한에 스스로 걸림). 이제 항목 배열을 통째로
// 한 번에 보내고 서버(server/nutrition/resolveFood.js)가 로컬 DB → 원격 병렬 순으로 해석한다.
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 서버가 자체 데드라인(기본 2.5초)을 강제하므로 이 값은 네트워크 이상 상황의 안전망일 뿐이다 —
// 기본 28초를 그대로 쓰면 서버가 이미 부분 결과로 답했는데도 클라이언트가 계속 기다리는 일이 없다.
const RESOLVE_TIMEOUT_MS = 10000

// items: [{ dbSearchName, fallbackSearchName, displayName, estimatedGrams, estimatedNutrients }]
// 반환: items와 같은 길이의 [{ matchedName, match, source, matchType, confidence, assumedServing }]
// 실패하면 던지지 않고 전부 "매칭 없음"으로 채운 배열을 돌려준다 — 해석 실패가 분석 전체를 막으면
// 안 되고(AI 추정치라도 보여주는 게 낫다), 호출부가 그 폴백을 이미 처리하고 있기 때문이다.
export async function resolveFoodItems(items) {
  const fallback = () => items.map(() => ({ matchedName: null, match: null, source: null, matchType: null, confidence: 'low' }))
  if (!Array.isArray(items) || items.length === 0) return []

  try {
    const res = await fetchWithTimeout(
      '/api/resolve-food',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      },
      RESOLVE_TIMEOUT_MS,
    )
    const data = await res.json().catch(() => null)
    if (!res.ok || !Array.isArray(data?.items) || data.items.length !== items.length) {
      console.error('resolve-food 응답이 올바르지 않습니다:', data?.error ?? res.status)
      return fallback()
    }
    return data.items
  } catch (err) {
    console.error('resolve-food 요청 실패:', err)
    return fallback()
  }
}
