const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '')

export type AuthUser = {
  id: string
  email: string
  name: string
}

type SessionResponse = {
  accessToken: string
  user: AuthUser
}

let accessToken: string | null = null

export function getAccessToken() {
  return accessToken
}

function setAccessToken(token: string | null) {
  accessToken = token
}

async function parseOrThrow<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message = typeof body === 'object' && body !== null && 'error' in body ? String((body as { error: unknown }).error) : `요청 실패 (${response.status})`
    throw new Error(message)
  }
  return response.json() as Promise<T>
}

export async function signup(email: string, password: string, name: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await parseOrThrow<SessionResponse>(response)
  setAccessToken(data.accessToken)
  return data.user
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await parseOrThrow<SessionResponse>(response)
  setAccessToken(data.accessToken)
  return data.user
}

let refreshInFlight: Promise<AuthUser | null> | null = null

// refresh token은 회전(1회용) 방식이라, 동시에 여러 곳에서 호출되면(예: React StrictMode의
// effect 이중 실행, 여러 API 요청이 동시에 401을 받는 경우) 먼저 도착한 요청이 토큰을 이미
// 폐기시켜서 나머지 요청이 401을 받는 경쟁 상태가 생긴다. 진행 중인 요청을 재사용해서 방지한다.
// 성공 시 유저 정보도 같이 내려줘서, 페이지 로드 시 refresh와 별도로 /me를 또 호출하는
// 왕복을 없앤다(레이턴시가 큰 네트워크에서 왕복 1회 자체가 체감 로딩 속도에 크게 영향을 줌).
export function refreshSession(): Promise<AuthUser | null> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function performRefresh(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
  if (!response.ok) {
    setAccessToken(null)
    return null
  }
  const data = (await response.json()) as SessionResponse
  setAccessToken(data.accessToken)
  return data.user
}

export async function logout(): Promise<void> {
  await fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  setAccessToken(null)
}
