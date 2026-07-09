import { Routes, Route } from 'react-router-dom'
import { AppStateProvider } from './context/AppStateContext.jsx'
import Atmosphere from './components/Atmosphere.jsx'
import BottomNav from './components/BottomNav.jsx'
import HomePage from './pages/HomePage.jsx'
import MeetingListPage from './pages/MeetingListPage.jsx'
import MeetingDetailPage from './pages/MeetingDetailPage.jsx'
import MeetingCreatePage from './pages/MeetingCreatePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import MyPage from './pages/MyPage.jsx'

export default function App() {
  return (
    <AppStateProvider>
      <div className="app-shell">
        <Atmosphere />
        <div className="page">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/meetings" element={<MeetingListPage />} />
            <Route path="/meetings/new" element={<MeetingCreatePage />} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/mypage" element={<MyPage />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </AppStateProvider>
  )
}
