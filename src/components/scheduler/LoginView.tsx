import { useState, type FormEvent } from 'react'
import { login, signup, type AuthUser } from '../../auth/authClient'

type LoginViewProps = {
  onAuthenticated: (user: AuthUser) => void
}

export function LoginView({ onAuthenticated }: LoginViewProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const user = mode === 'login' ? await login(email, password) : await signup(email, password, name)
      onAuthenticated(user)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '요청에 실패했어요.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="scheduler-logo" aria-hidden="true"><i /><i /></span>
        <h1>We should do<em>..</em></h1>
        <p className="auth-subtitle">{mode === 'login' ? '로그인하고 두두를 만나보세요' : '가입하고 두두를 키워보세요'}</p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <label>
              <span>이름</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" />
            </label>
          )}
          <label>
            <span>이메일</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={mode === 'signup' ? 8 : undefined}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>

          {error && <p className="scheduler-notice" role="status">{error}</p>}

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        <button
          type="button"
          className="auth-toggle"
          onClick={() => {
            setMode((current) => (current === 'login' ? 'signup' : 'login'))
            setError('')
          }}
        >
          {mode === 'login' ? '계정이 없나요? 가입하기' : '이미 계정이 있나요? 로그인'}
        </button>
      </div>
    </main>
  )
}
