import { getToken } from './auth'

export function settlementStatusLabel(status, reportedAt) {
  if (status === 'done') return '확인 완료'
  if (reportedAt) return '확인 대기중'
  return '정산 대기'
}

export function settlementOwnerStatusLabel(status, reportedAt) {
  if (status === 'done') return '정산 완료'
  if (reportedAt) return '확인 필요'
  return '정산 대기'
}

export async function createSettlement(id) {
  const token = getToken()
  const res = await fetch(`/api/subscriptions/${id}/settlements`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '정산 생성에 실패했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function getSettlements(id) {
  const token = getToken()
  const res = await fetch(`/api/subscriptions/${id}/settlements`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '정산 이력을 불러오지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data.items
}

export async function getSettlementDetail(id, settlementId) {
  const token = getToken()
  const res = await fetch(`/api/subscriptions/${id}/settlements/${settlementId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '정산 정보를 불러오지 못했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function reportSettlementMember(id, settlementId, settlementMemberId) {
  const token = getToken()
  const res = await fetch(
    `/api/subscriptions/${id}/settlements/${settlementId}/members/${settlementMemberId}/report`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '이체 확인 요청에 실패했습니다.')
    error.status = res.status
    throw error
  }

  return data
}

export async function updateSettlementMemberStatus(id, settlementId, settlementMemberId, status) {
  const token = getToken()
  const res = await fetch(`/api/subscriptions/${id}/settlements/${settlementId}/members/${settlementMemberId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  })

  const data = await res.json()

  if (!res.ok) {
    const error = new Error(data.error || '정산 상태 변경에 실패했습니다.')
    error.status = res.status
    throw error
  }

  return data
}
