import { Link } from 'react-router-dom'
import ChallengeCard from '../components/ChallengeCard.jsx'
import DocumentCard from '../components/DocumentCard.jsx'
import { getOngoingChallenge } from '../data/challenges.js'
import { seedDocuments } from '../data/documents.js'
import './pages.css'

function HomePage() {
  const ongoing = getOngoingChallenge()
  const latestDocs = [...seedDocuments]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3)

  return (
    <div>
      <section className="rs-panel rs-hero">
        <h1>역기획서, 백지에서 시작하지 마세요</h1>
        <p>
          직군별 템플릿과 섹션별 가이드로 틀부터 배우고, 제출 즉시 AI 피드백을, 발행 후엔 커뮤니티의
          섹션별 코멘트를 받는 게임 기획 지망생의 작업실.
        </p>
        <div className="rs-hero-actions">
          <Link to="/write" className="rs-btn rs-btn-primary">
            첫 문서 시작하기
          </Link>
          <Link to="/guide" className="rs-btn">
            역기획서가 처음이라면
          </Link>
        </div>
      </section>

      {ongoing && (
        <section className="rs-home-section">
          <div className="rs-home-section-head">
            <h2>진행 중인 챌린지</h2>
            <Link to="/challenges">전체 보기</Link>
          </div>
          <ChallengeCard challenge={ongoing} />
        </section>
      )}

      <section className="rs-home-section">
        <div className="rs-home-section-head">
          <h2>최신 역기획서</h2>
          <Link to="/archive">둘러보기</Link>
        </div>
        <div className="rs-grid">
          {latestDocs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default HomePage
