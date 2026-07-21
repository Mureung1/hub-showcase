import { Link } from 'react-router'
import { format, parseISO } from 'date-fns'
import ProgressBar from '../components/ProgressBar.tsx'
import CopyLinkBox from '../components/CopyLinkBox.tsx'
import { useCompletionStatus } from '../lib/useCompletionStatus.ts'
import { useMyResponseStatus } from '../lib/useMyResponseStatus.ts'
import { buildAppointmentLink } from '../lib/appointmentLink.ts'
import { formatAppointmentPeriod } from '../lib/formatAppointmentPeriod.ts'
import { calculateProgressPercent } from '../lib/progressPercent.ts'
import './ParticipantDashboard.css'

type ParticipantDashboardProps = {
  appointmentId: string
  participantId: string
}

function ParticipantDashboard({ appointmentId, participantId }: ParticipantDashboardProps) {
  const { isLoading, error, title, dateStart, dateEnd, timeStart, timeEnd, headcount, completedCount, closedAt } =
    useCompletionStatus(appointmentId) // study: 관리자 대시보드에서 쓰는 훅과 동일. "전체"(제목/기한/참여 인원 현황)
  const { isLoading: isMyStatusLoading, error: myStatusError, completedAt } = useMyResponseStatus(
    appointmentId,
    participantId,
  ) // study: "본인"(완료 여부/완료 일시)

  return (
    <div className="dashboard-page page-stack transition-slide-up">
      {!isLoading && !error && (
        <div className="dashboard-header">
          <strong className="dashboard-header__title">{title}</strong>
          <p className="dashboard-header__period">{formatAppointmentPeriod(dateStart, dateEnd, timeStart, timeEnd)}</p>
        </div>
      )}
      {isLoading && <p>응답 현황을 불러오는 중...</p>}
      {!isLoading && error && <p className="field-error">{error}</p>}
      {!isLoading && !error && (
        <div className="dashboard-section">
          <span className="dashboard-section__label">참여 현황</span>
          <div className="dashboard-status-row">
            <span>
              {headcount}명 중 {completedCount}명 완료
            </span>
            <span>{calculateProgressPercent(completedCount, headcount)}%</span>
          </div>
          <ProgressBar completed={completedCount} total={headcount} />
        </div>
      )}

      <div className="dashboard-section">
        <span className="dashboard-section__label">참여 링크</span>
        <CopyLinkBox link={buildAppointmentLink(appointmentId)} />
      </div>

      {closedAt ? (
        <Link to={`/a/${appointmentId}/result`} className="button">
          투표 결과 확인하기
        </Link>
      ) : (
        <Link to={`/a/${appointmentId}/schedule`} className="button">
          일정 투표하기
        </Link>
      )}

      <div className="my-response-status">
        <strong>내 응답 상태</strong>
        {isMyStatusLoading && <p>불러오는 중...</p>}
        {!isMyStatusLoading && myStatusError && <p className="field-error">{myStatusError}</p>}
        {!isMyStatusLoading && !myStatusError && (
          <>
            {completedAt ? (
              <>
                <span className="my-response-status__badge my-response-status__badge--done">완료</span>
                <p className="my-response-status__timestamp">
                  {format(parseISO(completedAt), 'M/d HH:mm')}에 제출했어요
                </p>
              </>
            ) : (
              <span className="my-response-status__badge">미완료</span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ParticipantDashboard
