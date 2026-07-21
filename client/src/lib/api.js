// API 클라이언트 — 서버 REST 엔드포인트 호출.
// 모든 응답은 서버 컨벤션대로 { data, error } 로 고정 래핑되어 그대로 반환한다.

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000'

async function request(path, options) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    return { data: null, error: '서버에 연결할 수 없어요' }
  }

  const body = await res.json().catch(() => ({ data: null, error: '응답을 읽을 수 없어요' }))
  return body
}

// POST /api/letters — 모임 생성(초대장 작성)
export function createLetter(payload) {
  return request('/api/letters', { method: 'POST', body: JSON.stringify(payload) })
}

// GET /api/letters/:token — 공유 링크로 모임 조회
export function getLetterByToken(token) {
  return request(`/api/letters/${token}`)
}

// POST /api/letters/:token/responses — 참여자 응답(이름·가능 시간대) 저장
export function createResponse(token, payload) {
  return request(`/api/letters/${token}/responses`, { method: 'POST', body: JSON.stringify(payload) })
}

// GET /api/letters/:token/responses — 참여자 응답 목록 조회
export function getResponses(token) {
  return request(`/api/letters/${token}/responses`)
}
