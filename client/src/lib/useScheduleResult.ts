import { useEffect, useState } from 'react'
import axios from 'axios'
import { generateSlots, slotKey, type GetResultsResponse, type ScheduleSlot, type SlotResult } from 'shared'
import { useAppointmentDetail } from './useAppointmentDetail.ts'
import { rankSlots } from './resultRanking.ts'

// claude: 약속 상세는 useAppointmentDetail을 재사용하고, 결과(/results)만 이 훅이 별도로 조회한다.
export function useScheduleResult(appointmentId: string) {
  const { isLoading: isDetailLoading, error: detailError, detail } = useAppointmentDetail(appointmentId)
  const [isResultsLoading, setIsResultsLoading] = useState(true)
  const [resultsError, setResultsError] = useState('')
  const [slots, setSlots] = useState<SlotResult[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data } = await axios.get<GetResultsResponse>(`/api/appointments/${appointmentId}/results`)
        if (cancelled) return
        setSlots(data.slots)
      } catch (err) {
        // claude: 마감 전 409는 에러가 아니라 "아직 마감 전"인 정상 상태다 - 화면 전환은 closedAt 기반 리다이렉트가 담당하므로 여기서 에러로 띄우지 않는다.
        const isNotClosedYet = axios.isAxiosError(err) && err.response?.status === 409
        if (!cancelled && !isNotClosedYet) {
          setResultsError('결과를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
        }
      } finally {
        if (!cancelled) setIsResultsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [appointmentId])

  const candidateSlots: ScheduleSlot[] = detail
    ? generateSlots(detail.dateStart, detail.dateEnd, detail.timeStart, detail.timeEnd)
    : []

  const resultMap = new Map(slots.map((slot) => [slotKey(slot), slot]))
  const levelMap = rankSlots(slots)

  return {
    isLoading: isDetailLoading || isResultsLoading,
    error: detailError || resultsError,
    candidateSlots,
    resultMap,
    levelMap,
    closedAt: detail?.closedAt ?? null,
  }
}
