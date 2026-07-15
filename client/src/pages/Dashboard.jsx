import { useEffect, useState } from "react"
import NewsCard from "../components/NewsCard.jsx"
import { getDashboardArticles } from "../api/dashboard.js"

export default function Dashboard() {
  const [articles, setArticles] = useState([])

  useEffect(() => {
    getDashboardArticles().then(setArticles)
  }, [])

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Today’s Top News</h1>
        <p className="page-subtitle">번역기 없이, 원문 그대로 이해하는 3개의 뉴스</p>
      </header>

      <main className="news-list">
        {articles.map((article) => (
          <NewsCard key={article.id} article={article} />
        ))}
      </main>
    </div>
  )
}
