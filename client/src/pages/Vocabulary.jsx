import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getVocabulary } from "../api/vocabulary.js"

export default function Vocabulary() {
  const navigate = useNavigate()
  const [vocabulary, setVocabulary] = useState([])

  useEffect(() => {
    getVocabulary().then(setVocabulary)
  }, [])

  function handleSourceClick(item) {
    navigate(`/reader?url=${encodeURIComponent(item.articleUrl)}`)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <Link className="back-link" to="/">
          ← Back to Today’s Top News
        </Link>
        <h1>Vocabulary</h1>
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
