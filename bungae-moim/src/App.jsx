import { Routes, Route } from 'react-router-dom'
import { AppStateProvider, useAppState } from './context/AppStateContext.jsx'
import Atmosphere from './components/Atmosphere.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomePage from './pages/HomePage.jsx'
import MeetingListPage from './pages/MeetingListPage.jsx'
import MeetingDetailPage from './pages/MeetingDetailPage.jsx'
import MeetingCreatePage from './pages/MeetingCreatePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MyPage from './pages/MyPage.jsx'
import BirthDateGate from './pages/BirthDateGate.jsx'

// 라우트/게이트 분기는 컨텍스트를 읽어야 하므로 Provider 안쪽의 별도 컴포넌트에서 처리한다.
function AppContent() {
  const { authLoading, isLoggedIn, currentUser } = useAppState()
  // 로그인했는데 생년월일이 없으면 다른 화면으로 못 가고 입력부터 받는다(기획서 6.1).
  const needsBirthDate = !authLoading && isLoggedIn && currentUser.birthDate == null

  return (
    <div className="app-shell">
      <Atmosphere />
      <div className="page">
        {needsBirthDate ? (
          <BirthDateGate />
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/meetings" element={<MeetingListPage />} />
            <Route path="/meetings/new" element={<MeetingCreatePage />} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mypage" element={<MyPage />} />
          </Routes>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  )
}
