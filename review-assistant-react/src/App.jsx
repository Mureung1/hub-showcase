import { useState } from 'react'
import './App.css'

const KEYWORD_MAP = {
  맛: ['맛있', '맛없', '음식', '메뉴', '양이', '맛도', '맛이', '맛은'],
  친절도: ['친절', '불친절', '사장님', '직원', '무뚝뚝', '응대', '태도'],
  대기시간: ['대기', '기다', '오래', '빠르', '느리', '웨이팅', '줄'],
  가격: ['가격', '비싸', '저렴', '가성비', '값'],
  청결도: ['청결', '깨끗', '더럽', '위생'],
  분위기: ['분위기', '인테리어', '자리', '시끄럽', '조용'],
}

const POSITIVE_WORDS = [
  '좋아요', '좋았', '맛있', '친절', '최고', '만족', '감사', '추천', '훌륭', '깨끗', '빠르', '재방문', '또 올',
]

const NEGATIVE_WORDS = [
  '별로', '불친절', '오래', '대기', '실망', '최악', '비싸', '더럽', '불만', '느리', '불편', '맛없', '무뚝뚝',
  '쓰레기', '노맛', '맛도 없', '맛이 없', '맛은 없', '엉망', '성의 없', '정성 없',
]

const NEGATION_PREFIXES = ['불', '안', '못']

// '불친절' 처럼 부정어에 긍정 단어가 포함된 경우, 앞에 부정 접두사가 붙은 자리는 긍정으로 세지 않는다.
function countPositiveMatches(text, words) {
  return words.reduce((acc, word) => {
    let idx = text.indexOf(word)
    let matched = false
    while (idx !== -1) {
      const prevChar = idx > 0 ? text[idx - 1] : ''
      if (!NEGATION_PREFIXES.includes(prevChar)) {
        matched = true
        break
      }
      idx = text.indexOf(word, idx + 1)
    }
    return acc + (matched ? 1 : 0)
  }, 0)
}

function classifySentiment(text) {
  const posScore = countPositiveMatches(text, POSITIVE_WORDS)
  const negScore = NEGATIVE_WORDS.reduce((acc, w) => acc + (text.includes(w) ? 1 : 0), 0)
  if (posScore > negScore) return '긍정'
  if (negScore > posScore) return '부정'
  return '중립'
}

function extractKeywords(text) {
  const keywords = Object.entries(KEYWORD_MAP)
    .filter(([, triggers]) => triggers.some((t) => text.includes(t)))
    .map(([label]) => label)
  return keywords.length > 0 ? keywords.slice(0, 3) : ['일반']
}

const SOLUTION_MAP = {
  맛: '메뉴 맛의 일관성을 점검하고, 레시피 표준화나 조리 담당자 교육을 고려해보세요.',
  친절도: '직원 응대 교육을 강화하고, 정기적인 서비스 피드백 세션을 진행해보세요.',
  대기시간: '피크타임 인력 배치를 조정하거나, 예약/웨이팅 시스템 도입을 검토해보세요.',
  가격: '가격 대비 만족도를 높일 수 있도록 메뉴 구성이나 프로모션을 재검토해보세요.',
  청결도: '위생 점검 주기를 단축하고, 매장 청소 체크리스트를 도입해보세요.',
  분위기: '조명, 음악, 좌석 배치 등 매장 분위기 요소를 점검하고 개선해보세요.',
  일반: '구체적인 원인 파악을 위해 추가 피드백을 요청하거나 직접 문의해보세요.',
}

const RECURRING_THRESHOLD = 2

function suggestSolution(sentiment, keyword) {
  if (sentiment !== '부정') return null
  return SOLUTION_MAP[keyword] || SOLUTION_MAP['일반']
}

