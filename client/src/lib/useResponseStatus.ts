import { useState } from 'react'
import axios from 'axios'
import type { CloseAppointmentResponse } from 'shared'
import { useCompletionStatus } from './useCompletionStatus.ts'

// claude: 완료 현황/약속 정보 조회는 useCompletionStatus에 위임하고, 이 훅은 관리자 전용 마감 처리(closeVoting)만 얹는다.
export function useResponseStatus(appointmentId: string, participantId: string) {
  const status = useCompletionStatus(appointmentId)
  const [closedAtOverride, setClosedAtOverride] = useState<string | null>(null) 

  // study: 마감 버튼 클릭시 실행될 함수. 서버에 마감 put 요청.
  const closeVoting = async (): Promise<boolean> => {
    try {
      const { data } = await axios.put<CloseAppointmentResponse>(
        `/api/appointments/${appointmentId}/participants/${participantId}/close`,
      )
      setClosedAtOverride(data.closedAt) // study: 기존 status(마감 처리 전에 불러왔다면 null인 값)는 마감 처리해도 안 바뀜 -> 따라서 화면에 즉시 반영하려고 override라는 별도의 값을 만들어서 그걸 우선 씀.
      return true
    } catch {
      return false
    }
  }

  return {
    ...status,
    // claude: closeVoting() 성공 직후엔 재조회 없이 override 값을 우선 반영, 아니면 status에서 그대로 파생.
    closedAt: closedAtOverride ?? status.closedAt,
    closeVoting,
  }
}
