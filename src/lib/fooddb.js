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

// searchFoodDB 결과 중 가장 적합한 항목 선택: 검색어와 이름이 정확히 일치하는 항목을 우선하고, 없으면 첫 번째(최상단) 결과를 쓴다.
export function pickBestFoodMatch(results, searchName) {
  if (!Array.isArray(results) || results.length === 0) return null
  return results.find((r) => r.name === searchName) || results[0]
}
