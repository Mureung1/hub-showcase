import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  generateSlots,
  type GetResponseResponse,
  type ScheduleSlot,
  type SubmitResponseRequest,
  type SubmitResponseResponse,
} from 'shared'
import { useAppointmentDetail } from './useAppointmentDetail.ts'

export type SubmitResult = { success: true; data: SubmitResponseResponse } | { success: false; error: string }

// study: 커스텀 훅: use로 이름 시작해야함, SchedulePage에서 가독성 높이기 위해 데이터 가져오는 로직만 따로 분리한 것.
// claude: 약속 상세 조회는 useAppointmentDetail(공용 훅)로 위임하고, 이 훅은 참여자 개인의 응답 조회/제출만 책임진다. closedAt도 useAppointmentDetail을 통해 자동으로 같이 반환됨.
export function useScheduleResponse(appointmentId: string, participantId: string) {
  const { isLoading: isDetailLoading, error: detailError, detail } = useAppointmentDetail(appointmentId)
  const [isResponseLoading, setIsResponseLoading] = useState(true) // study: isLoading 은 마운트 되자마자 조회 시작하므로 시작부터 true.
  const [responseError, setResponseError] = useState('')
  const [initialAvailable, setInitialAvailable] = useState<ScheduleSlot[]>([])
  const [initialPreferred, setInitialPreferred] = useState<ScheduleSlot[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await axios.get<GetResponseResponse>(
          `/api/appointments/${appointmentId}/participants/${participantId}/responses`, // study: 참여자 관련 정보(가능,선호 시간 선택 기록)
        )

        if (cancelled) return

        setInitialAvailable(data.availableSlots)
        setInitialPreferred(data.preferredSlots)
      } catch {
        if (!cancelled) setResponseError('일정 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      } finally {
        if (!cancelled) setIsResponseLoading(false)
      }
    }
    // study: 바깥은 동기 함수라 cleanup을 정상적으로 반환하고, 안쪽에 진짜 비동기 로직을 담은 함수를 하나 만들어서 그냥 실행만 시킨다. (useEffect는 비동기로 만들면 안됨.)
    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId, participantId])

  const candidateSlots: ScheduleSlot[] = detail
    ? generateSlots(detail.dateStart, detail.dateEnd, detail.timeStart, detail.timeEnd)
    : []

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

  return {
    isLoading: isDetailLoading || isResponseLoading, // study: 두 로딩 모두 false가 되어야, 최종 로딩이 false 처리.
    error: detailError || responseError,
    candidateSlots,
    initialAvailable,
    initialPreferred,
    closedAt: detail?.closedAt ?? null,
    submit,
  }
}
