import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import AppButton from '../components/AppButton.jsx'
import Card from '../components/Card.jsx'
import ScreenHeader from '../components/ScreenHeader.jsx'
import TextField from '../components/TextField.jsx'
import { normalizeLoginId } from '../lib/authId.js'
import { useDocumentTitle } from '../lib/useDocumentTitle.js'
import { colors, font, spacing, styles } from '../styles/theme.js'

// 아이디 + 비밀번호 로그인(PRD v2.0 FR-1.2). 소셜 로그인은 없다 — 웹뷰(APK)에서 임베디드 브라우저
// OAuth가 막히는 문제를 원천 제거하기 위해 인증 수단을 이 한 가지로 통일했다.
// 자동 로그인(세션 유지)은 supabase-js가 세션을 localStorage에 보관하는 기본 동작이라 항상 켜져 있다 —
// 사용자가 끌 수 있는 옵션이 아니므로 체크박스 대신 안내 문구 한 줄로 알린다.
export default function Login() {
  useDocumentTitle('로그인')
  const { authUser, authLoading, login } = useUser()
  const navigate = useNavigate()
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 로그인은 선택 사항이라 이 화면엔 게스트도 들어올 수 있다 — authUser가 채워지는 순간(실제 로그인
  // 성공)에만 홈으로 이동한다. 신체정보 유무로 갈라 /profile로 보내지 않는 이유: 앱의 진입점은 항상
  // 홈(/analyze)이고, 신체정보가 없을 때의 안내는 그 화면이 이미 자체적으로 처리한다(router.jsx 참고).
  useEffect(() => {
    if (authLoading || !authUser) return
    navigate('/analyze', { replace: true })
  }, [authLoading, authUser, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(loginId, password)
      // 성공하면 세션이 잡히는 즉시 위 useEffect가 이동을 처리한다.
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ ...styles.page, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <ScreenHeader title="Mealyze" subtitle="오늘의 영양 균형을 확인해보세요" />

      <Card>
        <form onSubmit={handleSubmit}>
          <TextField
            label="아이디"
            id="login-id"
            type="text"
            inputMode="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="영문 소문자 + 숫자"
            value={loginId}
            onChange={(e) => setLoginId(normalizeLoginId(e.target.value))}
          />
          <TextField
            label="비밀번호"
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p style={styles.errorText}>{error}</p>}

          <AppButton type="submit" disabled={submitting || !loginId || !password} style={{ marginTop: spacing.lg }}>
            {submitting ? '로그인 중...' : '로그인'}
          </AppButton>
        </form>

        <p style={{ ...styles.helperText, fontSize: font.size.xs, textAlign: 'center', marginTop: spacing.md }}>
          로그인하면 이 기기에서 자동으로 로그인 상태가 유지돼요.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.xs,
            marginTop: spacing.lg,
          }}
        >
          <span style={{ fontSize: font.size.sm, color: colors.textSub }}>계정이 없으신가요?</span>
          <button type="button" className="tds-press" onClick={() => navigate('/signup')} style={styles.linkButton}>
            회원가입
          </button>
        </div>
      </Card>

      <button
        type="button"
        className="tds-press"
        onClick={() => navigate('/analyze')}
        style={{ ...styles.linkButton, color: colors.muted, display: 'block', margin: `${spacing.lg}px auto 0` }}
      >
        로그인 없이 둘러보기
      </button>
    </div>
  )
}
