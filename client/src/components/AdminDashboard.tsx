import { Link } from 'react-router'
import { useState } from 'react'
import Modal from '../components/Modal.tsx'
import { useResponseStatus } from '../lib/useResponseStatus.ts'

type AdminDashboardProps = {
  appointmentId: string
  participantId: string
}

function AdminDashboard({ appointmentId, participantId }: AdminDashboardProps) {
  const [showCloseModal, setShowCloseModal] = useState(false)
  // study: useState의 초기값이 false 인 이유 = 결과 확정 확인 modal 창은 버튼을 눌러야 나오기 때문. 아래 button 에서 click event 발생시 true로 변경. 투표 생성 시 바로 나온 것과 반대
  const [closeError, setCloseError] = useState('')
  const { isLoading, error, headcount, completedCount, closedAt, closeVoting } = useResponseStatus(
    appointmentId,
    participantId,
  )

  // claude: 마감 성공 시에만 모달을 닫는다 - 실패하면 열어둔 채로 에러를 보여줘서 다시 시도할 수 있게 함.
  const handleClose = async () => {
    setCloseError('')
    const success = await closeVoting()
    if (success) {
      setShowCloseModal(false)
    } else {
      setCloseError('마감에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="page-stack">
      <p>관리자 대시보드 (약속 ID: {appointmentId})</p>
      {isLoading && <p>응답 현황을 불러오는 중...</p>}
      {!isLoading && error && <p className="field-error">{error}</p>}
      {!isLoading && !error && (
        <p>
          {headcount}명 중 {completedCount}명 완료
        </p>
      )}

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
          className="button--secondary"
          onClick={() => {
            setCloseError('')
            setShowCloseModal(true)
          }}
        >
          투표 마감하기
        </button>
      )}

      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)}>
        <strong>투표를 마감할까요?</strong>
        <p>마감하면 참여자들이 더 이상 일정을 수정할 수 없어요.</p>
        {closeError && <p className="field-error">{closeError}</p>}
        <button type="button" onClick={handleClose}>
          마감할게요
        </button>
        <button type="button" className="button--secondary" onClick={() => setShowCloseModal(false)}>
          취소
        </button>
      </Modal>
    </div>
  )
}

export default AdminDashboard
