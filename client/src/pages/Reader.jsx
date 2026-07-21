import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import AiSummary from "../components/AiSummary.jsx"
import BottomSheet from "../components/BottomSheet.jsx"
import DecisionButtons from "../components/DecisionButtons.jsx"
import ReaderSkeleton from "../components/ReaderSkeleton.jsx"
import SentenceAccordion from "../components/SentenceAccordion.jsx"
import { parseArticle, analyzeArticle } from "../api/article.js"
import { saveDecision } from "../api/decisions.js"
import { useAuth } from "../context/AuthContext.jsx"

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
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const url = searchParams.get("url")
  const [article, setArticle] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [pendingDecision, setPendingDecision] = useState(null)

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
    // 서버 저장은 바텀시트를 닫는 시점(handleCloseSheet)에 처리한다.
    // 여기서는 시트만 연다.
    setPendingDecision(decision)
  }

  function handleCloseSheet() {
    // decisions는 로그인 사용자별 데이터라 비로그인 상태에서는 저장을
    // 건너뛴다(llmService.js의 saveTermsToVocabulary와 동일한 패턴) — 저장
    // 실패를 setError로 올리면 방금 다 읽은 리더뷰가 에러 화면으로 덮인다.
    if (user) {
      saveDecision({
        url,
        title: article.title,
        summaryBullets: analysis?.summaryBullets ?? [],
        decision: pendingDecision,
        marketSentiment: analysis?.marketSentiment,
        insight: analysis?.insight,
      }).catch((err) => setError(err.message))
    }

    setPendingDecision(null)
  }

  if (error) return <div className="app-container">{error}</div>
  if (!article) return <ReaderSkeleton />
  if (!analysis) return <ReaderSkeleton article={article} />

  return (
    <div className="app-container">
      <header className="app-header">
        <Link className="back-link" to="/">
          ← Back to Today’s Top News
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
      </main>

      <DecisionButtons onDecide={handleDecide} />

      {pendingDecision && (
        <BottomSheet
          decision={pendingDecision}
          marketSentiment={analysis.marketSentiment}
          insight={analysis.insight}
          onClose={handleCloseSheet}
        />
      )}
    </div>
  )
}
