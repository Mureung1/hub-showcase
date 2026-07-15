import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/useSession.js'
import { APP_HOME } from '../lib/routes.js'
import Icon from '../components/Icon.jsx'
import './LoginPage.css'

const LOOP = [
  { icon: '👀', title: '지켜본다', desc: '자연어 조건으로 시장 감시' },
  { icon: '📥', title: '기록한다', desc: '알림 버튼으로 원클릭 기록' },
  { icon: '🔁', title: '복기한다', desc: 'AI가 과거 근거로 코치' },
]

/**
 * 로그인 / 회원가입 화면 (스플릿: 좌 브랜드 패널 + 우 폼).
 * 이미 로그인되어 있으면 앱 진입점(APP_HOME) 또는 원래 목적지로 보낸다.
 */
function LoginPage() {
  const { session, loading } = useSession()
  const navigate = useNavigate()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('') // 회원가입 확인 메일 안내 등
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    // 로그인 상태로 /login 진입 시 항상 대시보드로 (원래 목적지 복귀 없음)
    return <Navigate to={APP_HOME} replace />
  }

  function switchMode(next) {
    if (next === mode) return
    setMode(next)
    setError('')
    setNotice('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!supabase) {
      setError('Supabase 환경변수가 설정되지 않아 진행할 수 없습니다.')
      return
    }

    setSubmitting(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      setSubmitting(false)
      if (signUpError) {
        setError(mapSignUpError(signUpError))
        return
      }
      if (data.session) {
        navigate(APP_HOME, { replace: true }) // 이메일 확인 off → 즉시 세션
        return
      }
      // 이메일 확인 on → 세션 없음
      setNotice('확인 메일을 보냈어요. 메일의 링크로 인증한 뒤 로그인해 주세요.')
      setMode('signin')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setSubmitting(false)
    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }
    navigate(APP_HOME, { replace: true })
  }

  const isSignup = mode === 'signup'

  return (
    <div className="login-page">
      {/* 좌: 브랜드 패널 */}
      <aside className="login-brand">
        <div className="login-brand__inner">
          <span className="login-brand__logo">
            <span className="login-brand__chip">
              <Icon name="notebook-pen" size={20} />
            </span>
            Beacon
          </span>
          <span className="login-brand__pill">AI 투자 에이전트</span>
          <h2 className="login-brand__title">
            말을 걸면 지켜보고,
            <br />
            내 기록을 기억해 코치한다
          </h2>
          <p className="login-brand__sub">
            자연어로 조건을 걸면 시장을 대신 감시해 알림하고, 그 매매를 AI 코칭
            에이전트가 과거 기록을 근거로 복기해 줍니다.
          </p>
          <ul className="login-brand__loop">
            {LOOP.map((l) => (
              <li key={l.title}>
                <span className="login-brand__loop-icon" aria-hidden="true">
                  {l.icon}
                </span>
                <span>
                  <strong>{l.title}</strong>
                  <span className="login-brand__loop-desc">{l.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* 우: 폼 */}
      <main className="login-panel">
        <form className="card login-form" onSubmit={handleSubmit}>
          <div className="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={!isSignup ? 'login-tab login-tab--active' : 'login-tab'}
              onClick={() => switchMode('signin')}
            >
              로그인
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={isSignup ? 'login-tab login-tab--active' : 'login-tab'}
              onClick={() => switchMode('signup')}
            >
              회원가입
            </button>
          </div>

          <h1 className="login-form__title">
            {isSignup ? 'Beacon 시작하기' : '다시 오셨네요'}
          </h1>
          <p className="login-form__desc">
            {isSignup
              ? '이메일로 계정을 만들고 감시 루프를 시작하세요.'
              : 'Beacon 계정으로 로그인하세요.'}
          </p>

          <label className="login-field">
            <span className="login-field__label">이메일</span>
            <span className="login-field__control">
              <span className="login-field__icon">
                <Icon name="mail" size={16} />
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </span>
          </label>

          <label className="login-field">
            <span className="login-field__label">비밀번호</span>
            <span className="login-field__control">
              <span className="login-field__icon">
                <Icon name="lock" size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? '6자 이상' : '비밀번호'}
                minLength={isSignup ? 6 : undefined}
                required
              />
              <button
                type="button"
                className="login-field__toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
              </button>
            </span>
          </label>

          {error && <p className="login-form__error">{error}</p>}
          {notice && <p className="login-form__notice">{notice}</p>}

          <button type="submit" className="btn accent block login-submit" disabled={submitting}>
            {submitting
              ? isSignup
                ? '가입 중...'
                : '로그인 중...'
              : isSignup
                ? '회원가입'
                : '로그인'}
          </button>

          <p className="login-form__swap">
            {isSignup ? '이미 계정이 있으신가요? ' : '계정이 없으신가요? '}
            <button
              type="button"
              className="login-form__swap-btn"
              onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
            >
              {isSignup ? '로그인' : '회원가입'}
            </button>
          </p>

          <p className="login-form__hint">
            로그인 후 Discord를 연동하면 알림을 받을 수 있어요.
          </p>
        </form>
      </main>
    </div>
  )
}

/** 회원가입 에러를 사용자용 한국어 문구로 매핑. */
function mapSignUpError(err) {
  const msg = (err?.message ?? '').toLowerCase()
  if (msg.includes('already') || msg.includes('registered')) {
    return '이미 가입된 이메일이에요. 로그인해 주세요.'
  }
  if (msg.includes('password')) {
    return '비밀번호는 6자 이상이어야 해요.'
  }
  if (msg.includes('email')) {
    return '올바른 이메일 주소를 입력해 주세요.'
  }
  return '회원가입에 실패했어요. 잠시 후 다시 시도해 주세요.'
}

export default LoginPage
