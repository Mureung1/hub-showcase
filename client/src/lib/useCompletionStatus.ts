import { useEffect, useState } from 'react'
import axios from 'axios'
import type { ResponseStatusResponse } from 'shared'
import { useAppointmentDetail } from './useAppointmentDetail.ts'

// claude: 완료 현황(응답 제출 인원) + 약속 기본 정보(제목/기한) 조회만 책임지는 훅. participantId가 필요 없어서
// 관리자·참여자 대시보드가 공통으로 쓸 수 있다. 관리자 전용 마감 처리(closeVoting)는 이 훅에 없고,
// useResponseStatus가 이 훅 위에 따로 얹어서 제공한다.
export function useCompletionStatus(appointmentId: string) {
  const { isLoading: isDetailLoading, error: detailError, detail } = useAppointmentDetail(appointmentId)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState('')
  const [completedCount, setCompletedCount] = useState(0)

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

  return {
    isLoading: isDetailLoading || isStatusLoading,
    error: detailError || statusError,
    title: detail?.title ?? '',
    dateStart: detail?.dateStart ?? '',
    dateEnd: detail?.dateEnd ?? '',
    timeStart: detail?.timeStart ?? '',
    timeEnd: detail?.timeEnd ?? '',
    headcount: detail?.headcount ?? 0,
    completedCount,
    closedAt: detail?.closedAt ?? null,
  }
}
