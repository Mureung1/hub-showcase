import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getDecisions } from "../api/decisions.js"
import { useAuth } from "../context/AuthContext.jsx"
import HistoryCard from "../components/HistoryCard.jsx"
import AccuracyTrend from "../components/AccuracyTrend.jsx"
import { groupDecisionsByMonth } from "../constants/decisionStats.js"

export default function InsightNote() {
  const { user } = useAuth()
  const [decisions, setDecisions] = useState([])

  useEffect(() => {
    if (!user) return
    getDecisions().then(setDecisions)
  }, [user])

  function handleMemoSaved(id, memo) {
    setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, memo } : d)))
  }

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
          <AccuracyTrend decisions={decisions} />
          {groupDecisionsByMonth(decisions).map((group) => (
            <section className="month-group" key={group.monthKey}>
              <h2 className="month-header">
                {group.monthLabel} —{" "}
                {group.ratePercent === null ? "판정 불가" : `적중률 ${group.ratePercent}%`}
              </h2>
              {group.items.map((item) => (
                <HistoryCard item={item} onMemoSaved={handleMemoSaved} key={item.id} />
              ))}
            </section>
          ))}
        </main>
      )}
    </div>
  )
}
