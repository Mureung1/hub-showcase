// /api/school-search, /api/school-meal 프록시 경유 NEIS 헬퍼 (NEIS_API_KEY는 프론트에서 절대 사용하지 않음)
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 반환 항목 모양: { name, officeCode, officeName, schoolCode, kind }
// signal: 디바운스 검색에서 이전 미완료 요청을 취소하기 위한 AbortSignal (선택).
export async function searchSchools(name, signal) {
  const trimmed = (name || '').trim()
  if (trimmed.length < 2) return []

  const res = await fetchWithTimeout(`/api/school-search?name=${encodeURIComponent(trimmed)}`, { signal })
  // 헤더는 이미 받은 뒤(res.ok 확정) 본문을 읽는 도중에 signal이 abort될 수 있다 — 이때도
  // AbortError가 나는데, 그걸 여기서 null로 삼켜버리면 "취소된 요청"이 "결과 0건"으로 둔갑해
  // 호출부(SchoolSearchField)가 방금 취소한 검색어에 대해 잠깐 "검색 결과가 없어요"를 보여준다.
  // AbortError만은 그대로 던져 호출부의 기존 취소 처리(err.name === 'AbortError')로 넘긴다.
  const data = await res.json().catch((err) => {
    if (err.name === 'AbortError') throw err
    return null
  })

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
