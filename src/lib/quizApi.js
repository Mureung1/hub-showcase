// FR-17 — /api/quiz/calorie-neighbors 프록시 호출.
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function fetchCalorieNeighbors(food) {
  const res = await fetchWithTimeout(`/api/quiz/calorie-neighbors?food=${encodeURIComponent(food)}`)
  if (!res.ok) return null
  return res.json().catch(() => null)
}
