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
    throw new Error(data.error || '구독 등록에 실패했습니다.')
  }

  return data
}
