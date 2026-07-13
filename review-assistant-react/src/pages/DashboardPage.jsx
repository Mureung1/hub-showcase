import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSummary, getMonthlyStats } from '../lib/api.js'

function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [months, setMonths] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [summaryData, monthlyData] = await Promise.all([getSummary(), getMonthlyStats()])
        setSummary(summaryData)
        setMonths(monthlyData.months)
      } catch (err) {
        setError(err.message || '통계를 불러오지 못했어요.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="page">
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <span>🍊</span>
          <span>리뷰 매니저 AI</span>
        </Link>
        <div className="nav-links">
          <Link to="/app" className="nav-cta">
            바로 사용하기
          </Link>
        </div>
      </nav>

      <div className="container">
        <h1 className="dashboard-title">리뷰 총 분석</h1>
        <p className="dashboard-sub">이 브라우저에서 지금까지 분석한 리뷰를 기준으로 집계했어요</p>

        {loading && (
          <div className="status">
            <span className="spinner" />
            불러오는 중...
          </div>
        )}
        {error && <div className="error-box">⚠️ {error}</div>}

        {summary && summary.totalReviews === 0 && (
          <div className="dashboard-empty">
            아직 분석한 리뷰가 없어요.{' '}
            <Link to="/app">리뷰를 분석하러 가볼까요?</Link>
          </div>
        )}

        {summary && summary.totalReviews > 0 && (
          <>
            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-number">{summary.totalReviews}개</div>
                <div className="stat-label">분석한 리뷰</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{summary.averageScore}</div>
                <div className="stat-label">평균 관심도 점수</div>
              </div>
            </div>

            <h2 className="section-title">감정 분포</h2>
            <div className="sentiment-breakdown">
              <span className="sentiment-tag positive">긍정 {summary.sentimentBreakdown.positive}</span>
              <span className="sentiment-tag negative">부정 {summary.sentimentBreakdown.negative}</span>
              <span className="sentiment-tag neutral">중립 {summary.sentimentBreakdown.neutral}</span>
            </div>

            <h2 className="section-title">자주 언급된 키워드</h2>
            <div className="industry-list">
              {summary.topKeywords.map((item) => (
                <span className="industry-chip" key={item.keyword}>
                  #{item.keyword} {item.count}
                </span>
              ))}
            </div>

            <h2 className="section-title">월별 통계</h2>
            <div className="monthly-table">
              {months.map((month) => (
                <div className="monthly-row" key={month.month}>
                  <span className="monthly-month">{month.month}</span>
                  <span>{month.totalReviews}건 분석</span>
                  <span>평균 {month.averageScore}점</span>
                  <span>부정 {month.negative}건</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <footer className="site-footer">
        <p>🍊 리뷰 매니저 AI · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default DashboardPage
