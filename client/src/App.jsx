import { Routes, Route, Navigate } from 'react-router-dom'
import { getSession } from './lib/session.js'
import RequireRole from './components/RequireRole.jsx'
import RoleSelectPage from './pages/RoleSelectPage.jsx'
import OwnerHomePage from './pages/owner/OwnerHomePage.jsx'
import StoreRegisterPage from './pages/owner/StoreRegisterPage.jsx'
import DealRegisterPage from './pages/owner/DealRegisterPage.jsx'
import ConsumerHomePage from './pages/consumer/ConsumerHomePage.jsx'
import DealDetailPage from './pages/consumer/DealDetailPage.jsx'

// C0 진입: 이미 역할을 고른 세션이면 해당 홈으로 자동 라우팅, 아니면 역할 선택.
function Entry() {
  const session = getSession()
  if (session?.role === 'owner') return <Navigate to="/owner" replace />
  if (session?.role === 'consumer') return <Navigate to="/app" replace />
  return <RoleSelectPage />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route
        path="/owner"
        element={
          <RequireRole role="owner">
            <OwnerHomePage />
          </RequireRole>
        }
      />
      <Route
        path="/owner/store/new"
        element={
          <RequireRole role="owner">
            <StoreRegisterPage />
          </RequireRole>
        }
      />
      <Route
        path="/owner/deals/new"
        element={
          <RequireRole role="owner">
            <DealRegisterPage />
          </RequireRole>
        }
      />
      <Route
        path="/app"
        element={
          <RequireRole role="consumer">
            <ConsumerHomePage />
          </RequireRole>
        }
      />
      <Route
        path="/app/deals/:id"
        element={
          <RequireRole role="consumer">
            <DealDetailPage />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
