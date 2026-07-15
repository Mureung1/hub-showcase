// 백엔드 API를 호출하는 최소 fetch 래퍼.
// react-query 도입은 3주차 예정 — 오늘은 함수 두 개로 충분하다.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, options) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
