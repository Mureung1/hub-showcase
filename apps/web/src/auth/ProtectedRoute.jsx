import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuth } from './useAuth.js'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <div className="app-loading" role="status">로그인 상태를 확인하고 있습니다.</div>
  if (auth.status === 'anonymous') {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate replace to={`/?returnTo=${encodeURIComponent(returnTo)}`} />
  }
  return <Outlet />
}
