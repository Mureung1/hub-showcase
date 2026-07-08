import { Link } from 'react-router-dom'
import ServiceTree from '../components/ServiceTree.jsx'
import './ServiceFlow.css'

const roommateSteps = [
  { label: '생활 성향 테스트', desc: '여러 질문으로 여러분의 생활 성향을 테스트해요 🧩' },
  { label: '세부 분기', desc: '친구같은 룸메(취미+생활 성향) / 비즈니스 룸메(생활 성향만) 중 선택해요 💞' },
  { label: '매칭 · 탐색', desc: '알고리즘 리스트업 → 프로필 확인 → 채팅방 생성까지 이어져요 💬' },
]

const meetingSteps = [
  { label: '인원 선택 및 연애 성향 테스트', desc: '원하는 과팅 인원을 선택 후 연애 성향 테스트로 여러분의 연애 성향을 알아봐요 📝' },
  { label: '동성 그룹 매칭', desc: '취미·연애 성향을 고려한 알고리즘으로 동성 팀원을 리스트업해요. 함께 나갈 친구가 있다면 초대해요 🙌🏻' },
  { label: '팀 구성', desc: '프로필 확인 → 채팅방 생성 → 팀을 확정해요 🤝' },
  { label: '이성 그룹 매칭', desc: '팀 단위 취미+연애 성향 유사도로 상대 팀을 매칭해요 💘' },
  { label: '오프라인 연결', desc: '채팅 → 장소 조율 → 만남 → 애프터 (MVP 범위 밖) 🌤️' },
]

function ServiceFlow() {
  return (
    <div className="page flow-page">
      <Link to="/" className="back-btn">← 처음으로</Link>

      <h1 className="flow-heading">🛤️ 서비스 흐름</h1>
      <p className="flow-sub">가입부터 매칭까지, 우리결과 함께 걷는 길이에요</p>

      <ServiceTree roommateSteps={roommateSteps} meetingSteps={meetingSteps} />
    </div>
  )
}

export default ServiceFlow
