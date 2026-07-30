import { useEffect, useState } from 'react'
import axios from 'axios'
import type { GetResponseResponse } from 'shared'

// claude: 참여자 대시보드 "내 응답 상태"용 - 이 참여자 본인의 완료 여부/완료일시만 필요해서
// candidateSlots/submit 등을 포함한 무거운 useScheduleResponse 대신 가벼운 훅을 따로 둔다.
export function useMyResponseStatus(appointmentId: string, participantId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [completedAt, setCompletedAt] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await axios.get<GetResponseResponse>(
          `/api/appointments/${appointmentId}/participants/${participantId}/responses`,
        )
        if (cancelled) return
        setCompletedAt(data.completedAt)
      } catch {
        if (!cancelled) setError('내 응답 상태를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId, participantId])

  return { isLoading, error, completedAt }
}
