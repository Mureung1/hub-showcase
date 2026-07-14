import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import logo from '../assets/logo.png'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [showPw, setShowPw] = useState(false)

  // 4단계에서 실제 인증 API로 교체 — 지금은 화면 이동만
  function handleSubmit(e) {
    e.preventDefault()
    navigate('/app/dashboard')
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
              <input id="login-id" name="username" placeholder="아이디를 입력하세요" autoComplete="username" />
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
              <input type="checkbox" name="remember" />
              로그인 상태 유지
            </label>
            <a href="#find" onClick={(e) => e.preventDefault()} title="향후 지원 예정">
              아이디/비밀번호 찾기
            </a>
          </div>

          <button type="submit" className="btn btn-dark auth-submit">로그인 →</button>
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
