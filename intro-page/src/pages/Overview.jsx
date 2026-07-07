import { Link } from 'react-router-dom'
import './Overview.css'

const infoCards = [
  { emoji: '🏫', label: '누구를 위한 서비스일까요?', value: '학교 인증을 받은 대학생이라면 누구나! 과팅 상대를 찾는 친구, 룸메이트를 찾는 친구 모두 환영이에요' },
  { emoji: '💌', label: '무엇을 만들고 있나요?', value: '취미·성향 테스트 하나로 "과팅"과 "룸메이트 매칭" 두 가지를 모두 이어주는 웹사이트예요' },
  { emoji: '🛠️', label: '어떤 기술로 만드나요?', value: 'React 프론트엔드 + Node.js·Express 백엔드 + MySQL 데이터베이스로 차근차근 만들고 있어요' },
  { emoji: '🗓️', label: '어떻게 만들고 있나요?', value: '한 사람이 4주 동안 기획부터 배포까지 직접 만들어가는 프로젝트예요' },
]

function Overview() {
  return (
    <div className="page overview-page">
      <Link to="/" className="back-btn">← 처음으로</Link>

      <div className="overview-hero">
        <h1>📖 프로젝트 개요</h1>
        <p className="overview-lead">
          안녕하세요, <strong>우리결</strong>이에요 🧡
          <br />
          이름처럼 나와 결이 잘 맞는 사람을 만날 수 있도록 돕는,
          <br />
          대학생을 위한 취미·성향 기반 매칭 서비스예요.
        </p>
        <p className="overview-lead-sub">
          같이 밥 먹을 사람이 없어 고민이거나, 룸메이트랑 안 맞아서 힘들었던 적 있으신가요?
          <br />
          우리결은 하나의 취미·성향 테스트로 <strong>과팅(그룹 매칭)</strong>과{' '}
          <strong>룸메이트 매칭</strong>을 모두 이어드려요.
        </p>
      </div>

      <div className="overview-grid">
        {infoCards.map((card) => (
          <div className="overview-card" key={card.label}>
            <span className="overview-card-emoji">{card.emoji}</span>
            <h3>{card.label}</h3>
            <p>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="overview-footer">
        <p>🌱 지금은 화면 흐름을 먼저 만들고, 진짜 인증·테스트·매칭 로직을 하나씩 붙여가는 중이에요.</p>
        <p>완성되면 학교 인증부터 성향 테스트, 매칭, 채팅까지 한 번에 경험할 수 있게 될 거예요!</p>
      </div>
    </div>
  )
}

export default Overview
