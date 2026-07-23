/* ═══════════════════════════════════════════════════════════════════════════
   api.js — 실제 백엔드 API 호출
   mock/api.js를 대체하여 진짜 서버와 통신한다.
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:3000/api'

// ─────────────────────────────────────────────────────────────────────────────
// fetchSpaces — 공간 목록 조회
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchSpaces() {
  const res = await fetch(`${API_BASE}/spaces`)

  if (!res.ok) {
    throw new Error(`fetchSpaces failed: ${res.status}`)
  }

  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// startSession — 새 진단 세션 시작
// ─────────────────────────────────────────────────────────────────────────────
export async function startSession(spaceId = 'kitchen') {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spaceId, domain: 'kitchen_odor' }),
  })

  if (!res.ok) {
    throw new Error(`startSession failed: ${res.status}`)
  }

  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// turn — 사용자 응답을 받고 다음 단계 결정
//
// 매개변수:
// - sessionId: 세션 식별자
// - axisId: 질문 축 ID (예: "smell_type")
// - answer: 사용자가 선택한 옵션 ID (예: "rotten_egg")
// ─────────────────────────────────────────────────────────────────────────────
export async function turn(sessionId, axisId, answer) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ axisId, answer }),
  })

  if (!res.ok) {
    throw new Error(`turn failed: ${res.status}`)
  }

  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// done — 진단 세션 완료
// ─────────────────────────────────────────────────────────────────────────────
export async function done(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/done`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endReason: 'user_finished' }),
  })

  if (!res.ok) {
    throw new Error(`done failed: ${res.status}`)
  }

  return res.json()
}
