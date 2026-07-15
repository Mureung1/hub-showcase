import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

function CenteredSpinner() {
  return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={28} />
    </div>
  )
}

// 게스트 우선 구조: 로그인 여부와 무관하게 모든 화면을 쓸 수 있어야 하므로, 여기서는 더 이상 /login으로
// 튕기지 않는다. 세션 복원(authLoading)과 신체정보 조회(profileLoading — 게스트는 localStorage, 로그인
// 계정은 Supabase)가 끝날 때까지만 스피너로 기다리고, 조회 자체가 실패했으면(네트워크 오류 등) 재시도
// 화면을 보여준다.
function LoadGate({ children }) {
  const { authLoading, profileLoading, profileError, refetchProfile } = useUser()

  if (authLoading || profileLoading) return <CenteredSpinner />
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

// 앱의 진짜 진입점("/"). 신체정보가 이미 있으면 바로 홈(분석 화면)으로 보내고, 없으면(게스트든 로그인
// 계정이든 동일하게) 권장 섭취량 계산에 필요한 정보를 받기 위해 최초 1회 /profile로 안내한다. 로그인
// 여부는 이 판단에 관여하지 않는다 — 게스트도 신체정보만 있으면 곧장 홈으로 간다.
function RootRedirect() {
  const { authLoading, profileLoading, profile } = useUser()
  if (authLoading || profileLoading) return <CenteredSpinner />
  return <Navigate to={profile ? '/analyze' : '/profile'} replace />
}

// /profile은 최초 입력(온보딩)과 MY 탭(이미 프로필이 있는 경우) 두 가지로 쓰이지만, 둘 다 MY 탭을 통해
// 다른 화면으로 자유롭게 이동할 수 있어야 하므로 탭바는 항상 보여준다.
function ProfileRoute() {
  return (
    <LoadGate>
      <AppShell>
        <Profile />
      </AppShell>
    </LoadGate>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
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
            <LoadGate>
              <AppShell>
                <Analyze />
              </AppShell>
            </LoadGate>
          }
        />
        <Route
          path="/result"
          element={
            <LoadGate>
              <AppShell>
                <Result />
              </AppShell>
            </LoadGate>
          }
        />
        <Route
          path="/meals"
          element={
            <LoadGate>
              <AppShell>
                <MealsPage />
              </AppShell>
            </LoadGate>
          }
        />
        <Route
          path="/calendar"
          element={
            <LoadGate>
              <AppShell>
                <Calendar />
              </AppShell>
            </LoadGate>
          }
        />
        <Route
          path="/map"
          element={
            <LoadGate>
              <AppShell>
                <MapPage />
              </AppShell>
            </LoadGate>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
