import { Link, useNavigate } from 'react-router-dom'
import './LoginPage.css'

// 목: 실제 인증 없음. 어떤 입력이든 /dashboard 로 이동.
export default function LoginPage() {
  const navigate = useNavigate()
  const submit = (e) => {
    e.preventDefault()
    navigate('/dashboard')
  }
  return (
    <div className="login">
      <div className="login-card card">
        <Link to="/" className="brand login-brand">
          🔦 Beacon
        </Link>
        <h1>로그인</h1>
        <p className="caption login-cap">
          시장을 지켜보고 내 기록을 기억하는 AI 투자 코치
        </p>

        <form onSubmit={submit} className="login-form">
          <label>
            <span>이메일</span>
            <input type="email" placeholder="you@example.com" defaultValue="" />
          </label>
          <label>
            <span>비밀번호</span>
            <input type="password" placeholder="••••••••" defaultValue="" />
          </label>
          <button type="submit" className="btn accent block">
            로그인
          </button>
        </form>

        <div className="login-divider">
          <span>또는</span>
        </div>

        <button type="button" className="btn block discord-btn">
          <span className="discord-mark">🎮</span> Discord 계정 연결
        </button>
        <p className="caption login-hint">
          Discord를 연결하면 자연어로 조건을 걸고 알림을 받을 수 있어요.
        </p>
      </div>
    </div>
  )
}
