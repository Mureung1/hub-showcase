import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { login } from '../lib/api.js'

function LoginPage() {
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
      await login(email, password)
      navigate('/app')
    } catch (err) {
      setError(err.message || '로그인에 실패했어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <Header />

      <div className="container">
        <div className="input-card auth-card">
          <h1 className="auth-title">로그인</h1>
          <form onSubmit={handleSubmit}>
            <label className="input-label" htmlFor="login-email">
              이메일
            </label>
            <input
              id="login-email"
              type="email"
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
            <label className="input-label" htmlFor="login-password">
              비밀번호
            </label>
            <input
              id="login-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              required
            />
            {error && <div className="error-box">⚠️ {error}</div>}
            <button className="analyze-btn" type="submit" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <p className="auth-switch">
            아직 계정이 없으신가요? <Link to="/signup">회원가입</Link>
          </p>
        </div>
      </div>

      <footer className="site-footer">
        <p>🍊 리뷰 매니저 AI · 소상공인 무료 도구</p>
      </footer>
    </div>
  )
}

export default LoginPage
