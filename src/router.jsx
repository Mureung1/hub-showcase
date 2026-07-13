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
        <Route path="/" element={<Navigate to="/analyze" replace />} />
        <Route
          path="/login"
          element={
            <AppShell hideTabBar>
              <Login />
            </AppShell>
          }
        />
        {/* 게스트도 항상 실체 있는 user(게스트 계정)를 가지므로 로그인 가드 없이 전 라우트를 연다 */}
        <Route path="/profile" element={<ProfileRoute />} />
        <Route
          path="/analyze"
          element={
            <AppShell>
              <Analyze />
            </AppShell>
          }
        />
        <Route
          path="/result"
          element={
            <AppShell>
              <Result />
            </AppShell>
          }
        />
        <Route
          path="/meals"
          element={
            <AppShell>
              <MealsPage />
            </AppShell>
          }
        />
        <Route
          path="/calendar"
          element={
            <AppShell>
              <Calendar />
            </AppShell>
          }
        />
        <Route
          path="/map"
          element={
            <AppShell>
              <MapPage />
            </AppShell>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
