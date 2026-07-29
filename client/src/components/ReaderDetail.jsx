import { useEffect, useRef, useState } from "react"
import AiSummary from "./AiSummary.jsx"
import BottomSheet from "./BottomSheet.jsx"
import DecisionButtons from "./DecisionButtons.jsx"
import ReaderSkeleton from "./ReaderSkeleton.jsx"
import SentenceAccordion from "./SentenceAccordion.jsx"
import Toast from "./Toast.jsx"
import { parseArticle, analyzeArticle, analyzeArticleDetails } from "../api/article.js"
import { saveDecision } from "../api/decisions.js"
import { logArticleRead } from "../api/articleReads.js"
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

export default function ReaderDetail({ url }) {
  const { user } = useAuth()
  const [article, setArticle] = useState(null)
  // fast lane(sentences+summaryBullets) — 이게 도착해야 인터랙티브 리더뷰로
  // 전환한다. slow lane(terms+insight+marketSentiment)은 판단 전까지 블라인드
  // 처리되는 값이라 백그라운드에서 준비되고, 도착 전엔 null로 남는다.
  const [fastAnalysis, setFastAnalysis] = useState(null)
  const [slowAnalysis, setSlowAnalysis] = useState(null)
  const [error, setError] = useState(null)
  const [pendingDecision, setPendingDecision] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)

  // 완독(읽기 완료)/판단 분리 로깅(기능③, GitHub #16)에 쓰는 ref들.
  // hasReachedEndRef: 판단버튼 영역 도달 여부(완독 기준). readLoggedRef:
  // 세션당 article_reads 1회만 기록되도록 하는 중복 방지 플래그.
  // decisionButtonsWrapRef: IntersectionObserver 관찰 대상.
  // articleRef/userRef: unmount cleanup에서 최신 값을 읽기 위한 미러.
  const hasReachedEndRef = useRef(false)
  const readLoggedRef = useRef(false)
  const decisionButtonsWrapRef = useRef(null)
  const articleRef = useRef(null)
  const userRef = useRef(null)
  // slow lane의 in-flight Promise. handleCloseSheet가 바텀시트를 닫는 시점에
  // slowAnalysis state가 아직 null이면(독해가 유난히 빠른 경우) 저장 전에
  // 이 Promise를 기다린다. 실패해도 null로 resolve해 절대 reject하지 않는다.
  const slowAnalysisPromiseRef = useRef(null)

  useEffect(() => {
    articleRef.current = article
  }, [article])

  useEffect(() => {
    userRef.current = user
  }, [user])

  // 기사/분석 콘텐츠가 렌더링된 뒤, 판단버튼 영역이 뷰포트에 들어오면
  // 완독으로 간주한다(스크롤 비율 대신 판단버튼 도달을 기준으로 삼음 —
  // DecisionButtons가 기사 최하단에 정적 배치돼 있어 도달 자체가 완독의
  // 자연스러운 증거).
  useEffect(() => {
    if (!article || !fastAnalysis) return
    const target = decisionButtonsWrapRef.current
    if (!target) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        hasReachedEndRef.current = true
        observer.disconnect()
      }
    })
    observer.observe(target)

    return () => observer.disconnect()
  }, [article, fastAnalysis])

  // 판단 없이 이탈(SPA 내 라우트 이동/뒤로가기)해도 완독은 별도로 기록한다
  // (docs/plan.md 2026-07-13 정책). 브라우저 탭 닫기/새로고침은 스코프 밖.
  useEffect(() => {
    return () => {
      if (userRef.current && hasReachedEndRef.current && !readLoggedRef.current && articleRef.current) {
        readLoggedRef.current = true
        logArticleRead({ url, title: articleRef.current.title, decisionId: null }).catch(() => {})
      }
    }
  }, [url])

  useEffect(() => {
    if (!url) return

    // parse가 성공한 뒤에만 analyze를 호출한다 — 스크래핑과 AI 추론을 한
    // 요청으로 합치면 HTTP Timeout 위험이 커진다(CLAUDE.md "API 분리 원칙").
    parseArticle(url)
      .then((parsed) => {
        setArticle(parsed)

        // fast/slow lane을 병렬로 시작한다. slow lane(terms/insight/
        // marketSentiment)은 판단 전까지 화면에 안 쓰이는 값이라 fast lane
        // 완료를 기다리지 않고 최대한 일찍 출발시켜야 독해 시간을 벌 수 있다.
        analyzeArticle(parsed.paragraphs, parsed.title, url)
          .then(setFastAnalysis)
          .catch((err) => setError(err.message))

        slowAnalysisPromiseRef.current = analyzeArticleDetails(parsed.paragraphs, parsed.title, url)
          .then((result) => {
            setSlowAnalysis(result)
            return result
          })
          .catch((err) => {
            // slow lane은 블라인드 필드+단어장 부수효과일 뿐이라, 실패해도
            // 이미 완성된 리더뷰 화면을 에러로 덮지 않는다(CLAUDE.md 패턴).
            console.warn("[Reader] slow analyze failed:", err.message)
            return null
          })
      })
      .catch((err) => setError(err.message))
  }, [url])

  function handleDecide(decision) {
    // 서버 저장은 바텀시트를 닫는 시점(handleCloseSheet)에 처리한다.
    // 여기서는 시트만 연다.
    setPendingDecision(decision)
  }

  async function handleCloseSheet(memo) {
    // decisions는 로그인 사용자별 데이터라 비로그인 상태에서는 저장을
    // 건너뛴다(llmService.js의 saveTermsToVocabulary와 동일한 패턴) — 저장
    // 실패를 setError로 올리면 방금 다 읽은 리더뷰가 에러 화면으로 덮인다.
    if (user) {
      // 저장 성공/실패와 무관하게 판단버튼 영역 도달 = 완독 확정이므로 비동기
      // 호출 전에 먼저 잠근다. saveDecision 응답을 기다리는 동안 사용자가
      // 라우트를 이동해 unmount cleanup이 먼저 실행되면 decisionId: null로
      // 중복 기록되는 race condition 방지.
      readLoggedRef.current = true

      // 독해 시간 덕분에 대부분 이미 끝나 있지만, 아주 빨리 판단한 경우를
      // 대비해 slow lane이 아직이면 기다린다(never-reject Promise라 안전).
      const details = slowAnalysis ?? (await slowAnalysisPromiseRef.current)

      saveDecision({
        url,
        title: article.title,
        summaryBullets: fastAnalysis?.summaryBullets ?? [],
        decision: pendingDecision,
        marketSentiment: details?.marketSentiment,
        insight: details?.insight,
        memo,
      })
        .then((saved) => {
          setToastMessage("✅ 인사이트 노트에 저장되었습니다.")
          return logArticleRead({ url, title: article.title, decisionId: saved.id }).catch(() => {})
        })
        .catch((err) => {
          setError(err.message)
          return logArticleRead({ url, title: article.title, decisionId: null }).catch(() => {})
        })
    }

    setPendingDecision(null)
  }

  if (error) return <div className="reader-detail-content">{error}</div>
  if (!article) return <ReaderSkeleton />
  if (!fastAnalysis) return <ReaderSkeleton article={article} />

  return (
    <div className="reader-detail-content">
      <header className="app-header">
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
              {renderParagraph(paragraph, fastAnalysis.sentences)}
            </div>
          ))}
        </article>

        <AiSummary bullets={fastAnalysis.summaryBullets} />
      </main>

      <div ref={decisionButtonsWrapRef}>
        <DecisionButtons onDecide={handleDecide} />
      </div>

      {pendingDecision && (
        <BottomSheet
          decision={pendingDecision}
          marketSentiment={slowAnalysis?.marketSentiment}
          insight={slowAnalysis?.insight}
          onClose={handleCloseSheet}
        />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  )
}
