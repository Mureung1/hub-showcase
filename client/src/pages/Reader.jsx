import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import ReaderDetail from "../components/ReaderDetail.jsx"
import { getDashboardArticles } from "../api/dashboard.js"
import { DIFFICULTY_META, toDifficultyTier } from "../constants/difficulty.js"

export default function Reader() {
  const [searchParams] = useSearchParams()
  const [todayArticles, setTodayArticles] = useState([])
  const [selectedUrl, setSelectedUrl] = useState(searchParams.get("url"))

  useEffect(() => {
    getDashboardArticles().then((articles) => {
      setTodayArticles(articles)
      const initialUrl = searchParams.get("url")
      const matched = initialUrl && articles.some((a) => a.url === initialUrl)
      if (!matched && articles.length > 0) setSelectedUrl(articles[0].url)
    })
  }, [])

  return (
    <div className="reader-note-layout">
      <section className="reader-master">
        <div className="reader-master-header">
          <h1>Today’s Top News</h1>
        </div>

        <div className="reader-master-list">
          {todayArticles.map((article) => {
            const difficulty =
              article.readabilityScore != null
                ? DIFFICULTY_META[toDifficultyTier(article.readabilityScore)]
                : null
            return (
              <button
                type="button"
                key={article.id}
                className={`reader-card ${article.url === selectedUrl ? "active" : ""}`}
                onClick={() => setSelectedUrl(article.url)}
              >
                <div className="card-source">
                  <span className="source-logo">{article.sourceInitial}</span>
                  <span className="source-name">{article.source}</span>
                  {difficulty && <span className={`badge ${difficulty.tone}`}>{difficulty.label}</span>}
                </div>
                <p className="reader-card-headline">{article.headline}</p>
                <p className="reader-card-translation">{article.translation}</p>
              </button>
            )
          })}
          {todayArticles.length === 0 && (
            <p className="reader-master-empty">오늘의 기사를 불러오는 중...</p>
          )}
        </div>
      </section>

      <section className="reader-detail">
        {selectedUrl ? (
          <ReaderDetail key={selectedUrl} url={selectedUrl} />
        ) : (
          <p className="reader-detail-empty">기사를 선택하세요</p>
        )}
      </section>
    </div>
  )
}
