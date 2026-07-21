// backend REST API 호출 최소 래퍼. 모든 데이터 접근은 이걸 통해 backend를 탄다
// (frontend는 Supabase "데이터"를 직접 부르지 않는다 — CLAUDE.md 규칙. 인증만 예외).

const BASE = import.meta.env.VITE_API_URL ?? '/api'

// 현재 로그인 세션의 access token. AuthContext가 세션 변화 때마다 setAuthToken으로 갱신한다.
// (api.js는 React 밖이라 컨텍스트를 직접 못 읽으므로 모듈 변수로 보관한다.)
let authToken = null
export function setAuthToken(token) {
  authToken = token ?? null
}

export async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error ?? `요청 실패 (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}
