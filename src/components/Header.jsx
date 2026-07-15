import { useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { colors, spacing, font, styles } from '../styles/theme.js'

// 게스트도 항상 헤더를 본다 — 로그인 계정이면 이메일+로그아웃, 게스트면 로그인/회원가입 진입 버튼을
// 보여준다(로그인 화면 자체에서는 중복이라 버튼을 숨긴다).
export default function Header() {
  const { authUser, authMode, logout } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${spacing.md}px ${spacing.lg}px`,
        background: colors.surface,
      }}
    >
      <span style={{ fontWeight: 800, color: colors.primary, letterSpacing: '-0.02em' }}>CJMT</span>
      {authMode === 'user' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
          <span style={{ fontSize: font.size.sm, color: colors.muted }}>{authUser.email}님</span>
          <button type="button" className="tds-press" onClick={handleLogout} style={styles.buttonSecondary}>
            로그아웃
          </button>
        </div>
      ) : (
        location.pathname !== '/login' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
            <span style={{ fontSize: font.size.sm, color: colors.muted }}>게스트로 이용 중</span>
            <button type="button" className="tds-press" onClick={() => navigate('/login')} style={styles.buttonSecondary}>
              로그인 / 회원가입
            </button>
          </div>
        )
      )}
    </header>
  )
}
