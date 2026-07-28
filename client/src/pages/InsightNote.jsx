import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getDecisions } from "../api/decisions.js"
import { useAuth } from "../context/AuthContext.jsx"
import InsightDetail from "../components/InsightDetail.jsx"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"]

function InsightCalendarPlaceholder() {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="insight-calendar-grid">
      {WEEKDAYS.map((day) => (
        <div className="insight-calendar-weekday" key={day}>
          {day}
        </div>
      ))}
      {cells.map((day, i) =>
        day === null ? (
          <div className="insight-calendar-day empty" key={`empty-${i}`} />
        ) : (
          <div className="insight-calendar-day" key={day}>
            {day}
          </div>
        ),
      )}
    </div>
  )
}

export default function InsightNote() {
  const { user } = useAuth()
  const [decisions, setDecisions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [viewMode, setViewMode] = useState("list")

  useEffect(() => {
    if (!user) return
    getDecisions().then((data) => {
      setDecisions(data)
      if (data.length > 0) setSelectedId(data[0].id)
    })
  }, [user])

  function handleMemoSaved(id, memo) {
    setDecisions((prev) => prev.map((d) => (d.id === id ? { ...d, memo } : d)))
  }

  const filteredDecisions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return decisions.filter((item) => {
      if (query && !item.title.toLowerCase().includes(query)) return false
      const createdDate = item.createdAt.slice(0, 10)
      if (dateFrom && createdDate < dateFrom) return false
      if (dateTo && createdDate > dateTo) return false
      return true
    })
  }, [decisions, searchQuery, dateFrom, dateTo])

  const selected = decisions.find((item) => item.id === selectedId) ?? null

  if (!user) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Insight Notes</h1>
          <p className="page-subtitle">내가 읽고 판단한 기사들을 한눈에 복기해보세요</p>
        </header>
        <p className="page-subtitle">
          인사이트 노트는 로그인 후 볼 수 있어요. <Link to="/login">로그인하기</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="insight-note-layout">
      <section className="insight-master">
        <div className="insight-master-header">
          <input
            className="insight-search"
            type="search"
            placeholder="제목으로 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="insight-date-filter">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="시작일" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="종료일" />
          </div>
          <div className="insight-view-toggle">
            <button
              type="button"
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              리스트
            </button>
            <button
              type="button"
              className={viewMode === "calendar" ? "active" : ""}
              onClick={() => setViewMode("calendar")}
            >
              캘린더
            </button>
          </div>
        </div>

        <div className="insight-master-list">
          {viewMode === "calendar" ? (
            <InsightCalendarPlaceholder />
          ) : (
            <>
              {filteredDecisions.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`insight-card ${item.id === selectedId ? "active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <p className="insight-card-title">{item.title}</p>
                  <p className="insight-card-preview">{item.insight}</p>
                  <p className="insight-card-date">
                    {new Date(item.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </button>
              ))}
              {filteredDecisions.length === 0 && (
                <p className="insight-master-empty">
                  {decisions.length === 0 ? "아직 기록된 투자 판단이 없습니다." : "조건에 맞는 노트가 없습니다."}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="insight-detail">
        {selected ? (
          <InsightDetail key={selected.id} item={selected} onMemoSaved={handleMemoSaved} />
        ) : (
          <p className="insight-detail-empty">노트를 선택하세요</p>
        )}
      </section>
    </div>
  )
}
