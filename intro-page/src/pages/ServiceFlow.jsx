import { Link } from 'react-router-dom'
import RoadTimeline from '../components/RoadTimeline.jsx'
import './ServiceFlow.css'

const roommateSteps = [
  { label: '가입 · 인증', desc: '학교 인증 + 취미 발견 테스트로 첫걸음을 떼요 🎓' },
  { label: '분기 선택', desc: '연애 / 생활 성향 중 생활 성향을 골라 테스트를 진행해요 🧭' },
  { label: '세부 분기', desc: '친구같은 룸메(취미+생활 성향) / 비즈니스 룸메(생활 성향만) 중 선택해요 🏷️' },
  { label: '매칭 · 탐색', desc: '알고리즘 리스트업 → 프로필 확인 → 채팅방 생성까지 이어져요 💬' },
]

const meetingSteps = [
  { label: '과팅 개설', desc: '인원 선택(1:1~3:3) 후 연애 성향 테스트를 진행해요 📝' },
  { label: '동성 그룹 매칭', desc: '취미·연애 성향을 고려한 알고리즘으로 동성 팀원을 리스트업해요 👯' },
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

      <div className="flow-roads">
        <RoadTimeline
          title="룸메이트 매칭 흐름"
          emoji="🏠"
          accent="var(--pink-deep)"
          steps={roommateSteps}
        />
        <RoadTimeline
          title="과팅(3:3) 매칭 흐름"
          emoji="💑"
          accent="var(--coral-deep)"
          steps={meetingSteps}
        />
      </div>
    </div>
  )
}

export default ServiceFlow
