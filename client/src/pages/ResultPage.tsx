import { Navigate, useParams } from 'react-router'
import { getSession } from '../lib/session.ts'
import { useScheduleResult } from '../lib/useScheduleResult.ts'
import ResultHeatmap from '../components/ResultHeatmap.tsx'

function ResultPage() {
  const { id } = useParams()
  const appointmentId = id ?? ''
  const session = getSession(appointmentId)
  const { isLoading, error, candidateSlots, resultMap, levelMap, closedAt } = useScheduleResult(appointmentId)

  if (!session) {
    return <Navigate to={`/a/${appointmentId}`} replace />
  }

  if (isLoading) {
    return <p>불러오는 중...</p>
  }

  if (error) {
    return <p className="field-error">{error}</p>
  }

  // claude: 마감 전이면 결과 화면 대신 대시보드로 돌려보낸다 - 서버 /results도 409로 막지만, 여긴 FE 쪽 안내(진짜 잠금은 서버가 함).
  if (!closedAt) {
    return <Navigate to={`/a/${appointmentId}`} replace />
  }

  return <ResultHeatmap slots={candidateSlots} levelMap={levelMap} resultMap={resultMap} />
}

export default ResultPage
