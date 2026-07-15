import { useLocation, useParams } from 'react-router'
import { useEffect, useState } from 'react'
import axios from 'axios'
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
  const [checking, setChecking] = useState(role === null) // study: 예약을 checking 해야하는가? role === null 이라면 해야한다.(!role=링크 클릭 입장=localStorage에 role 안남아있는 경우)
  const [notFound, setNotFound] = useState(false) // study: 예약에 관한 상태. 기본은 notFound 가 false, 즉 존재한다 가정.

  useEffect(() => { // study: 페이지 나타날 때 자동으로 실행됨.
    if (role) return 
    let cancelled = false
    axios // study: 요청 보낼 때 사용(fetch와 유사)
      .get(`/api/appointments/${appointmentId}`)
      .catch(() => { // study: try catch에서의 그 catch. 에러 났을 경우, notFound
        if (!cancelled) setNotFound(true) // study: cancelled(화면 닫혔는지) 확인해야 함
      })
      .finally(() => { // study: catch 여부와 무관하게 반드시 수행. Checking 끝났으므로 false.
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true // study: 이 컴포넌트(페이지)가 종료될 때 calcelled 를 true로 설정함. cancelled 설정 및 확인하지 않으면 페이지가 사라졌음에도 요청이 처리되다 에러 발생 가능. 
    }
  }, [appointmentId, role]) // study: appointmentId나 role 값이 바뀌면, 이 useEffect를 다시 실행

  const handleJoin = () => {
    // Day1 뼈대 단계라 이름/비밀번호 검증 없이 참여자로 처리한다 (Day3에서 교체).
    setRole(appointmentId, 'participant') // study: localStorage(브라우저)에 저장하기 위함
    setRoleState('participant') // study: 현재 role을 업데이트 하기 위함
  }


  if (!role) {
    if (checking) { // study: role 을 모르는데 checking 중인 상황이라면.
      return <div className="page-stack">확인하는 중...</div>
    }

    if (notFound) { // study: role 모르는데 notFound 결정 났다면.
      return <div className="page-stack">존재하지 않는 약속이에요.</div>
    }
  // study: !role=링크 클릭 입장=localStorage에 role 안남아있는 경우 ->apoointmentId disabled(수정불가)
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
