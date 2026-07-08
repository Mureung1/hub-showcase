import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'
import { colors, spacing, font, styles } from '../styles/theme.js'

export default function Header() {
  const { user, logout } = useUser()
  const navigate = useNavigate()

  if (!user) return null

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
