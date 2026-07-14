import { useLocation, useParams } from 'react-router'
import { useState } from 'react'
import { getRole, setRole } from '../lib/session.ts'
import AdminDashboard from './AdminDashboard.tsx'
import ParticipantDashboard from './ParticipantDashboard.tsx'
import Modal from '../components/Modal.tsx'

type LocationState = { justCreated?: boolean }

function AppointmentPage() {
  const { id } = useParams()
  const location = useLocation()
  const appointmentId = id ?? ''
  const [role, setRoleState] = useState(() => getRole(appointmentId))
  const [showCreatedModal, setShowCreatedModal] = useState(
    Boolean((location.state as LocationState | null)?.justCreated),
  )

  const handleJoin = () => {
    // Day1 뼈대 단계라 이름/비밀번호 검증 없이 참여자로 처리한다 (Day3에서 교체).
    setRole(appointmentId, 'participant')
    setRoleState('participant')
  }

  if (!role) {
    return (
      <div className="page-stack">
        <label>
          약속 코드
          <input value={appointmentId} disabled />
        </label>
        <label>
          이름
          <input placeholder="이름을 입력하세요" />
        </label>
        <label>
          간편 비밀번호
          <input type="password" placeholder="숫자 4자리" />
        </label>
        <button type="button" onClick={handleJoin}>
          참여하기
        </button>
      </div>
    )
  }

  return (
    <>
      {role === 'admin' ? (
        <AdminDashboard appointmentId={appointmentId} />
      ) : (
        <ParticipantDashboard appointmentId={appointmentId} />
      )}

      <Modal open={showCreatedModal} onClose={() => setShowCreatedModal(false)}>
        <strong>약속이 생성되었어요! 🎉</strong>
        <p>아래 링크를 참여자에게 공유해주세요.</p>
        <div className="page-stack">{`${window.location.origin}/a/${appointmentId}`}</div>
        <button type="button" onClick={() => setShowCreatedModal(false)}>
          완료
        </button>
      </Modal>
    </>
  )
}

export default AppointmentPage
