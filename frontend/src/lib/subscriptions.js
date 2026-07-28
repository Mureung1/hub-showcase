import { getToken } from './auth'
import { API_BASE } from './apiBase'

export async function createSubscription(payload) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || '구독 서비스 등록에 실패했습니다.')
  }

  return data
}

export async function getSubscriptions() {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '구독 서비스 목록을 불러오지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data.items
}

export async function getDashboardSummary(month) {
  const token = getToken()
  const query = month ? `?month=${encodeURIComponent(month)}` : ''
  const res = await fetch(`${API_BASE}/api/subscriptions/dashboard${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '대시보드 정보를 불러오지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function getSubscription(id) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '구독 서비스 정보를 불러오지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function updateSubscription(id, payload) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '구독 서비스 수정에 실패했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function deleteSubscription(id) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = new Error(data.error || '구독 서비스 삭제에 실패했습니다.')
    error.status = res.status
    throw error
  }
}

export async function previewSubscription(id) {
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}/preview`)

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '초대 링크를 확인하지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function joinSubscription(id) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}/join`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '파티 가입에 실패했습니다.')
    error.status = res.status
    throw error
  }

  return data
}
