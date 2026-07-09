// /api/places 프록시 경유 카카오 키워드 장소 검색 헬퍼 (카카오 REST 키는 프론트에서 절대 사용하지 않음)
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function searchPlaces({ x, y, keyword, radius = 3000 }) {
  if (!x || !y || !keyword) {
    throw new Error('x, y, keyword are required')
  }

  const res = await fetchWithTimeout('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x, y, keyword, radius }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `Places request failed (${res.status})`)
  }

  return Array.isArray(data) ? data : []
}
