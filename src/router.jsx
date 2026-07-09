import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import FoodDbTest from './pages/FoodDbTest.jsx'

function RequireAuth({ children }) {
  const { user } = useUser()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

// /profile은 최초 입력(온보딩)과 MY 탭(이미 프로필이 있는 경우) 두 가지로 쓰인다.
// 온보딩일 때만 탭바를 숨긴다.
function ProfileRoute() {
  const { user } = useUser()
  return (
    <AppShell hideTabBar={!user?.profile}>
      <Profile />
    </AppShell>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            <AppShell hideTabBar>
              <Login />
            </AppShell>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <ProfileRoute />
            </RequireAuth>
          }
        />
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
        {/* 임시 테스트 라우트: 식약처 식품DB 연동 확인용. 다음 단계에서 제거 예정. */}
        <Route
          path="/fooddb-test"
          element={
            <RequireAuth>
              <AppShell hideTabBar>
                <FoodDbTest />
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
