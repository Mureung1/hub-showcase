import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import Badge from "../components/Badge.jsx"
import { SENTIMENT_META } from "../constants/sentiment.js"
import { getDecisions } from "../api/decisions.js"
import { useAuth } from "../context/AuthContext.jsx"

export default function InsightNote() {
  const { user } = useAuth()
  const [decisions, setDecisions] = useState([])

  useEffect(() => {
    if (!user) return
    getDecisions().then(setDecisions)
  }, [user])

  return (
    <div className="app-container">
      <header className="app-header">
        <Link className="back-link" to="/">
          ← Back to Today’s Top News
        </Link>
        <h1>Insight Notes</h1>
        <p className="page-subtitle">내가 읽고 판단한 기사들을 한눈에 복기해보세요</p>
      </header>

      {!user ? (
        <p className="page-subtitle">
          인사이트 노트는 로그인 후 볼 수 있어요. <Link to="/login">로그인하기</Link>
        </p>
      ) : (
        <main className="history-list">
          {decisions.length === 0 && (
            <p className="page-subtitle">아직 기록된 투자 판단이 없습니다.</p>
          )}
          {decisions.map((item) => {
            const sentiment = SENTIMENT_META[item.marketSentiment]

            return (
              <div className="history-item" key={item.id}>
                <p className="history-date">
                  {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                </p>
                <div className="history-card">
                  <h2 className="history-title">{item.title}</h2>

                  <div className="history-compare">
                    <div className="history-compare-item">
                      <p className="history-compare-label">나의 선택</p>
                      <Badge decision={item.decision} />
                    </div>
                    <div className="history-compare-item">
                      <p className="history-compare-label">시장의 해석</p>
                      {sentiment && (
                        <span className={`badge ${sentiment.tone}`}>{sentiment.label}</span>
                      )}
                    </div>
                  </div>

                  <details className="history-detail">
                    <summary>🔽 AI 관점 해설 보기</summary>
                    <ul className="history-summary">
                      {item.summaryBullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                    <p className="history-insight">{item.insight}</p>
                    <a
                      className="history-source-link"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      원문 기사 보러가기 ↗
                    </a>
                  </details>
                </div>
              </div>
            )
          })}
        </main>
      )}
    </div>
  )
}
