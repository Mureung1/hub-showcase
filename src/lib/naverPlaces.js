// /api/naver-places 프록시 경유 네이버 지역 검색 헬퍼 (네이버 검색 API 키는 프론트에서 절대 사용하지 않음)
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 반환 항목 모양: { name, address, roadAddress, category, link, lat, lng } (좌표는 이미 위경도로 변환됨)
export async function searchNaverPlaces(query) {
  if (!query || !query.trim()) {
    throw new Error('query is required')
  }

  const res = await fetchWithTimeout('/api/naver-places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query.trim() }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `Naver places request failed (${res.status})`)
  }

  return Array.isArray(data) ? data : []
}
