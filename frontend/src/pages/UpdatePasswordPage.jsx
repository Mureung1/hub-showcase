import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { toKoAuthError } from '../lib/authErrors.js'
import './AuthPage.css'

// /update-password — 재설정 메일 링크로 진입(Supabase가 복구 세션 설정) 후 새 비밀번호 설정.
function UpdatePasswordPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  if (!auth.isAuthEnabled) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">로그인 준비 중</h1>
          <Link to="/" className="rs-btn rs-btn-primary">
            홈으로
          </Link>
        </section>
      </div>
    )
  }

  if (auth.loading) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">확인 중…</h1>
        </section>
      </div>
    )
  }

  // 복구 세션(또는 로그인 세션)이 없으면 링크가 만료/무효인 경우.
  if (!auth.isLoggedIn) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">링크가 만료됐어요</h1>
          <p className="rs-auth-sub">
            비밀번호 재설정 링크가 유효하지 않거나 만료됐어요. 다시 요청해 주세요.
          </p>
          <Link to="/reset-password" className="rs-btn rs-btn-primary">
            재설정 링크 다시 받기
          </Link>
        </section>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (pw.length < 6) return setError('비밀번호는 6자 이상이어야 해요.')
    if (pw !== pw2) return setError('비밀번호가 서로 달라요.')
    setBusy(true)
    try {
      const { error } = await auth.updatePassword(pw)
      if (error) throw error
      setDone(true)
      setTimeout(() => navigate('/me', { replace: true }), 1200)
    } catch (err) {
      setError(toKoAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="rs-auth">
        <section className="rs-panel rs-auth-panel">
          <h1 className="rs-auth-title">변경 완료! ✅</h1>
          <p className="rs-auth-sub">새 비밀번호로 바뀌었어요. 마이페이지로 이동할게요…</p>
        </section>
      </div>
    )
  }

  return (
    <div className="rs-auth">
      <section className="rs-panel rs-auth-panel">
        <h1 className="rs-auth-title">새 비밀번호 설정</h1>
        <p className="rs-auth-sub">새로 사용할 비밀번호를 입력해 주세요.</p>
        <form className="rs-auth-form" onSubmit={handleSubmit}>
          <label className="rs-auth-field">
            <span>새 비밀번호</span>
            <div className="rs-auth-pw">
              <input
                type={showPw ? 'text' : 'password'}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="6자 이상"
              />
              <button
                type="button"
                className="rs-auth-pw-toggle"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPw ? '숨기기' : '표시'}
              </button>
            </div>
          </label>
          <label className="rs-auth-field">
            <span>새 비밀번호 확인</span>
            <input
              type={showPw ? 'text' : 'password'}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="한 번 더 입력"
            />
          </label>
          {error && <p className="rs-auth-error">{error}</p>}
          <button className="rs-btn rs-btn-primary rs-auth-submit" type="submit" disabled={busy}>
            {busy ? '변경 중…' : '비밀번호 변경'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default UpdatePasswordPage
