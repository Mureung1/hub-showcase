import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUser } from './context/UserContext.jsx'
import Header from './components/Header.jsx'
import AppShell from './components/AppShell.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Analyze from './pages/Analyze.jsx'
import Result from './pages/Result.jsx'
import Calendar from './pages/Calendar.jsx'
import MapPage from './pages/MapPage.jsx'
import MealsPage from './pages/MealsPage.jsx'

// Supabase 세션 기준 로그인 가드. authLoading 중(새로고침 직후 세션 복원 전)에는 아직 로그인
// 여부를 알 수 없으니, 이때 섣불리 /login으로 보내면 로그인된 사용자도 잠깐 튕겨 보인다 —
// 그래서 authLoading이 끝날 때까지는 아무것도 렌더링하지 않고 기다린다.
function RequireAuth({ children }) {
  const { user, authLoading } = useUser()
  const location = useLocation()

  if (authLoading) return null
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

// /profile은 최초 입력(온보딩)과 MY 탭(이미 프로필이 있는 경우) 두 가지로 쓰이지만, 둘 다 MY 탭을 통해
// 다른 화면으로 자유롭게 이동할 수 있어야 하므로 탭바는 항상 보여준다.
function ProfileRoute() {
  return (
    <RequireAuth>
      <AppShell>
        <Profile />
      </AppShell>
    </RequireAuth>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/analyze" replace />} />
        <Route
          path="/login"
          element={
            <AppShell hideTabBar>
              <Login />
            </AppShell>
          }
        />
        <Route path="/profile" element={<ProfileRoute />} />
        <Route
          path="/analyze"
          element={
            <RequireAuth>
              <AppShell>
                <Analyze />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/result"
          element={
            <RequireAuth>
              <AppShell>
                <Result />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/meals"
          element={
            <RequireAuth>
              <AppShell>
                <MealsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/calendar"
          element={
            <RequireAuth>
              <AppShell>
                <Calendar />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/map"
          element={
            <RequireAuth>
              <AppShell>
                <MapPage />
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
