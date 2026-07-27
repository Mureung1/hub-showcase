const AUTH_STORAGE_KEY = 'tastefit:auth'

export type AuthSession = {
  accessToken: string
  expiresAt: number
  user: {
    id: string
    email: string
    name: string
  }
}

export async function login(email: string, password: string) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await response.json()) as AuthSession & { message?: string }

  if (!response.ok) {
    throw new Error(data.message ?? '로그인에 실패했습니다.')
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data))
  return data
}

export type SignupResult = {
  message: string
  requiresEmailConfirmation: boolean
  user: {
    id: string
    email: string
    name: string
  }
}

export type SignupPreferences = {
  spicy: number
  valueForMoney: number
  atmosphere: number
  waiting: number
  quietness: number
}

export async function getPreferences(): Promise<SignupPreferences> {
  const session = getAuthSession()
  if (!session) throw new Error('로그인이 필요합니다.')

  const response = await fetch('/api/auth/preferences', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  const data = (await response.json()) as SignupPreferences & { message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? '취향 설정을 불러오지 못했습니다.')
  }
  return data
}

export async function updatePreferences(preferences: SignupPreferences) {
  const session = getAuthSession()
  if (!session) throw new Error('로그인이 필요합니다.')

  const response = await fetch('/api/auth/preferences', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.accessToken}`,
    },
    body: JSON.stringify({ preferences }),
  })
  const data = (await response.json()) as {
    message: string
    preferences: SignupPreferences
  }
  if (!response.ok) {
    throw new Error(data.message ?? '취향 설정을 저장하지 못했습니다.')
  }
  return data
}

export async function signup(
  name: string,
  email: string,
  password: string,
  preferences: SignupPreferences,
) {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, preferences }),
  })
  const data = (await response.json()) as SignupResult & { message: string }

  if (!response.ok) {
    throw new Error(data.message ?? '회원가입에 실패했습니다.')
  }
  return data
}

export function getAuthSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as AuthSession
    if (session.expiresAt * 1000 <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return session
  } catch {
    return null
  }
}

export function logout() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}
