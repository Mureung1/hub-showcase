import { useState } from 'react'
import Header from '../components/Header.jsx'
import BrandMark from '../components/BrandMark.jsx'
import { analyzeReviews, resetHistory as resetHistoryApi } from '../lib/api.js'
import ReviewInputForm from '../components/tool/ReviewInputForm.jsx'
import RecurringIssuePanel from '../components/tool/RecurringIssuePanel.jsx'
import ReviewResultCard from '../components/tool/ReviewResultCard.jsx'

function ToolPage() {
  const [reviewInput, setReviewInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [results, setResults] = useState(null)
  const [recurringIssues, setRecurringIssues] = useState(null)

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

  function handleCopyError() {
    setError('복사에 실패했어요. 직접 선택해서 복사해주세요.')
  }

  const lineCount = reviewInput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length

  return (
    <div className="page">
      <Header />

      <div className="container" id="tool">
        <ReviewInputForm
          value={reviewInput}
          onChange={setReviewInput}
          onAnalyze={handleAnalyze}
          loading={loading}
          lineCount={lineCount}
          showTips={results === null}
        />

        {loading && (
          <div className="status">
            <span className="spinner" />
            분석 중이에요...
          </div>
        )}
        {error && <div className="error-box">⚠️ {error}</div>}

        {recurringIssues !== null && recurringIssues.length > 0 && (
          <RecurringIssuePanel issues={recurringIssues} onReset={handleResetHistory} />
        )}

        {results !== null && results.length > 0 && (
          <div className="results-list">
            {results.map((item) => (
              <ReviewResultCard item={item} onCopyError={handleCopyError} key={item.reviewId} />
            ))}
          </div>
        )}
      </div>

      <footer className="site-footer">
        <p className="site-footer-brand">
          <BrandMark /> 리뷰 매니저 AI · 소상공인 무료 도구
        </p>
      </footer>
    </div>
  )
}

export default ToolPage
