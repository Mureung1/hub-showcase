import { Navigate } from 'react-router-dom'
import { getSession } from '../lib/session.js'

/*
 * 역할 가드 (T-03). 세션이 없거나 역할이 맞지 않으면 C0로 되돌린다.
 * 재진입 시 저장된 역할에 맞는 화면만 보이도록 강제한다.
 */
function RequireRole({ role, children }) {
  const session = getSession()
  if (session?.role !== role) {
    return <Navigate to="/" replace />
  }
  return children
}

export default RequireRole
