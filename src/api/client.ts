const BASE_URL = 'http://localhost:4000'
const TOKEN_KEY = 'challengelog_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
