import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { signup } from '../lib/api.js'

function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, password)
      navigate('/app')
    } catch (err) {
      setError(err.message || '회원가입에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <Header />

      <div className="container">
        <div className="input-card auth-card">
          <h1 className="auth-title">회원가입</h1>
          <form onSubmit={handleSubmit}>
            <label className="input-label" htmlFor="signup-email">
              이메일
            </label>
            <input
              id="signup-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <label className="input-label" htmlFor="signup-password">
              비밀번호
            </label>
            <input
              id="signup-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              required
            />
            {error && <div className="error-box">⚠️ {error}</div>}
            <button className="analyze-btn" type="submit" disabled={loading}>
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>
          <p className="auth-switch">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        </div>
      </div>

      <footer className="site-footer">
        <p>🍊 리뷰 매니저 AI · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default SignupPage
