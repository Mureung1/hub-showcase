import { useEffect, useState } from 'react'
import { getInsight } from '../../lib/api.js'

// 총 분석 통계와 별개로 자체적으로 불러온다 — AI 응답을 기다리느라 나머지
// 대시보드(숫자 통계는 DB 조회라 즉시 뜸)까지 늦게 뜨지 않도록 분리했다.
function InsightBanner() {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getInsight()
      .then((data) => {
        if (!cancelled) setInsight(data.insight)
      })
      .catch(() => {
        if (!cancelled) setInsight(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="insight-banner insight-banner-loading">
        <span className="spinner" />
        AI가 리뷰를 살펴보고 있어요...
      </div>
    )
  }

  if (!insight) return null

  return (
    <div className="insight-banner">
      <span className="insight-banner-icon">✨</span>
      <p className="insight-banner-text">{insight}</p>
    </div>
  )
}

export default InsightBanner
