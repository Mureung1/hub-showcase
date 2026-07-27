import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { getAuthSession } from './api/auth'
import MainPage from './pages/MainPage'
import Login from './pages/Login'
import StoreDetailPage from './pages/StoreDetailPage'
import Signup from './pages/Signup'
import SettingsPage from './pages/SettingsPage'

function App() {
  const location = useLocation()
  const isAuthenticated = getAuthSession() !== null
  const isStandalonePage =
    location.pathname.startsWith('/stores/') ||
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/settings'

  return (
    <>
      {isAuthenticated && (
        <div hidden={isStandalonePage}>
          <MainPage />
        </div>
      )}

      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/app"
          element={isAuthenticated ? null : <Navigate to="/login" replace />}
        />
        <Route
          path="/stores/:storeId"
          element={
            isAuthenticated ? <StoreDetailPage /> : <Navigate to="/login" replace />
          }
        />
        <Route
          path="/settings"
          element={
            isAuthenticated ? <SettingsPage /> : <Navigate to="/login" replace />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
