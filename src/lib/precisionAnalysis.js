// server/nutrition/precisionEngine.js(6주차 §1)를 감싸는 /api/precision-analyze 클라이언트 헬퍼.
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 매칭 실패분 추정(③)에 이어 sanity check 실패 시 전체 항목 교차검증(④)까지 겹치면 서버가 OpenRouter를
// 순차로 최대 2번 부를 수 있어(각 최대 20초), 기본 28초보다 여유 있게 잡는다.
const PRECISION_ANALYSIS_TIMEOUT_MS = 45000

// menus: string[]. mealType: 'breakfast'|'lunch'|'dinner'. schoolType: 'elementary'|'middle'|'high'|'univ'.
// officialTotals: { calories, protein?, carbs?, fat? } | null(NEIS 공식 수치 — 없으면 학식).
// 반환: { items:[{name,matched,matchType,weight,nutrients}], total, method, confidence, calibration }
export async function requestPrecisionAnalysis({ menus, mealType, schoolType, officialTotals = null }) {
  const res = await fetchWithTimeout(
    '/api/precision-analyze',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ menus, mealType, schoolType, officialTotals }),
    },
    PRECISION_ANALYSIS_TIMEOUT_MS,
  )
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || `정밀 분석 요청 실패 (${res.status})`)
  }
  return data
}
