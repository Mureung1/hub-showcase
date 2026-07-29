import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { toKoAuthError } from '../lib/authErrors.js'
import './AuthPage.css'

// /reset-password — 비밀번호 재설정 요청(메일 발송).
function ResetPasswordPage() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  if (!auth.isAuthEnabled) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">로그인 준비 중</h1>
          <p className="rs-auth-sub">Supabase Auth 설정이 없어 비밀번호 재설정을 쓸 수 없어요.</p>
          <Link to="/" className="rs-btn rs-btn-primary">
            홈으로
          </Link>
        </section>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const { error } = await auth.resetPassword(email)
      if (error) throw error
      setSent(true)
    } catch (err) {
      setError(toKoAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">메일을 보냈어요 📮</h1>
          <p className="rs-auth-sub">
            <strong>{email}</strong> 로 재설정 링크를 보냈어요(가입된 이메일인 경우). 메일의 링크를
            눌러 새 비밀번호를 설정해 주세요.
          </p>
          <p className="rs-auth-hint">메일이 안 보이면 스팸함도 확인해 주세요.</p>
          <Link to="/login" className="rs-btn">
            로그인으로 돌아가기
          </Link>
        </section>
      </div>
    )
  }

  return (
    <div className="rs-auth">
      <section className="rs-panel rs-auth-panel">
        <h1 className="rs-auth-title">비밀번호 재설정</h1>
        <p className="rs-auth-sub">가입한 이메일을 입력하면 재설정 링크를 보내드려요.</p>
        <form className="rs-auth-form" onSubmit={handleSubmit}>
          <label className="rs-auth-field">
            <span>이메일</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          {error && <p className="rs-auth-error">{error}</p>}
          <button className="rs-btn rs-btn-primary rs-auth-submit" type="submit" disabled={busy}>
            {busy ? '보내는 중…' : '재설정 링크 보내기'}
          </button>
        </form>
        <p className="rs-auth-switch">
          <Link to="/login">로그인으로 돌아가기</Link>
        </p>
      </section>
    </div>
  )
}

export default ResetPasswordPage
