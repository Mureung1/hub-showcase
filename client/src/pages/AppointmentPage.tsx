import { useLocation, useParams } from 'react-router'
import { useState } from 'react'
import { getSession, setSession } from '../lib/session.ts'   // study: session = 참여자 ID 및 role.
import { buildAppointmentLink } from '../lib/appointmentLink.ts'
import type { JoinAppointmentResponse } from 'shared'
import AdminDashboard from '../components/AdminDashboard.tsx'
import ParticipantDashboard from '../components/ParticipantDashboard.tsx'
import Modal from '../components/Modal.tsx'
import JoinAppointmentForm from '../components/JoinAppointmentForm.tsx'

type LocationState = { justCreated?: boolean }

function AppointmentPage() {
  const { id } = useParams()
  const location = useLocation() // study: NewAppointmentPage 에서 보낸, just Created 같은 state 가져옴
  const appointmentId = id ?? '' // study: 왼쪽 값, 없으면 오른 쪽 값.
  const [session, setSessionState] = useState(() => getSession(appointmentId)) // study: 브라우저에 appointmentId 관련 저장되어있나 getSession 으로 확인 및 React session state에 업데이트.
  const [showCreatedModal, setShowCreatedModal] = useState(
    Boolean((location.state as LocationState | null)?.justCreated),
  ) // study: location.state 값은 위에서 정한 LocationState일수도, null일수도 있다, 없을수도(?), 있다면 Boolean으로 저장.

  const handleJoinSuccess = (response: JoinAppointmentResponse, targetId: string) => {
    // claude: 묶음6 실제 API 연동. 참여 성공 응답의 실제 participantId/role로 세션을 채운다(콜백 매개변수명을 targetId로 바꿔 위 useParams의 id와 겹치지 않게 함. targetId는 appointmentId와 같은 값)
    const newSession = { participantId: response.participantId, role: response.role }
    setSession(targetId, newSession) // study: localStorage(브라우저)에 저장하기 위함, 아래는
    setSessionState(newSession) // study: 현재 화면 상태관련 session 을 업데이트 하기 위함(React 관련)
  }

// study: session 을 모르면 일단 Form 을 보여준다. 실제로 존재하는지, 존재한다면 로그인 올바른지 등은 Form 에서 모두 판단.
  if (!session) {
    return <JoinAppointmentForm appointmentId={appointmentId} onSuccess={handleJoinSuccess} />
  }
  // study: Modal 에서 props는 총 3개. open, onClose, 그리고 children은 자동으로 Modal 태그 사이 내용 전부가 들어감.
  return (
    <>
      {session.role === 'admin' ? (
        <AdminDashboard appointmentId={appointmentId} />
      ) : (
        <ParticipantDashboard appointmentId={appointmentId} />
      )}

      <Modal open={showCreatedModal} onClose={() => setShowCreatedModal(false)}>
        <strong>약속이 생성되었어요! 🎉</strong>
        <p>아래 링크를 참여자에게 공유해주세요.</p>
        <div className="page-stack">{buildAppointmentLink(appointmentId)}</div>
        <button type="button" onClick={() => setShowCreatedModal(false)}>
          완료
        </button>
      </Modal>
    </>
  )
}

export default AppointmentPage
