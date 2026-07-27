import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
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

export function billingMonthLabel(billingMonth) {
  const [year, month] = billingMonth.split('-')
  return `${year}년 ${Number(month)}월`
}

export function billingMonthShortLabel(billingMonth) {
  const [, month] = billingMonth.split('-')
  return `${Number(month)}월`
}

// transferLink가 주어지면 QR코드 데이터 URL을 생성. null/undefined면 빈 문자열.
export function useTossQrCode(transferLink) {
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    if (!transferLink) return
    QRCode.toDataURL(transferLink)
      .then(setQrDataUrl)
      .catch(() => {})
  }, [transferLink])

  return transferLink ? qrDataUrl : ''
}

// 딥링크 이동을 시도한 뒤, 일정 시간 안에 페이지를 벗어나지 않으면(=앱이 안 열리면) QR코드로 대체 안내
export function useTossTransferFallback(transferLink, status) {
  const [showFallback, setShowFallback] = useState(false)

  useEffect(() => {
    if (!transferLink || status !== 'pending') return

    let fallbackTimer
    const handleVisibilityChange = () => {
      if (document.hidden) clearTimeout(fallbackTimer)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    window.location.href = transferLink
    fallbackTimer = setTimeout(() => {
      if (!document.hidden) setShowFallback(true)
    }, 1500)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearTimeout(fallbackTimer)
    }
  }, [transferLink, status])

  const qrDataUrl = useTossQrCode(showFallback ? transferLink : null)

  return { showFallback, qrDataUrl }
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
