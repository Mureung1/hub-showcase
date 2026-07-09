import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/useSession.js'
import './LoginPage.css'

/**
 * 이메일/비밀번호 로그인 화면.
 * 이미 로그인되어 있으면 /journal로 보낸다.
 */
function LoginPage() {
  const { session, loading } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    const redirectTo = location.state?.from?.pathname ?? '/journal'
    return <Navigate to={redirectTo} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (!supabase) {
      setError('Supabase 환경변수가 설정되지 않아 로그인할 수 없습니다.')
      return
    }

    setSubmitting(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setSubmitting(false)

    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    navigate('/journal', { replace: true })
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>로그인</h1>
        <p className="login-form__desc">Beacon 계정으로 로그인하세요.</p>

        <label className="login-form__field">
          <span>이메일</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <label className="login-form__field">
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && <p className="login-form__error">{error}</p>}

        <button type="submit" className="login-form__submit" disabled={submitting}>
          {submitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage
