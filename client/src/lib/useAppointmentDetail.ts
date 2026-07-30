import { useEffect, useState } from 'react'
import axios from 'axios'
import type { AppointmentDetailResponse } from 'shared'

// claude: 여러 화면(결과/일정입력/대시보드)이 공통으로 필요로 하는 약속 상세 조회 전용 훅. 각자 따로 GET /:id를 부르는 중복을 피하려고 분리함.
export function useAppointmentDetail(appointmentId: string) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<AppointmentDetailResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await axios.get<AppointmentDetailResponse>(`/api/appointments/${appointmentId}`)
        if (cancelled) return
        setDetail(data)
      } catch {
        if (!cancelled) setError('약속 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId])

  return { isLoading, error, detail }
}
