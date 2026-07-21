import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function SignupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: signUpError } = await signUp({ email, password })
    setSubmitting(false)
    if (signUpError) {
      setError(signUpError.message)
      return
    }
    // "Confirm email"을 꺼둔 프로젝트 설정이라 signUp 응답에 세션이 바로 실려온다 — 별도 로그인 호출 없이
    // AuthContext의 onAuthStateChange가 그 세션을 픽업하면 곧바로 로그인 상태가 된다.
    navigate(redirect, { replace: true })
  }

  return (
    <div className="screen">
      <h1>회원가입</h1>
      <p className="sub">가입 즉시 로그인되고, 원래 가려던 화면으로 돌아가요.</p>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="field-grid">
          <label className="field field-full">
            <span className="field-label">이메일</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field field-full">
            <span className="field-label">비밀번호</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        {error && <p className="checklist-detail-fail">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '가입 중…' : '회원가입'}
        </button>
        <p className="sub" style={{ margin: '14px 0 0' }}>
          이미 계정이 있으신가요?{' '}
          <Link to={`/login?redirect=${encodeURIComponent(redirect)}`}>로그인</Link>
        </p>
      </form>
    </div>
  )
}

export default SignupPage
