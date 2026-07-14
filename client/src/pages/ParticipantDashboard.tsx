import { Link } from 'react-router'

type ParticipantDashboardProps = {
  appointmentId: string
}

function ParticipantDashboard({ appointmentId }: ParticipantDashboardProps) {
  return (
    <div className="page-stack">
      <p>참여자 대시보드 (약속 ID: {appointmentId})</p>
      <Link to={`/a/${appointmentId}/schedule`} className="button">
        일정 투표하기
      </Link>
    </div>
  )
}

export default ParticipantDashboard
