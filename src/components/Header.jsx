import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext.jsx'

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
        padding: '12px 16px',
        borderBottom: '1px solid #e0e0e0',
      }}
    >
      <span>{user.id}님</span>
      <button type="button" onClick={handleLogout}>
        로그아웃
      </button>
    </header>
  )
}
