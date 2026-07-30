import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getVocabulary, deleteVocabularyTerms } from "../api/vocabulary.js"
import { useAuth } from "../context/AuthContext.jsx"
import { useVocabularyCount } from "../context/VocabularyContext.jsx"
import VocabularyCard from "../components/VocabularyCard.jsx"

function formatDateLabel(dateKey) {
  return new Date(dateKey).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

export default function Vocabulary() {
  const { user } = useAuth()
  const { setVocabularyCount } = useVocabularyCount()
  const [vocabulary, setVocabulary] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    if (!user) return
    getVocabulary().then((data) => {
      setVocabulary(data)
      if (data.length > 0) setSelectedDate(data[0].addedAt.slice(0, 10))
    })
  }, [user])

  const dateGroups = useMemo(() => {
    const map = new Map()
    for (const item of vocabulary) {
      const dateKey = item.addedAt.slice(0, 10)
      if (!map.has(dateKey)) map.set(dateKey, [])
      map.get(dateKey).push(item)
    }
    return Array.from(map.entries()).map(([dateKey, items]) => ({ dateKey, items }))
  }, [vocabulary])

  const selectedGroup = dateGroups.find((group) => group.dateKey === selectedDate) ?? null

  async function handleDeleteDateGroup(e, dateKey, ids) {
    e.stopPropagation()
    if (!window.confirm(`${formatDateLabel(dateKey)}에 저장된 단어 ${ids.length}개를 모두 삭제하시겠습니까?`)) return
    await deleteVocabularyTerms(ids)
    setVocabulary((prev) => {
      const next = prev.filter((v) => !ids.includes(v.id))
      setVocabularyCount(next.length)
      return next
    })
  }

  async function handleDeleteTerm(id) {
    if (!window.confirm("이 단어를 삭제하시겠습니까?")) return
    await deleteVocabularyTerms([id])
    setVocabulary((prev) => {
      const next = prev.filter((v) => v.id !== id)
      setVocabularyCount(next.length)
      return next
    })
  }

  if (!user) {
    return (
      <div className="app-container">
        <header className="app-header">
          <h1>Vocabulary</h1>
          <p className="page-subtitle">오늘 읽은 기사 속 핵심 용어를 최신순으로 모아봤어요. 카드를 탭해서 뒤집어 보세요.</p>
        </header>
        <p className="page-subtitle">
          단어장은 로그인 후 볼 수 있어요. <Link to="/login">로그인하기</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="vocabulary-note-layout">
      <section className="vocabulary-master">
        <div className="vocabulary-master-header">
          <h1>Vocabulary</h1>
        </div>

        <div className="vocabulary-master-list">
          {dateGroups.map((group) => (
            <div
              role="button"
              tabIndex={0}
              key={group.dateKey}
              className={`vocabulary-date-card ${group.dateKey === selectedDate ? "active" : ""}`}
              onClick={() => setSelectedDate(group.dateKey)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelectedDate(group.dateKey)
                }
              }}
            >
              <div className="vocabulary-date-card-header">
                <p className="vocabulary-date-card-label">{formatDateLabel(group.dateKey)}</p>
                <button
                  type="button"
                  className="vocabulary-date-card-delete"
                  onClick={(e) =>
                    handleDeleteDateGroup(
                      e,
                      group.dateKey,
                      group.items.map((item) => item.id),
                    )
                  }
                >
                  삭제
                </button>
              </div>
              <p className="vocabulary-date-card-preview">
                {group.items.map((item) => item.term).join(", ")}
              </p>
              <p className="vocabulary-date-card-count">{group.items.length}개 단어</p>
            </div>
          ))}
          {dateGroups.length === 0 && (
            <p className="vocabulary-master-empty">아직 적재된 단어가 없습니다.</p>
          )}
        </div>
      </section>

      <section className="vocabulary-detail">
        {selectedGroup ? (
          <>
            <header className="vocabulary-detail-header">
              {formatDateLabel(selectedGroup.dateKey)} · {selectedGroup.items.length}개 단어
            </header>
            <div className="vocabulary-detail-list">
              {selectedGroup.items.map((item) => (
                <VocabularyCard item={item} key={item.id} onDelete={() => handleDeleteTerm(item.id)} />
              ))}
            </div>
          </>
        ) : (
          <p className="vocabulary-detail-empty">날짜를 선택하세요</p>
        )}
      </section>
    </div>
  )
}
