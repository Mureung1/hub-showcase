import { Link } from 'react-router'
import { useAppointmentDetail } from '../lib/useAppointmentDetail.ts'

type ParticipantDashboardProps = {
  appointmentId: string
}

function ParticipantDashboard({ appointmentId }: ParticipantDashboardProps) {
  const { detail } = useAppointmentDetail(appointmentId)
  const closedAt = detail?.closedAt ?? null

  return (
    <div className="page-stack">
      <p>참여자 대시보드 (약속 ID: {appointmentId})</p>
      {closedAt ? (
        <Link to={`/a/${appointmentId}/result`} className="button">
          투표 결과 확인하기
        </Link>
      ) : (
        <Link to={`/a/${appointmentId}/schedule`} className="button">
          일정 투표하기
        </Link>
      )}
    </div>
  )
}

export default ParticipantDashboard
