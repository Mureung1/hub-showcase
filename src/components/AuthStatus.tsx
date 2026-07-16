import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/context/AuthContext'

export default function AuthStatus() {
  const { user, username, loading, signOut } = useAuth()

  if (loading) return null

  if (user) {
    return (
      <div className="ml-auto flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        <span>{username ?? '사용자'}님</span>
        <button type="button" onClick={signOut} style={{ color: 'var(--color-text-muted)' }}>
          로그아웃
        </button>
      </div>
    )
  }

  return (
    <Link to="/login" className="ml-auto text-xs font-medium" style={{ color: 'var(--color-accent-text)' }}>
      로그인
    </Link>
  )
}
