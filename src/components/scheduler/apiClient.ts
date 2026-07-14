import { getAccessToken, refreshSession } from '../../auth/authClient'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

export async function request<T>(path: string, init?: RequestInit, retryOn401 = true): Promise<T> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  })

  if (response.status === 401 && retryOn401 && (await refreshSession())) {
    return request<T>(path, init, false)
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    const message = typeof body === 'object' && body !== null && 'error' in body
      ? String((body as { error: unknown }).error)
      : `API 요청 실패: ${response.status}`
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}
