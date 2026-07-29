import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { getSummary, getMonthlyStats, resetHistory } from '../lib/api.js'
import SentimentTag from '../components/SentimentTag.jsx'
import BrandMark from '../components/BrandMark.jsx'
import InsightBanner from '../components/dashboard/InsightBanner.jsx'

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

  async function handleResetHistory() {
    try {
      await resetHistory()
      setSummary({
        totalReviews: 0,
        sentimentBreakdown: { positive: 0, negative: 0, neutral: 0 },
        averageScore: 0,
        topKeywords: [],
      })
      setMonths([])
    } catch (err) {
      setError(err.message || '초기화에 실패했어요. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="page">
      <Header />

      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1 className="dashboard-title">리뷰 총 분석</h1>
            <p className="dashboard-sub">이 브라우저에서 지금까지 분석한 리뷰를 기준으로 집계했어요</p>
          </div>
          {summary && summary.totalReviews > 0 && (
            <button type="button" className="reset-history-btn" onClick={handleResetHistory}>
              누적 기록 초기화
            </button>
          )}
        </div>

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
            <h2 className="section-title">감정 분포</h2>
            <div className="sentiment-breakdown">
              <SentimentTag sentiment="positive">{summary.sentimentBreakdown.positive}</SentimentTag>
              <SentimentTag sentiment="negative">{summary.sentimentBreakdown.negative}</SentimentTag>
              <SentimentTag sentiment="neutral">{summary.sentimentBreakdown.neutral}</SentimentTag>
            </div>

            <div className="lp-dashboard dashboard-grid">
              <div className="lp-dash-stats">
                <div className="lp-dash-tile">
                  <span className="lp-dash-tile-label">분석한 리뷰 수</span>
                  <strong className="lp-dash-tile-value">{summary.totalReviews}개</strong>
                  <span className="lp-dash-tile-delta">누적 기준</span>
                </div>
                <div className="lp-dash-tile">
                  <span className="lp-dash-tile-label">평균 관심도 점수</span>
                  <strong className="lp-dash-tile-value">{summary.averageScore}</strong>
                  <span className="lp-dash-tile-delta">100점 만점</span>
                </div>
                <div className="lp-dash-tile">
                  <span className="lp-dash-tile-label">긍정 리뷰 비율</span>
                  <strong className="lp-dash-tile-value">
                    {Math.round((summary.sentimentBreakdown.positive / summary.totalReviews) * 100)}%
                  </strong>
                  <span className="lp-dash-tile-delta">전체 {summary.totalReviews}건 중</span>
                </div>
              </div>

              <div className="lp-dash-card lp-dash-keywords">
                <h3 className="lp-dash-card-title">자주 언급된 키워드</h3>
                {summary.topKeywords.length === 0 ? (
                  <p className="lp-dash-guide-text">아직 집계된 키워드가 없어요.</p>
                ) : (
                  <div className="lp-dash-keyword-list">
                    {summary.topKeywords.map((item) => {
                      const maxCount = summary.topKeywords[0].count
                      return (
                        <div className="lp-dash-keyword-row" key={item.keyword}>
                          <div className="lp-dash-keyword-head">
                            <span>#{item.keyword}</span>
                            <span className="lp-dash-keyword-count">{item.count}건</span>
                          </div>
                          <div className="lp-bar-track">
                            <div
                              className="lp-bar-fill lp-bar-fill--neutral"
                              style={{ width: `${(item.count / maxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {months.length > 0 && (
                <div className="lp-dash-card lp-dash-trend">
                  <div className="lp-dash-card-headrow">
                    <h3 className="lp-dash-card-title">월별 감정 비중 추이</h3>
                    <div className="lp-dash-legend">
                      <span className="lp-dash-legend-item">
                        <i className="lp-dot lp-dot--positive" />긍정
                      </span>
                      <span className="lp-dash-legend-item">
                        <i className="lp-dot lp-dot--neutral" />중립
                      </span>
                      <span className="lp-dash-legend-item">
                        <i className="lp-dot lp-dot--negative" />부정
                      </span>
                    </div>
                  </div>
                  <div className="lp-trend-chart">
                    {months.map((month) => {
                      const total = month.totalReviews || 1
                      return (
                        <div className="lp-trend-col" key={month.month}>
                          <div className="lp-trend-stack" title={`${month.month} · ${month.totalReviews}건 · 평균 ${month.averageScore}점`}>
                            <div
                              className="lp-trend-seg lp-trend-seg--positive"
                              style={{ height: `${(month.positive / total) * 100}%` }}
                            />
                            <div
                              className="lp-trend-seg lp-trend-seg--neutral"
                              style={{ height: `${(month.neutral / total) * 100}%` }}
                            />
                            <div
                              className="lp-trend-seg lp-trend-seg--negative"
                              style={{ height: `${(month.negative / total) * 100}%` }}
                            />
                          </div>
                          <span className="lp-trend-month">{month.month.slice(5)}월</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <InsightBanner />
            </div>
          </>
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

export default DashboardPage
