import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import BrandMark from '../components/BrandMark.jsx'
import SentimentTag from '../components/SentimentTag.jsx'
import { getMyReviews } from '../lib/api.js'
import { useCurrentUser } from '../hooks/useCurrentUser.js'

function formatDate(iso) {
  return iso.slice(0, 10)
}

function MyReviewsPage() {
  const { user, checked } = useCurrentUser()
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!checked) return
    if (!user) {
      setLoading(false)
      return
    }
    getMyReviews()
      .then((data) => setReviews(data.reviews))
      .catch((err) => setError(err.message || '리뷰를 불러오지 못했어요.'))
      .finally(() => setLoading(false))
  }, [checked, user])

  return (
    <div className="page">
      <Header />

      <div className="container">
        <h1 className="dashboard-title">내 리뷰 모아보기</h1>
        <p className="dashboard-sub">이 계정으로 로그인해서 분석한 리뷰를 기기·세션과 상관없이 모아서 보여줘요</p>

        {checked && !user && (
          <div className="dashboard-empty">
            로그인하면 내 리뷰를 모아볼 수 있어요.{' '}
            <Link to="/login">로그인하러 가볼까요?</Link>
          </div>
        )}

        {loading && checked && user && (
          <div className="status">
            <span className="spinner" />
            불러오는 중...
          </div>
        )}
        {error && <div className="error-box">⚠️ {error}</div>}

        {reviews && reviews.length === 0 && (
          <div className="dashboard-empty">
            아직 로그인 상태로 분석한 리뷰가 없어요.{' '}
            <Link to="/app">리뷰를 분석하러 가볼까요?</Link>
          </div>
        )}

        {reviews && reviews.length > 0 && (
          <div className="results-list">
            {reviews.map((item, idx) => (
              <div className="review-card" key={idx}>
                <div className="review-text">&quot;{item.originalText}&quot;</div>
                <div className="meta-row">
                  <SentimentTag sentiment={item.sentiment} />
                  <span className="score-tag">관심도 {item.score}</span>
                  {item.keywords.map((keyword, kIdx) => (
                    <span className="keyword-tag" key={kIdx}>
                      #{keyword}
                    </span>
                  ))}
                  <span className="monthly-month">{formatDate(item.createdAt)}</span>
                </div>
              </div>
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

export default MyReviewsPage
