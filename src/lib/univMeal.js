// /api/univ-meal 프록시 경유 대학 학식 헬퍼 (크롤링/폴백 판정은 서버가 이미 끝내고 결과만 준다).
// 4주차 보강 Step 7-1: 응답이 "선택한 날짜 하나"가 아니라 이번 주 전체(5개 식당 × 6일)로
// 바뀌었다 — 화면은 이걸 한 번만 받아 날짜/식당 탭 전환을 전부 클라이언트에서 처리한다(요일 탭을
// 누를 때마다 서버를 다시 부르지 않아 훨씬 빠르다).
import { fetchWithTimeout } from './fetchWithTimeout.js'

// 반환: { source: 'live'|'fallback'|'empty', week, updatedAt, days: [{ date, cafeterias }] }
export async function getUnivWeek({ univ }) {
  const params = new URLSearchParams({ univ })
  const res = await fetchWithTimeout(`/api/univ-meal?${params.toString()}`)
  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(data?.error || `학식 조회 요청 실패 (${res.status})`)
  }
  return data ?? { source: 'empty', week: null, updatedAt: null, days: [] }
}
