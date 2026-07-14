import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import AiSummary from "../components/AiSummary.jsx"
import AiInsight from "../components/AiInsight.jsx"
import DecisionButtons from "../components/DecisionButtons.jsx"
import SentenceAccordion from "../components/SentenceAccordion.jsx"
import { parseArticle, analyzeArticle } from "../api/article.js"
import { saveDecision } from "../api/decisions.js"

// LLM이 구조상 어렵다고 선별한 문장(analysis.sentences)만 아코디언으로
// 감싸고, 나머지는 원문 그대로 둔다(전체 문장을 다 감싸지 않음).
function renderParagraph(text, sentences) {
  const matches = sentences.filter((s) => text.includes(s.text))
  if (matches.length === 0) return text

  const pattern = new RegExp(
    `(${matches.map((s) => s.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  )

  return text.split(pattern).map((part, i) => {
    const match = matches.find((s) => s.text === part)
    return match ? <SentenceAccordion key={i} sentence={match} /> : part
  })
}

export default function Reader() {
  const [searchParams] = useSearchParams()
  const url = searchParams.get("url")
  const [article, setArticle] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!url) return

    // parse가 성공한 뒤에만 analyze를 호출한다 — 스크래핑과 AI 추론을 한
    // 요청으로 합치면 HTTP Timeout 위험이 커진다(CLAUDE.md "API 분리 원칙").
    parseArticle(url)
      .then((parsed) => {
        setArticle(parsed)
        return analyzeArticle(parsed.paragraphs, parsed.title, url)
      })
      .then(setAnalysis)
      .catch((err) => setError(err.message))
  }, [url])

  function handleDecide(decision) {
    saveDecision({
      url,
      title: article.title,
      summaryBullets: analysis?.summaryBullets ?? [],
      decision,
      marketSentiment: analysis?.marketSentiment,
    }).catch((err) => setError(err.message))
  }

  if (error) return <div className="app-container">{error}</div>
  if (!article || !analysis) return <div className="app-container">불러오는 중...</div>

  return (
    <div className="app-container">
      <header className="app-header">
        <Link className="back-link" to="/">
          ← 오늘의 핵심 외신으로
        </Link>
        <div className="card-source">
          <span className="source-logo">{article.sourceInitial}</span>
          <span className="source-name">{article.source}</span>
        </div>
        <h1>{article.title}</h1>
      </header>

      <main>
        <article className="article-content">
          {article.paragraphs.map((paragraph, i) => (
            <div className="paragraph" key={i}>
              {renderParagraph(paragraph, analysis.sentences)}
            </div>
          ))}
        </article>

        <AiSummary bullets={analysis.summaryBullets} />
        <AiInsight text={analysis.insight} marketSentiment={analysis.marketSentiment} />
      </main>

      <DecisionButtons onDecide={handleDecide} />
    </div>
  )
}
