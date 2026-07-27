// 백엔드 API를 호출하는 최소 fetch 래퍼.
// react-query 도입은 3주차 예정 — 오늘은 함수 두 개로 충분하다.
import { supabase } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, options) {
  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token

  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || '요청을 처리하지 못했어요.')
  }
  return res.json()
}

// 편지 저장 (작성 → 발송 확정 시 호출)
export function createLetter({ title, content, envelope }) {
  return request('/api/letters', {
    method: 'POST',
    body: JSON.stringify({ title, content, envelope }),
  })
}

// 저장소 '내가 쓴 편지' 목록 조회
export function fetchMyLetters() {
  return request('/api/letters')
}

// 저장소 '내가 쓴 편지' 상세(전체 내용) 조회
export function fetchLetterById(id) {
  return request(`/api/letters/${id}`)
}

// 현재 유효한 추천 조회만 (부수효과 없음, AI 호출 없음)
export function fetchCurrentRecommendation(letterId) {
  return request(`/api/letters/${letterId}/recommendations/current`)
}

// 추천 생성 — 유효 캐시가 있으면 그걸 반환(멱등), 없으면 새로 생성. 폴링해도 안전하다.
export function createRecommendation(letterId) {
  return request(`/api/letters/${letterId}/recommendations`, { method: 'POST' })
}

// 기존 추천을 dismiss하고 새로 생성 ("다른 편지 보기")
export function refreshRecommendation(letterId) {
  return request(`/api/letters/${letterId}/recommendations/refresh`, { method: 'POST' })
}

// 매칭 상태 전이 (opened/dismissed)
export function patchMatch(matchId, status) {
  return request(`/api/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}
