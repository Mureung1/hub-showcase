import { Link } from 'react-router'
import { useState } from 'react'
import Modal from '../components/Modal.tsx'

type AdminDashboardProps = {
  appointmentId: string
}

function AdminDashboard({ appointmentId }: AdminDashboardProps) {
  const [showCloseModal, setShowCloseModal] = useState(false) 
  // study: useState의 초기값이 false 인 이유 = 결과 확정 확인 modal 창은 버튼을 눌러야 나오기 때문. 아래 button 에서 click event 발생시 true로 변경. 투표 생성 시 바로 나온 것과 반대


  return (
    <div className="page-stack">
      <p>관리자 대시보드 (약속 ID: {appointmentId})</p>
      <Link to={`/a/${appointmentId}/schedule`} className="button">
        일정 투표하기
      </Link>
      <button type="button" className="button--secondary" onClick={() => setShowCloseModal(true)}> 
        투표 마감하기
      </button>

      <Modal open={showCloseModal} onClose={() => setShowCloseModal(false)}>
        <strong>투표를 마감할까요?</strong>
        <p>마감 후에도 필요하면 언제든 다시 열 수 있어요.</p>
        <button type="button" onClick={() => setShowCloseModal(false)}>
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
