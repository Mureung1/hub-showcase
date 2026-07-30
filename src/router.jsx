import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom'
import { useUser } from './context/UserContext.jsx'
import AppButton from './components/AppButton.jsx'
import Header from './components/Header.jsx'
import AppShell from './components/AppShell.jsx'
import Card from './components/Card.jsx'
import GuestMigrationPrompt from './components/GuestMigrationPrompt.jsx'
import { useAppUpdateCheck } from './lib/appUpdate.js'
import Spinner from './components/Spinner.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Profile from './pages/Profile.jsx'
import MyQuestsPage from './pages/MyQuestsPage.jsx'
import MyLeaderboardPage from './pages/MyLeaderboardPage.jsx'
import MyBadgesPage from './pages/MyBadgesPage.jsx'
import MyQuizPage from './pages/MyQuizPage.jsx'
import MyWaterPage from './pages/MyWaterPage.jsx'
import MyRecommendedPage from './pages/MyRecommendedPage.jsx'
import MyCardSettingsPage from './pages/MyCardSettingsPage.jsx'
import Analyze from './pages/Analyze.jsx'
import Result from './pages/Result.jsx'
import Calendar from './pages/Calendar.jsx'
import MapPage from './pages/MapPage.jsx'
import MealsPage from './pages/MealsPage.jsx'
import { useDocumentTitle } from './lib/useDocumentTitle.js'
import { spacing, styles } from './styles/theme.js'

function CenteredSpinner() {
  return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spinner size={28} />
    </div>
  )
}

function ProfileErrorCard({ message, onRetry }) {
  return (
    <div style={styles.page}>
      <Card style={{ textAlign: 'center' }}>
        <p style={{ ...styles.errorText, margin: `0 0 ${spacing.lg}px` }}>{message}</p>
        <AppButton onClick={onRetry}>다시 시도</AppButton>
      </Card>
    </div>
  )
}

// 잘못된 경로(오타, 낡은 북마크 등)로 들어오면 이전엔 빈 흰 화면이었다 — 탭바가 있는 AppShell 안에
// 두어(아래 라우트 트리 참고) 사용자가 어디로도 돌아갈 수 있게 한다.
function NotFound() {
  useDocumentTitle('페이지를 찾을 수 없음')
  return (
    <div style={styles.page}>
      <Card style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: spacing.lg }}>페이지를 찾을 수 없어요.</p>
        <Link to="/analyze" className="tds-press" style={{ ...styles.buttonPrimary, display: 'flex', textDecoration: 'none' }}>
          홈으로 가기
        </Link>
      </Card>
    </div>
  )
}

// 게스트 우선 구조: 로그인 여부와 무관하게 모든 화면을 쓸 수 있어야 하므로, 여기서는 더 이상 /login으로
// 튕기지 않는다. 세션 복원(authLoading)과 신체정보 조회(profileLoading — 게스트는 localStorage, 로그인
// 계정은 Supabase)가 끝날 때까지만 스피너로 기다리고, 조회 자체가 실패했으면(네트워크 오류 등) 재시도
// 화면을 보여준다.
// AppShell 안쪽(콘텐츠 영역)의 레이아웃 라우트로 둔다 — 이 게이트가 셸 바깥에 있으면 로딩·오류
// 화면에서 하단 탭바까지 통째로 사라졌다 다시 나타난다.
function LoadGate() {
  const { authLoading, profileLoading, profileError, refetchProfile } = useUser()

  if (authLoading || profileLoading) return <CenteredSpinner />
  if (profileError) return <ProfileErrorCard message={profileError} onRetry={refetchProfile} />
  return <Outlet />
}

// 앱의 진짜 진입점("/"). 신체정보 유무·로그인 여부와 무관하게 항상 바로 홈(분석 화면)으로 보낸다 —
// 프로필이 없는 게스트를 /profile 온보딩으로 강제 이동시키지 않는다. 신체정보가 없을 때의 안내는
// Analyze.jsx의 성별 선택 카드(SexPromptCard)와 Result/MealsPage의 "프로필 입력하러 가기" 유도로 이미
// 충분히 처리되므로, 여기서 화면 자체를 바꿔치기할 필요가 없다. 조회 자체가 실패했으면(네트워크 오류
// 등) LoadGate와 동일한 재시도 화면을 보여준다.
function RootRedirect() {
  const { authLoading, profileLoading, profileError, refetchProfile } = useUser()
  if (authLoading || profileLoading) return <CenteredSpinner />
  if (profileError) return <ProfileErrorCard message={profileError} onRetry={refetchProfile} />
  return <Navigate to="/analyze" replace />
}

// AppShell(하단 탭바 포함)과 LoadGate를 각 라우트 element 안이 아니라 **레이아웃 라우트**로 올린다.
// 경로가 바뀌면 교체되는 것은 AppShell의 <Outlet/> 안쪽 콘텐츠뿐이고, 탭바 컴포넌트는 마운트된 채로
// 남는다 — 예전 구조에서는 라우트마다 자기 <AppShell>을 들고 있어 탭을 옮길 때마다 탭바까지 함께
// 다시 그려졌다. (화면 전환 애니메이션에서 탭바를 빼는 처리는 index.css의 .tds-tabbar 규칙 쪽이다.)
//
// /profile은 최초 입력(온보딩)과 MY 탭(이미 프로필이 있는 경우) 두 가지로 쓰이지만, 둘 다 MY 탭을 통해
// 다른 화면으로 자유롭게 이동할 수 있어야 하므로 탭바가 있는 쪽에 둔다. /login·/signup만 탭바를 숨긴다.
export default function AppRouter() {
  // 앱(APK)에서만 동작 — 웹에서는 no-op. App.jsx가 아니라 여기서 부르는 이유는 이 훅이 토스트를
  // 쓰는데 ToastProvider를 렌더하는 쪽이 App.jsx라 거기서는 아직 컨텍스트 바깥이기 때문이다.
  useAppUpdateCheck()
  return (
    <BrowserRouter>
      <Header />
      <GuestMigrationPrompt />
      <Routes>
        <Route element={<AppShell />}>
          {/* "/"는 곧바로 /analyze로 넘기는 통로지만, 프로필 조회가 끝나기 전에는 스피너가 보인다 —
              그 사이에도 탭바가 유지되도록 셸 안에 둔다. */}
          <Route path="/" element={<RootRedirect />} />
          <Route element={<LoadGate />}>
            <Route path="/profile" element={<Profile />} />
            {/* MY 탭 개편(리텐션 강화 v6) — 그리드 아이콘/위젯이 여는 하위 화면들. /profile과 같은
                레이아웃(AppShell/LoadGate) 아래에 둬서 탭바가 계속 보이고 MY 탭이 활성 상태로 남는다
                (tabs.js의 TABS가 my를 p.startsWith('/profile')로 매칭). */}
            <Route path="/profile/quests" element={<MyQuestsPage />} />
            <Route path="/profile/leaderboard" element={<MyLeaderboardPage />} />
            <Route path="/profile/badges" element={<MyBadgesPage />} />
            <Route path="/profile/quiz" element={<MyQuizPage />} />
            <Route path="/profile/water" element={<MyWaterPage />} />
            <Route path="/profile/recommended" element={<MyRecommendedPage />} />
            <Route path="/profile/card-settings" element={<MyCardSettingsPage />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/result" element={<Result />} />
            <Route path="/meals" element={<MealsPage />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/map" element={<MapPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<AppShell hideTabBar />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
