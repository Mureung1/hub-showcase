import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import Badge from "../components/Badge.jsx"
import { getDecisions } from "../api/decisions.js"

export default function MyPage() {
  const [decisions, setDecisions] = useState([])

  useEffect(() => {
    getDecisions().then(setDecisions)
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <Link className="back-link" to="/">
          ← Back to Today’s Top News
        </Link>
        <h1>Investment Decision History</h1>
        <p className="page-subtitle">내가 읽고 판단한 기사들을 한눈에 복기해보세요</p>
      </header>

      <main className="history-list">
        {decisions.length === 0 && (
          <p className="page-subtitle">아직 기록된 투자 판단이 없습니다.</p>
        )}
        {decisions.map((item) => (
          <div className="history-item" key={item.id}>
            <p className="history-date">{new Date(item.createdAt).toLocaleDateString("ko-KR")}</p>
            <div className="history-card">
              <h2 className="history-title">{item.title}</h2>
              <ul className="history-summary">
                {item.summaryBullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
              <Badge decision={item.decision} />
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
