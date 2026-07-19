import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ResponseStatusResponse, CloseAppointmentResponse } from 'shared'
import { useAppointmentDetail } from './useAppointmentDetail.ts'

// claude: 약속 상세(headcount/closedAt)는 useAppointmentDetail로 위임하고, 이 훅은 응답 현황 조회/마감 처리만 책임진다.
export function useResponseStatus(appointmentId: string, participantId: string) {
  const { isLoading: isDetailLoading, error: detailError, detail } = useAppointmentDetail(appointmentId)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState('')
  const [completedCount, setCompletedCount] = useState(0)
  const [closedAtOverride, setClosedAtOverride] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await axios.get<ResponseStatusResponse>(`/api/appointments/${appointmentId}/response-status`) // study: 응답 완료 몇 명이 했는지
        if (cancelled) return
        setCompletedCount(data.completedCount)
      } catch {
        if (!cancelled) setStatusError('응답 현황을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setIsStatusLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId])
  // study: 마감 버튼 클릭시 실행될 함수. 서버에 마감 put 요청.
  const closeVoting = async (): Promise<boolean> => {
    try {
      const { data } = await axios.put<CloseAppointmentResponse>(
        `/api/appointments/${appointmentId}/participants/${participantId}/close`,
      )
      setClosedAtOverride(data.closedAt)
      return true
    } catch {
      return false
    }
  }

  return {
    isLoading: isDetailLoading || isStatusLoading,
    error: detailError || statusError,
    headcount: detail?.headcount ?? 0,
    completedCount,
    // claude: closeVoting() 성공 직후엔 재조회 없이 override 값을 우선 반영, 아니면 detail에서 그대로 파생.
    closedAt: closedAtOverride ?? detail?.closedAt ?? null,
    closeVoting,
  }
}
