import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import { apiPost } from '../api/client'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', remember: false })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function patch(partial) {
    setError('')
    setForm((f) => ({ ...f, ...partial }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.username.trim() || !form.password) return setError('아이디와 비밀번호를 입력해 주세요.')

    setSubmitting(true)
    try {
      await apiPost('/api/auth/login', {
        username: form.username.trim(),
        password: form.password,
        remember: form.remember,
      })
      navigate('/app/dashboard')
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-head">
          <span className="auth-logo">
            <img src={logo} alt="" />
          </span>
          <h1>팀플, 이지!</h1>
          <p>AI 에이전트와 함께하는 간편한 팀 프로젝트 관리</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="login-id">아이디</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">@</span>
              <input
                id="login-id"
                name="username"
                placeholder="아이디를 입력하세요"
                autoComplete="username"
                value={form.username}
                onChange={(e) => patch({ username: e.target.value })}
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="login-pw">비밀번호</label>
            <div className="auth-input">
              <span className="field-icon" aria-hidden="true">🔒</span>
              <input
                id="login-pw"
                name="password"
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => patch({ password: e.target.value })}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="auth-options">
            <label>
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={(e) => patch({ remember: e.target.checked })}
              />
              로그인 상태 유지
            </label>
            <a href="#find" onClick={(e) => e.preventDefault()} title="향후 지원 예정">
              아이디/비밀번호 찾기
            </a>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-dark auth-submit" disabled={submitting}>
            {submitting ? '로그인 중…' : '로그인 →'}
          </button>
        </form>

        <div className="auth-divider" />
        <p className="auth-switch">
          처음이신가요?
          <Link to="/signup">회원가입</Link>
        </p>
      </div>

      <div className="auth-badges">
        <span>🛡️ 보안 로그인</span>
        <span>✅ 데이터 암호화</span>
      </div>
    </div>
  )
}