function detectRecurringIssues(analyzedReviews) {
  const counts = {}
  analyzedReviews.forEach((item) => {
    if (item.sentiment !== '부정') return
    item.keywords.forEach((keyword) => {
      counts[keyword] = (counts[keyword] || 0) + 1
    })
  })
  return Object.entries(counts)
    .filter(([, count]) => count >= RECURRING_THRESHOLD)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({
      keyword,
      count,
      solution: SOLUTION_MAP[keyword] || SOLUTION_MAP['일반'],
    }))
}

function buildReplies(sentiment, keyword) {
  if (sentiment === '긍정') {
    return {
      정중함: `소중한 후기 남겨주셔서 진심으로 감사드립니다. 말씀해주신 ${keyword} 부분, 앞으로도 변함없이 유지하겠습니다.`,
      친근함: `우와 이렇게 좋은 말씀 남겨주셔서 너무 감사해요! 다음에 또 뵙고 싶어요 :)`,
      간결함: `감사합니다! 또 뵙겠습니다.`,
    }
  }
  if (sentiment === '부정') {
    return {
      정중함: `불편을 드려 진심으로 죄송합니다. 말씀해주신 ${keyword} 부분은 꼭 개선하도록 노력하겠습니다.`,
      친근함: `아이고 ${keyword} 때문에 많이 아쉬우셨겠어요 ㅠㅠ 다음엔 더 신경 쓸게요!`,
      간결함: `죄송합니다. 개선하겠습니다.`,
    }
  }
  return {
    정중함: `소중한 의견 남겨주셔서 감사합니다. ${keyword} 관련 말씀 참고하여 더 나은 모습 보이겠습니다.`,
    친근함: `방문해주셔서 감사해요! 다음에도 편하게 놀러 오세요~`,
    간결함: `감사합니다!`,
  }
}

function analyzeReviewLocally(review) {
  const sentiment = classifySentiment(review)
  const keywords = extractKeywords(review)
  const replies = buildReplies(sentiment, keywords[0])
  const solution = suggestSolution(sentiment, keywords[0])
  return { review, sentiment, keywords, replies, solution }
}

function sentimentClass(sentiment) {
  if (sentiment === '긍정') return 'positive'
  if (sentiment === '부정') return 'negative'
  return 'neutral'
}

