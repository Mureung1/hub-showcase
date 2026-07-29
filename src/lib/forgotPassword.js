// FR-21 — 비밀번호 찾기 클라이언트 호출부. /api/auth/security-question(GET)과
// /api/auth/reset-password(POST) 두 라우트를 감싼다. 서버가 계정 존재 여부를 드러내지 않도록 설계된
// 응답(found:false, 동일한 오답/미존재 오류 문구)을 그대로 호출부에 전달한다.
import { fetchWithTimeout } from './fetchWithTimeout.js'

export async function fetchSecurityQuestion(loginId) {
  const res = await fetchWithTimeout(`/api/auth/security-question?loginId=${encodeURIComponent(loginId)}`)
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || '요청에 실패했습니다.')
  }
  return data // { found: boolean, question: string|null }
}

export async function resetPasswordWithAnswer({ loginId, answer, newPassword }) {
  const res = await fetchWithTimeout('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, answer, newPassword }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data?.error || '비밀번호를 변경하지 못했습니다.')
  }
  return data
}
