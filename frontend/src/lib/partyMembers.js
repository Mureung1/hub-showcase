import { getToken } from './auth'
import { API_BASE } from './apiBase'

export async function getMembers(id) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}/members`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '파티원 목록을 불러오지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data.items
}

export async function deleteMember(id, memberId) {
  const token = getToken()
  const res = await fetch(`${API_BASE}/api/subscriptions/${id}/members/${memberId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const error = new Error(data.error || '파티원 삭제에 실패했습니다.')
    error.status = res.status
    throw error
  }
}
