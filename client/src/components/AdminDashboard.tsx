import { Link } from 'react-router'
import { useState } from 'react'
import Modal from '../components/Modal.tsx'
import ProgressBar from '../components/ProgressBar.tsx'
import CopyLinkBox from '../components/CopyLinkBox.tsx'
import { useResponseStatus } from '../lib/useResponseStatus.ts'
import { useParticipantsStatus } from '../lib/useParticipantsStatus.ts'
import { buildAppointmentLink } from '../lib/appointmentLink.ts'
import { formatAppointmentPeriod } from '../lib/formatAppointmentPeriod.ts'
import { calculateProgressPercent } from '../lib/progressPercent.ts'
import './AdminDashboard.css'

type AdminDashboardProps = {
  appointmentId: string
  participantId: string
}

function AdminDashboard({ appointmentId, participantId }: AdminDashboardProps) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  // study: useState의 초기값이 false 인 이유 = 결과 확정 확인 modal 창은 버튼을 눌러야 나오기 때문. 아래 button 에서 click event 발생시 true로 변경. 투표 생성 시 바로 나온 것과 반대
  const [closeError, setCloseError] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const {
    isLoading,
    error,
    title,
    dateStart,
    dateEnd,
    timeStart,
    timeEnd,
    headcount,
    completedCount,
    closedAt,
    closeVoting,
  } = useResponseStatus(appointmentId, participantId)
  const {
    isLoading: isParticipantsLoading,
    error: participantsError,
    participants,
  } = useParticipantsStatus(appointmentId)

  // claude: 마감 성공 시에만 모달을 닫는다 - 실패하면 열어둔 채로 에러를 보여줘서 다시 시도할 수 있게 함.
  const handleClose = async () => {
    setCloseError('')
    setIsClosing(true)
    const success = await closeVoting()
    setIsClosing(false)
    if (success) {
      setShowCloseModal(false)
    } else {
      setCloseError('마감에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

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

      <div className="dashboard-actions">
        {closedAt ? (
          <Link to={`/a/${appointmentId}/result`} className="button">
            투표 결과 확인하기
          </Link>
        ) : (
          <Link to={`/a/${appointmentId}/schedule`} className="button">
            일정 투표하기
          </Link>
        )}

        {closedAt ? (
          <button type="button" className="button--secondary" disabled>
            마감됨
          </button>
        ) : (
          <button
            type="button"
            className="button--danger"
            onClick={() => {
              setCloseError('')
              setShowCloseModal(true)
            }}
          >
            투표 마감하기
          </button>
        )}
      </div>

      <div className="participant-status-list">
        <strong>참여자별 응답 상태</strong>
        {isParticipantsLoading && <p>참여자 목록을 불러오는 중...</p>}
        {!isParticipantsLoading && participantsError && <p className="field-error">{participantsError}</p>}
        {!isParticipantsLoading && !participantsError && (
          <ul>
            {participants.map((participant) => (
              <li key={participant.id} className="participant-status-list__item">
                <span>{participant.name}</span>
                <span className={participant.completed ? 'participant-status-list__badge--done' : 'participant-status-list__badge'}>
                  {participant.completed ? '완료' : '미완료'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={showCloseModal}
        onClose={() => {
          // claude: 마감 요청 중엔 배경(overlay) 클릭으로 모달이 닫히지 않게 막는다 - ScheduleEditor.tsx의 isSubmitting 패턴과 동일.
          if (isClosing) return
          setShowCloseModal(false)
        }}
      >
        <div className="close-modal-header">
          <span className="close-modal-header__icon" aria-hidden="true">
            !
          </span>
          <strong className="close-modal-header__title">투표를 마감할까요?</strong>
        </div>
        <div className="dashboard-section">
          <div className="dashboard-status-row">
            <span>
              {headcount}명 중 {completedCount}명 완료
            </span>
            <span>{calculateProgressPercent(completedCount, headcount)}%</span>
          </div>
          <ProgressBar completed={completedCount} total={headcount} />
        </div>
        <p className="close-modal-notice">마감 후에는 참여자가 더 이상 응답을 수정할 수 없습니다.</p>
        {closeError && <p className="field-error">{closeError}</p>}
        <button type="button" className="button--danger" onClick={handleClose} disabled={isClosing}>
          마감할게요
        </button>
        <button
          type="button"
          className="button--secondary"
          onClick={() => setShowCloseModal(false)}
          disabled={isClosing}
        >
          취소
        </button>
      </Modal>
    </div>
  )
}

export default AdminDashboard
