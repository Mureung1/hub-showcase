import { Navigate, Route, Routes } from 'react-router-dom'
import { AppStateProvider } from './state/AppStateContext'
import { useAppState } from './state/useAppState'
import AppLayout from './components/layout/AppLayout'
import StartPage from './pages/StartPage'
import MainPage from './pages/MainPage'
import SentPage from './pages/SentPage'
import RecommendPage from './pages/RecommendPage'
import StoragePage from './pages/StoragePage'
import LetterDetailPage from './pages/LetterDetailPage'

// 로그인 안 한 상태에서는 실제 기능 화면 접근을 막고 시작 화면으로 돌려보낸다.
// authLoading 중(로그인 여부를 아직 모르는 새로고침 직후 등)에는 성급히 리다이렉트하지 않는다.
function RequireAuth({ children }) {
  const { auth } = useAppState()
  if (auth.authLoading) return null
  if (!auth.user) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<StartPage />} />
        <Route path="/main" element={<RequireAuth><MainPage /></RequireAuth>} />
        <Route path="/sent" element={<RequireAuth><SentPage /></RequireAuth>} />
        <Route path="/recommend" element={<RequireAuth><RecommendPage /></RequireAuth>} />
        <Route path="/storage" element={<RequireAuth><StoragePage /></RequireAuth>} />
        <Route path="/storage/:type/:id" element={<RequireAuth><LetterDetailPage /></RequireAuth>} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AppStateProvider>
      <AppRoutes />
    </AppStateProvider>
  )
}

export default App
