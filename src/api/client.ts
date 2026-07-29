export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'
const TOKEN_KEY = 'challengelog_token'
const CACHE_PREFIX = 'cl_cache_'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  clearCache()
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  clearCache()
}

function readCache<T>(path: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + path)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache(path: string, data: unknown): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data))
  } catch {
    // 저장 공간이 꽉 찬 경우 등은 무시 — 캐시는 있으면 좋은 것일 뿐
  }
}

export function clearCache(): void {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(CACHE_PREFIX)) {
        sessionStorage.removeItem(key)
      }
    }
  } catch {
    // sessionStorage를 못 쓰는 환경이면 그냥 무시
  }
}

type SignupInput = {
  name: string
  nickname: string
  email: string
  password: string
}

type LoginInput = {
  email: string
  password: string
}

type AuthResponse = {
  token: string
}

type MeResponse = {
  id: string
  email: string
  name: string
  nickname: string
  preferredCategory: string | null
  onboardingCompleted: boolean
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? 'GET'

  if (method === 'GET') {
    const cached = readCache<T>(path)
    if (cached !== null) {
      return cached
    }
  }

  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  const body = await res.json().catch(() => null)

  if (!res.ok) {
    throw new Error(body?.message ?? '요청에 실패했습니다.')
  }

  if (method === 'GET') {
    writeCache(path, body)
  } else {
    // 데이터를 바꾸는 요청이 성공했으면, 캐시해둔 이전 조회 결과들은 더 이상 최신이 아니다.
    clearCache()
  }

  return body as T
}

export function signup(input: SignupInput): Promise<AuthResponse> {
  return request('/auth/signup', { method: 'POST', body: JSON.stringify(input) })
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export function getMe(): Promise<MeResponse> {
  return request('/auth/me')
}

export function updatePreferredCategory(
  preferredCategory: string | null,
): Promise<{ preferredCategory: string | null; onboardingCompleted: boolean }> {
  return request('/auth/preference', {
    method: 'PATCH',
    body: JSON.stringify({ preferredCategory }),
  })
}
