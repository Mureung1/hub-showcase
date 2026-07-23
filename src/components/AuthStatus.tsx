import { Link } from 'react-router-dom'
import { clearToken } from '../api/client.ts'
import { useCurrentUser } from '../hooks/useCurrentUser.ts'

function AuthStatus() {
  const { user, isLoading } = useCurrentUser()

  function handleLogout() {
    clearToken()
    window.location.reload()
  }

  if (isLoading) {
    return <p className="h-[18px] text-xs font-semibold uppercase tracking-wider text-accent" />
  }

  if (!user) {
    return (
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        <Link to="/login">로그인</Link> · <Link to="/signup">회원가입</Link>
      </p>
    )
  }

  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-accent">
      {user.nickname}님 ·{' '}
      <button onClick={handleLogout} type="button">
        로그아웃
      </button>
    </p>
  )
}

export default AuthStatus
