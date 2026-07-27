import { getSessionId, setSessionId } from './sessionId.js'
import { getToken, setToken, clearToken } from './auth.js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request(path, options = {}) {
  const sessionId = getSessionId()
  const token = getToken()
  const headers = { ...(options.headers || {}) }
  if (sessionId) headers['X-Session-Id'] = sessionId
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  const returnedSessionId = res.headers.get('X-Session-Id')
  if (returnedSessionId) setSessionId(returnedSessionId)

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const error = new Error(body?.error?.message || '요청에 실패했어요.')
    error.code = body?.error?.code
    error.status = res.status
    throw error
  }

  if (res.status === 204) return null
  return res.json()
}

export function analyzeReviews(reviews) {
  return request('/api/v1/reviews/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviews }),
  })
}

export function resetHistory() {
  return request('/api/v1/reviews/history', { method: 'DELETE' })
}

export function getSummary() {
  return request('/api/v1/stats/summary')
}

export function getMonthlyStats() {
  return request('/api/v1/stats/monthly')
}

export function getInsight() {
  return request('/api/v1/stats/insight')
}

export function getMyReviews() {
  return request('/api/v1/reviews/mine')
}

export async function signup(email, password) {
  const data = await request('/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data.user
}

export async function login(email, password) {
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data.user
}

export async function logout() {
  await request('/api/v1/auth/logout', { method: 'POST' })
  clearToken()
}

export function getCurrentUser() {
  return request('/api/v1/auth/me').then((data) => data.user)
}
