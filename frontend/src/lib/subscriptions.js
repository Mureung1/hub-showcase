import { getToken } from './auth'

export async function createSubscription(payload) {
  const token = getToken()
  const res = await fetch('/api/subscriptions', {
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
  const res = await fetch('/api/subscriptions', {
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

export async function getSubscription(id) {
  const token = getToken()
  const res = await fetch(`/api/subscriptions/${id}`, {
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
