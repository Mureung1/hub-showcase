import { useLocation, useParams } from 'react-router'
import { useState } from 'react'
import { getRole, setRole } from '../lib/session.ts'
import AdminDashboard from './AdminDashboard.tsx'
import ParticipantDashboard from './ParticipantDashboard.tsx'
import Modal from '../components/Modal.tsx'

type LocationState = { justCreated?: boolean }

function AppointmentPage() {
  const { id } = useParams() 
  const location = useLocation() // study: NewAppointmentPage 에서 보낸, just Created 같은 state 가져옴
  const appointmentId = id ?? '' // study: 왼쪽 값, 없으면 오른 쪽 값.
  const [role, setRoleState] = useState(() => getRole(appointmentId)) // study: state 만드는데 처음에만 Id로 getRole 해옴.(admin인지 사용자인지)
  const [showCreatedModal, setShowCreatedModal] = useState(
    Boolean((location.state as LocationState | null)?.justCreated), 
  ) // study: location.state 값은 위에서 정한 LocationState일수도, null일수도 있다, 없을수도(?), 있다면 Boolean으로 저장.

  const handleJoin = () => {
    // Day1 뼈대 단계라 이름/비밀번호 검증 없이 참여자로 처리한다 (Day3에서 교체).
    setRole(appointmentId, 'participant') // study: localStorage(브라우저)에 저장하기 위함
    setRoleState('participant') // study: 현재 role을 업데이트 하기 위함
  }

  // study: !role=링크클릭입장=localStorage에 role 안남아있는 경우 ->apoointmentId disabled(수정불가)
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
  // study: Modal 에서 props는 총 3개. open, onClose, 그리고 children은 자동으로 Modal 태그 사이 내용 전부가 들어감.
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