function App() {
  const [reviewInput, setReviewInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [history, setHistory] = useState([])
  const [recurringIssues, setRecurringIssues] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  async function analyzeReviews() {
    setError('')

    const rawText = reviewInput.trim()
    if (!rawText) {
      setError('리뷰를 먼저 입력해주세요.')
      return
    }

    const reviews = rawText.split('\n').map((r) => r.trim()).filter(Boolean)
    if (reviews.length === 0) {
      setError('유효한 리뷰가 없어요.')
      return
    }
    if (reviews.length > 15) {
      setError('한 번에 최대 15개까지 분석할 수 있어요. 리뷰 수를 줄여주세요.')
      return
    }

    setLoading(true)
    setResults(null)

    await new Promise((resolve) => setTimeout(resolve, 500))
    const analyzed = reviews.map(analyzeReviewLocally)
    const nextHistory = [...history, ...analyzed]
    setResults(analyzed)
    setHistory(nextHistory)
    setRecurringIssues(detectRecurringIssues(nextHistory))
    setLoading(false)
  }

  function resetHistory() {
    setHistory([])
    setRecurringIssues(null)
  }

  function copyReply(text, replyId) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(replyId)
        setTimeout(() => {
          setCopiedId((prev) => (prev === replyId ? null : prev))
        }, 1500)
      })
      .catch(() => {
        setError('복사에 실패했어요. 직접 선택해서 복사해주세요.')
      })
  }

  const lineCount = reviewInput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length

  return (
    <div className="page">
      <nav className="navbar">
        <div className="nav-logo">
          <span>🍊</span>
          <span>리뷰 답변 도우미</span>
        </div>
        <div className="nav-links">
          <a href="#how-it-works">사용법</a>
          <a href="#tool" className="nav-cta">바로 사용하기</a>
        </div>
      </nav>

      <section className="hero">
        <h1>손님 리뷰, 이제 고민하지 말고 답변하세요</h1>
        <p>감정분석 · 반복문제 감지 · 개선제안, 붙여넣기 한 번으로 끝내세요</p>
        <a className="hero-cta" href="#tool">지금 시작하기</a>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="step">
          <span className="step-num">1</span>
          리뷰 붙여넣기
        </div>
        <div className="step">
          <span className="step-num">2</span>
          분석 시작
        </div>
        <div className="step">
          <span className="step-num">3</span>
          답변 복사
        </div>
      </section>

      <div className="container" id="tool">
        <div className="input-card">
          <label className="input-label" htmlFor="review-input">리뷰 붙여넣기</label>
          <textarea
            id="review-input"
            value={reviewInput}
            onChange={(e) => setReviewInput(e.target.value)}
            placeholder={'예) 음식은 맛있었는데 너무 오래 기다렸어요.\n직원분이 너무 불친절했어요.\n(리뷰 하나당 한 줄, 최대 15개)'}
          />
          <div className="hint">
            <span>줄바꿈으로 리뷰를 구분해주세요 · 최대 15개</span>
            <span>{lineCount}개 입력됨</span>
          </div>
          <button className="analyze-btn" onClick={analyzeReviews} disabled={loading}>
            {loading ? '분석 중...' : '분석 시작'}
          </button>
        </div>

        {loading && (
          <div className="status">
            <span className="spinner" />
            분석 중이에요...
          </div>
        )}
        {error && <div className="error-box">⚠️ {error}</div>}

        {recurringIssues !== null && recurringIssues.length > 0 && (
          <div className="recurring-panel">
            <div className="recurring-panel-header">
              <h3 className="recurring-panel-title">
                <span>⚠️</span>
                <span>반복되는 문제 감지</span>
              </h3>
              <button className="reset-history-btn" onClick={resetHistory}>
                누적 기록 초기화
              </button>
            </div>
            <div className="recurring-issues">
              {recurringIssues.map((issue) => (
                <div className="recurring-issue-item" key={issue.keyword}>
                  <div className="issue-title">&quot;{issue.keyword}&quot; 관련 부정 리뷰 {issue.count}건 누적</div>
                  <div className="issue-solution">💡 {issue.solution}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results !== null && results.length === 0 && (
          <div className="empty-state">분석 결과가 없어요.</div>
        )}

        {results !== null && results.length > 0 && (
          <div className="results-list">
            {results.map((item, idx) => {
              const sClass = sentimentClass(item.sentiment)
              return (
                <div className="review-card" key={idx}>
                  <div className="review-text">&quot;{item.review}&quot;</div>
                  <div className="meta-row">
                    <span className={`sentiment-tag ${sClass}`}>{item.sentiment || '중립'}</span>
                    {(item.keywords || []).map((keyword, kIdx) => (
                      <span className="keyword-tag" key={kIdx}>
                        #{keyword}
                      </span>
                    ))}
                  </div>
                  {item.solution && (
                    <div className="solution-box">💡 개선 제안: {item.solution}</div>
                  )}
                  <div className="reply-list">
                    {Object.entries(item.replies || {}).map(([label, text], rIdx) => {
                      const replyId = `reply-${idx}-${rIdx}`
                      const copied = copiedId === replyId
                      return (
                        <div className="reply-option" key={replyId}>
                          <div className="reply-header">
                            <span className="reply-label">{label}</span>
                            <button
                              className={`copy-btn ${copied ? 'copied' : ''}`}
                              onClick={() => copyReply(text, replyId)}
                            >
                              {copied ? '복사됨 ✓' : '복사하기'}
                            </button>
                          </div>
                          <div className="reply-text">{text}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <footer className="site-footer">
        <p>🍊 리뷰 답변 도우미 · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default App
