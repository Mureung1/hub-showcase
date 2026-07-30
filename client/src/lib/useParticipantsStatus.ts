import { useEffect, useState } from 'react'
import axios from 'axios'
import type { GetParticipantsResponse, ParticipantResponseStatus } from 'shared'

// claude: 관리자 대시보드 하단 참여자별 응답 상태 목록 전용 훅 - 신규 GET /:id/participants 호출.
export function useParticipantsStatus(appointmentId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [participants, setParticipants] = useState<ParticipantResponseStatus[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await axios.get<GetParticipantsResponse>(`/api/appointments/${appointmentId}/participants`)
        if (cancelled) return
        setParticipants(data.participants)
      } catch {
        if (!cancelled) setError('참여자 목록을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId])

  return { isLoading, error, participants }
}
