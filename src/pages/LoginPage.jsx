import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isValidEmail } from '../lib/validateEmail'

function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  const { signIn } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    // 네트워크 왕복 없이 바로 걸러낸다 — <input type="email">의 네이티브 검증은 최상위도메인 없이도 통과시킨다.
    if (!isValidEmail(email)) {
      setError('올바른 이메일 형식이 아닙니다.')
      return
    }
    setSubmitting(true)
    setError(null)
    const { error: signInError } = await signIn({ email, password })
    setSubmitting(false)
    if (signInError) {
      // 계정 존재 여부를 노출하지 않는 동일 메시지 (checklist.md Part 2의 시나리오 그대로)
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    navigate(redirect, { replace: true })
  }

  return (
    <div className="screen">
      <h1>로그인</h1>
      <p className="sub">북마크 기능을 쓰려면 로그인이 필요해요. 갭 분석은 로그인 없이도 그대로 이용할 수 있어요.</p>

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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </div>

        <p className="sub" style={{ textAlign: 'right', margin: '-10px 0 0' }}>
          <Link to="/forgot-password">비밀번호를 잊으셨나요?</Link>
        </p>

        {error && <p className="checklist-detail-fail">{error}</p>}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? '로그인 중…' : '로그인'}
        </button>
        <p className="sub" style={{ margin: '14px 0 0' }}>
          계정이 없으신가요?{' '}
          <Link to={`/signup?redirect=${encodeURIComponent(redirect)}`}>회원가입</Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
