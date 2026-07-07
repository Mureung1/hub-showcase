import { Link } from 'react-router-dom'
import './Problem.css'

function Problem() {
  return (
    <div className="page problem-page">
      <Link to="/" className="back-btn">← 처음으로</Link>

      <h1 className="problem-heading">🤔 우리가 해결하려는 문제</h1>
      <p className="problem-sub">대학생이라면 한 번쯤 겪어봤을 고민, 우리결이 함께 풀어볼게요</p>

      <div className="problem-cards">
        <section className="problem-card meeting-card">
          <div className="card-icon-row">
            <span className="card-icon">🍽️</span>
            <span className="card-icon">💬</span>
            <span className="card-icon">👥</span>
          </div>
          <h2>과팅, 함께할 사람이 없어요</h2>
          <ul className="card-points">
            <li>😢 같이 나갈 사람이 없거나, 이어줄 사람이 마땅치 않아요</li>
            <li>🎲 에브리타임 등에서 아무나 만나면 성향이 전혀 다른 사람을 만날 수도 있어요</li>
          </ul>
          <div className="card-solution">
            <span className="solution-badge">우리결의 방법</span>
            <p>취미·연애 성향 테스트를 바탕으로 결이 맞는 사람들끼리 팀을 이루고, 팀 단위로 매칭해드려요 🧡</p>
          </div>
        </section>

        <div className="problem-divider" aria-hidden="true">
          <span>💛</span>
        </div>

        <section className="problem-card roommate-card">
          <div className="card-icon-row">
            <span className="card-icon">🏠</span>
            <span className="card-icon">🛏️</span>
            <span className="card-icon">🧺</span>
          </div>
          <h2>룸메이트, 성향이 안 맞아 힘들어요</h2>
          <ul className="card-points">
            <li>🎯 무작위 배정은 생활 성향이 어긋날 위험이 커요</li>
            <li>📸 에브리타임에서 맞는 사람을 찾으려 해도 정렬 안 된 게시글을 일일이 확인해야 해서 불편해요</li>
          </ul>
          <div className="card-solution">
            <span className="solution-badge">우리결의 방법</span>
            <p>생활 성향(+취미) 테스트 결과를 알고리즘으로 비교해서, 나와 결이 맞는 룸메이트 후보를 리스트로 보여드려요 💕</p>
          </div>
        </section>
      </div>
    </div>
  )
}

export default Problem
