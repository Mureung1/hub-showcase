import { Link } from 'react-router-dom'
import { clearToken } from '../api/client.ts'
import { useCurrentUser } from '../hooks/useCurrentUser.ts'

function AuthBanner() {
  const { user, isLoading } = useCurrentUser()

  function handleLogout() {
    clearToken()
    window.location.reload()
  }

  if (isLoading) {
    return null
  }

  if (!user) {
    return (
      <div className="flex justify-center gap-3 bg-accent-bg px-4 py-2 text-sm">
        <Link className="text-accent" to="/login">로그인</Link>
        <Link className="text-accent" to="/signup">회원가입</Link>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center gap-3 bg-accent-bg px-4 py-2 text-sm">
      <span>{user.email}님 환영합니다</span>
      <button className="text-accent underline" onClick={handleLogout} type="button">
        로그아웃
      </button>
    </div>
  )
}

export default AuthBanner
