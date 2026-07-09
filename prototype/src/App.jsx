import { Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ConditionsPage from './pages/ConditionsPage.jsx'
import JournalPage from './pages/JournalPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import DiscordPreviewPage from './pages/DiscordPreviewPage.jsx'

// 프로토타입: 실제 동작하지 않는 목데이터 기반 화면. 라우팅은 SPA.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/conditions" element={<ConditionsPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/journal/:symbol" element={<JournalPage />} />
        <Route path="/review/:entryId" element={<ReviewPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/discord" element={<DiscordPreviewPage />} />
      </Route>
    </Routes>
  )
}
