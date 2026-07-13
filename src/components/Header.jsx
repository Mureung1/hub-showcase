import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { colors, spacing, font, styles } from '../styles/theme.js'

export default function Header() {
  const { user, logout } = useUser()
  const navigate = useNavigate()

  // 게스트(user.isGuest)는 계정이 아니라 로컬 전용 임시 신분이라 상단바 자체를 보여주지 않는다 —
  // "guest_xxxx님"처럼 내부 id가 노출되는 것도 이걸로 함께 방지된다.
  if (!user || user.isGuest) return null

  function handleLogout() {
    logout()
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
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
        <span style={{ fontSize: font.size.sm, color: colors.muted }}>{user.id}님</span>
        <button type="button" className="tds-press" onClick={handleLogout} style={styles.buttonSecondary}>
          로그아웃
        </button>
      </div>
    </header>
  )
}
