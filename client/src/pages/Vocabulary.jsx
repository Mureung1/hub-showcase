import { useState } from "react"
import { Link } from "react-router-dom"
import { vocabularyMock } from "../mock/vocabularyMock.js"

function sortByAddedAtDesc(vocabulary) {
  return [...vocabulary].sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
}

export default function Vocabulary() {
  // 실제 백엔드 연동 시 useState 초기값을 fetch 결과로 교체하면 된다
  // (GET /api/vocabulary, docs/api-spec.md 4번).
  const [vocabulary] = useState(() => sortByAddedAtDesc(vocabularyMock))

  function handleSourceClick(item) {
    // TODO: 백엔드 연동 후 실제 리더뷰 이동(`/reader?url=...`)으로 교체
    console.log("navigate to reader:", item.articleUrl)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <Link className="back-link" to="/">
          ← 오늘의 핵심 외신으로
        </Link>
        <h1>단어장</h1>
        <p className="page-subtitle">오늘 읽은 기사 속 핵심 용어를 최신순으로 모아봤어요</p>
      </header>

      <main className="vocabulary-list">
        {vocabulary.map((item) => (
          <div className="vocabulary-card" key={`${item.term}-${item.addedAt}`}>
            <h2 className="vocabulary-term">{item.term}</h2>
            <p className="vocabulary-definition">{item.definition}</p>
            <button
              type="button"
              className="vocabulary-source"
              onClick={() => handleSourceClick(item)}
            >
              {item.articleTitle}
            </button>
          </div>
        ))}
      </main>
    </div>
  )
}
