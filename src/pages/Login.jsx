import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { colors, font, radius, spacing, styles } from '../styles/theme.js'

// Supabase Auth 에러는 영어 원문 그대로 오므로, 자주 보이는 것만 한글로 바꿔 보여준다
// (목록에 없는 메시지는 원문 그대로 폴백).
const AUTH_ERROR_MESSAGES = {
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'User already registered': '이미 가입된 이메일입니다.',
  'Email not confirmed': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
}

function translateAuthError(message) {
  return AUTH_ERROR_MESSAGES[message] ?? message
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.98v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.05z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.95l2.99 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}

// 이메일 회원가입/로그인 + 구글 소셜 로그인, 둘 다 Supabase Auth로 처리한다. 로그인 성공(비밀번호
// 방식은 즉시, 구글은 리다이렉트로 돌아온 뒤 비동기로) 시 user가 채워지는 걸 아래 useEffect가
// 공통으로 감지해 다음 화면으로 보낸다 — 두 방식이 별도 콜백 라우트 없이 한 곳에서 합류한다.
export default function Login() {
  const { user, authLoading, profileLoading, login, signup, loginWithGoogle } = useUser()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !user || profileLoading) return
    navigate(user.profile ? '/analyze' : '/profile', { replace: true })
  }, [authLoading, user, profileLoading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')

    if (mode === 'signup' && password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        const { needsEmailConfirmation } = await signup(email, password)
        if (needsEmailConfirmation) {
          setNotice('가입 확인 이메일을 보냈어요. 메일함에서 확인 후 로그인해주세요.')
          setMode('login')
        }
      }
      // 로그인/즉시 확정되는 가입은 세션이 잡히는 즉시 위 useEffect가 이동을 처리한다.
    } catch (err) {
      setError(translateAuthError(err.message))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
      // 성공 시 브라우저가 구글로 이동하므로 이후 코드는 실행되지 않는다.
    } catch (err) {
      setError(translateAuthError(err.message))
      setGoogleLoading(false)
    }
  }

  function toggleMode() {
    setMode((m) => (m === 'login' ? 'signup' : 'login'))
    setError('')
    setNotice('')
    setPasswordConfirm('')
  }

  return (
    <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <ScreenHeader title="CJMT" subtitle="오늘의 영양 균형을 확인해보세요" />

      <Card>
        <button
          type="button"
          className="tds-press"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: 52,
            borderRadius: radius.md,
            border: `1px solid ${colors.border}`,
            background: '#fff',
            color: colors.textStrong,
            fontSize: font.size.md,
            fontWeight: 600,
            cursor: googleLoading ? 'not-allowed' : 'pointer',
            opacity: googleLoading ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
          }}
        >
          <GoogleIcon />
          {googleLoading ? '이동 중...' : '구글로 계속하기'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md, margin: `${spacing.xl}px 0` }}>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
          <span style={{ fontSize: font.size.xs, color: colors.muted }}>또는</span>
          <div style={{ flex: 1, height: 1, background: colors.border }} />
        </div>

        <form onSubmit={handleSubmit}>
          <TextField
            label="이메일"
            id="login-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <TextField
            label="비밀번호"
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          {mode === 'signup' && (
            <TextField
              label="비밀번호 확인"
              id="login-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          )}

          {notice && <p style={{ ...styles.helperText, color: colors.primary, marginBottom: spacing.sm }}>{notice}</p>}
          {error && <p style={styles.errorText}>{error}</p>}

          <AppButton type="submit" disabled={submitting} style={{ marginTop: spacing.sm }}>
            {submitting ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
          </AppButton>
        </form>

        <button
          type="button"
          className="tds-press"
          onClick={toggleMode}
          style={{ ...styles.linkButton, display: 'block', margin: `${spacing.lg}px auto 0` }}
        >
          {mode === 'login' ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </Card>
    </div>
  )
}
