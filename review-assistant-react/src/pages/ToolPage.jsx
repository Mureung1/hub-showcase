import { useState } from 'react'
import { Link } from 'react-router-dom'
import { analyzeReviews, resetHistory as resetHistoryApi } from '../lib/api.js'

const SENTIMENT_LABEL = { positive: '긍정', negative: '부정', neutral: '중립' }
const REPLY_LABEL = { polite: '정중함', friendly: '친근함', concise: '간결함' }

function ToolPage() {
  const [reviewInput, setReviewInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [recurringIssues, setRecurringIssues] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  async function handleAnalyze() {
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

    try {
      const data = await analyzeReviews(reviews)
      setResults(data.results)
      setRecurringIssues(data.recurringIssues)
    } catch (err) {
      setError(err.message || '분석에 실패했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetHistory() {
    try {
      await resetHistoryApi()
      setRecurringIssues([])
    } catch {
      setError('초기화에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
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
        <Link to="/" className="nav-logo">
          <span>🍊</span>
          <span>리뷰 매니저 AI</span>
        </Link>
        <div className="nav-links">
          <Link to="/dashboard">총 분석 보기</Link>
          <Link to="/">← 홈으로</Link>
        </div>
      </nav>

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
          <button className="analyze-btn" onClick={handleAnalyze} disabled={loading}>
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
              <button className="reset-history-btn" onClick={handleResetHistory}>
                누적 기록 초기화
              </button>
            </div>
            <div className="recurring-issues">
              {recurringIssues.map((issue) => (
                <div className="recurring-issue-item" key={issue.keyword}>
                  <div className="issue-title">
                    &quot;{issue.keyword}&quot; 관련 부정 리뷰 {issue.occurrenceCount}건 누적
                  </div>
                  <div className="issue-solution">💡 {issue.suggestion}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {results !== null && results.length > 0 && (
          <div className="results-list">
            {results.map((item) => (
              <div className="review-card" key={item.reviewId}>
                <div className="review-text">&quot;{item.originalText}&quot;</div>
                <div className="meta-row">
                  <span className={`sentiment-tag ${item.sentiment}`}>
                    {SENTIMENT_LABEL[item.sentiment] || item.sentiment}
                  </span>
                  <span className="score-tag">관심도 {item.score}</span>
                  {(item.keywords || []).map((keyword, kIdx) => (
                    <span className="keyword-tag" key={kIdx}>
                      #{keyword}
                    </span>
                  ))}
                </div>
                {item.improvementSuggestion && (
                  <div className="solution-box">💡 개선 제안: {item.improvementSuggestion}</div>
                )}
                <div className="reply-list">
                  {Object.entries(item.replyDrafts || {}).map(([toneKey, text], rIdx) => {
                    const replyId = `reply-${item.reviewId}-${rIdx}`
                    const copied = copiedId === replyId
                    return (
                      <div className="reply-option" key={replyId}>
                        <div className="reply-header">
                          <span className="reply-label">{REPLY_LABEL[toneKey] || toneKey}</span>
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
            ))}
          </div>
        )}
      </div>

      <footer className="site-footer">
        <p>🍊 리뷰 매니저 AI · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default ToolPage
