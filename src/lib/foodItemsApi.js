// FR-19 — /api/food-items 프록시 호출(커스텀 조합 빌더의 카테고리별 재료 목록 조회).
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function fetchFoodItems({ category, q = '', limit = 30 }) {
  const params = new URLSearchParams({ category, limit: String(limit) })
  if (q) params.set('q', q)
  const res = await fetchWithTimeout(`/api/food-items?${params.toString()}`)
  if (!res.ok) return []
  const data = await res.json().catch(() => null)
  return Array.isArray(data?.items) ? data.items : []
}
