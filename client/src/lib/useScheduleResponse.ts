import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  generateSlots,
  type AppointmentDetailResponse,
  type GetResponseResponse,
  type ScheduleSlot,
  type SubmitResponseRequest,
  type SubmitResponseResponse,
} from 'shared'

type SubmitResult = { success: true; data: SubmitResponseResponse } | { success: false; error: string }

// study: 커스텀 훅: use로 이름 시작해야함, SchedulePage에서 가독성 높이기 위해 데이터 가져오는 로직만 따로 분리한 것.
export function useScheduleResponse(appointmentId: string, participantId: string) {
  const [isLoading, setIsLoading] = useState(true) // study: isLoading 은 마운트 되자마자 조회 시작하므로 시작부터 true.
  const [error, setError] = useState('')
  const [candidateSlots, setCandidateSlots] = useState<ScheduleSlot[]>([])
  const [initialAvailable, setInitialAvailable] = useState<ScheduleSlot[]>([])
  const [initialPreferred, setInitialPreferred] = useState<ScheduleSlot[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [detailRes, responseRes] = await Promise.all([
          axios.get<AppointmentDetailResponse>(`/api/appointments/${appointmentId}`), // study: 약속 관련 정보(약속 날짜 및 시간 범위)
          axios.get<GetResponseResponse>(`/api/appointments/${appointmentId}/participants/${participantId}/responses`), // study: 참여자 관련 정보(가능,선호 시간 선택 기록)
        ])

        if (cancelled) return

        const detail = detailRes.data
        setCandidateSlots(generateSlots(detail.dateStart, detail.dateEnd, detail.timeStart, detail.timeEnd))
        setInitialAvailable(responseRes.data.availableSlots)
        setInitialPreferred(responseRes.data.preferredSlots)
      } catch {
        if (!cancelled) setError('일정 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    // study: 바깥은 동기 함수라 cleanup을 정상적으로 반환하고, 안쪽에 진짜 비동기 로직을 담은 함수를 하나 만들어서 그냥 실행만 시킨다. (useEffect는 비동기로 만들면 안됨.)
    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId, participantId])

  const submit = async (body: SubmitResponseRequest): Promise<SubmitResult> => {
    try {
      const { data } = await axios.put<SubmitResponseResponse>(
        `/api/appointments/${appointmentId}/participants/${participantId}/responses`,
        body,
      )
      return { success: true, data }
    } catch {
      return { success: false, error: '저장에 실패했어요. 잠시 후 다시 시도해주세요.' }
    }
  }

  return { isLoading, error, candidateSlots, initialAvailable, initialPreferred, submit }
}
