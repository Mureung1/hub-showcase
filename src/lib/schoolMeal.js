// /api/school-search, /api/school-meal 프록시 경유 NEIS 헬퍼 (NEIS_API_KEY는 프론트에서 절대 사용하지 않음)
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 반환 항목 모양: { name, officeCode, officeName, schoolCode, kind }
// signal: 디바운스 검색에서 이전 미완료 요청을 취소하기 위한 AbortSignal (선택).
export async function searchSchools(name, signal) {
  const trimmed = (name || '').trim()
  if (trimmed.length < 2) return []

  const res = await fetchWithTimeout(`/api/school-search?name=${encodeURIComponent(trimmed)}`, { signal })
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `학교 검색 요청 실패 (${res.status})`)
  }
  return data?.schools ?? []
}

// from/to: 'YYYYMMDD'. 반환: [{ date: 'YYYYMMDD', meals: [{ mealType, menus, calories, nutrients }] }]
export async function getSchoolMeals({ officeCode, schoolCode, from, to }) {
  const params = new URLSearchParams({ officeCode, schoolCode, from, to })
  const res = await fetchWithTimeout(`/api/school-meal?${params.toString()}`)
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `급식 조회 요청 실패 (${res.status})`)
  }
  return data?.days ?? []
}
