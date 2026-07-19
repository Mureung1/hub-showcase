import { Navigate, useParams } from 'react-router'
import { getSession } from '../lib/session.ts'
import { useScheduleResponse } from '../lib/useScheduleResponse.ts'
import ScheduleEditor from '../components/ScheduleEditor.tsx'


// study: available/preferred는 서로 다른 독립적인 화면이 아니라 "일정 입력"이라는 하나의 작업의 순차적인 두 단계임.
// study: 별도 컴포넌트/파일/페이지로 쪼개면 오히려 state를 부모-자식 간에 주고받는 복잡함만 늘어남.
// study: 따라서 하나의 컴포넌트 안에서 step이라는 state로 화면 내용만 갈아 끼움.
// claude: 위 study 3줄이 설명하던 "SchedulePage 하나가 step을 직접 소유"하는 구조는 Day4에서 바뀜 — 비동기 조회(useScheduleResponse) 완료 후의 "진짜 첫 렌더"에서 초기 선택값을 useState로 시딩해야 하는데, 로딩 게이트 역할을 겸하는 SchedulePage 자신은 그 조건을 만족할 수 없어서(Hook 규칙상 조건부 return 이후에도 동일한 컴포넌트가 계속 렌더링됨), step/선택 상태 소유를 별도 컴포넌트 ScheduleEditor로 옮김(Day4 체크리스트 "확정된 설계 결정" 참고).

function SchedulePage() {
  const { id } = useParams()
  const appointmentId = id ?? ''
  const session = getSession(appointmentId)
  const { isLoading, error, candidateSlots, initialAvailable, initialPreferred, submit } = useScheduleResponse(
    appointmentId,
    session?.participantId ?? '',
  )

  if (!session) {
    return <Navigate to={`/a/${appointmentId}`} replace />
  }

  if (isLoading) {
    return <p>불러오는 중...</p>
  }

  if (error) {
    return <p className="field-error">{error}</p>
  }

  return (
    <ScheduleEditor
      appointmentId={appointmentId}
      candidateSlots={candidateSlots}
      initialAvailable={initialAvailable}
      initialPreferred={initialPreferred}
      onSubmit={submit}
    />
  )
}

export default SchedulePage
