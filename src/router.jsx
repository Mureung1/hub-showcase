import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useUser } from './context/UserContext.jsx'
import AppButton from './components/AppButton.jsx'
import Header from './components/Header.jsx'
import AppShell from './components/AppShell.jsx'
import Card from './components/Card.jsx'
import Spinner from './components/Spinner.jsx'
import Login from './pages/Login.jsx'
import Profile from './pages/Profile.jsx'
import Analyze from './pages/Analyze.jsx'
import Result from './pages/Result.jsx'
import Calendar from './pages/Calendar.jsx'
import MapPage from './pages/MapPage.jsx'
import MealsPage from './pages/MealsPage.jsx'
import { spacing, styles } from './styles/theme.js'

// Supabase 세션 기준 로그인 가드. authLoading 중(새로고침 직후 세션 복원 전)이거나 세션은 있지만
// profiles 테이블 조회가 아직 안 끝났으면(profileLoading), 이 시점에 섣불리 판단하면 로그인된
// 사용자를 /login으로 튕기거나, 프로필이 있는데도 "없음"으로 오판해 온보딩 화면을 잠깐 보여주게
// 된다 — 그래서 두 로딩이 모두 끝날 때까지 스피너만 보여주고 기다린다. 조회 자체가 실패했으면(네트워크
// 오류 등) "프로필 없음"으로 오판하지 않도록 별도 재시도 화면을 보여준다.
function RequireAuth({ children }) {
  const { user, authLoading, profileLoading, profileError, refetchProfile } = useUser()
  const location = useLocation()

  if (authLoading || (user && profileLoading)) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={28} />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (profileError) {
    return (
      <div style={styles.page}>
        <Card style={{ textAlign: 'center' }}>
          <p style={{ ...styles.errorText, margin: `0 0 ${spacing.lg}px` }}>{profileError}</p>
          <AppButton onClick={refetchProfile}>다시 시도</AppButton>
        </Card>
      </div>
    )
  }
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
