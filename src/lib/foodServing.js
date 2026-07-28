// 6주차 §2 — GET /api/food-serving 클라이언트 헬퍼. AnalysisResultCard가 인분 조절 스테퍼 아래에
// "1인분 · 약 300g" 같은 기준량 힌트를 보여줄 때만 쓴다(없으면 표기 생략 — 추측 금지).
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 반환: { servingGram: number|null, matched: boolean, matchType: string|null }
export async function requestFoodServing(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return { servingGram: null, matched: false, matchType: null }

  const res = await fetchWithTimeout(`/api/food-serving?name=${encodeURIComponent(trimmed)}`)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || `1인분 기준량 조회 실패 (${res.status})`)
  }
  return data ?? { servingGram: null, matched: false, matchType: null }
}
