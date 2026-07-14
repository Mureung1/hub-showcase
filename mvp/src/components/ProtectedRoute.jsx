import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/useSession.js'
import AppLayout from './AppLayout.jsx'

/**
 * 세션이 없으면 /login으로 리다이렉트하고, 있으면 AppLayout으로 감싼
 * 하위 라우트(Outlet)를 렌더링한다.
 */
function ProtectedRoute() {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="route-loading">
        <p>불러오는 중...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}

export default ProtectedRoute
