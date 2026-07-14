import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WatchlistPage from './pages/WatchlistPage.jsx'
import ConditionsPage from './pages/ConditionsPage.jsx'
import StockPage from './pages/StockPage.jsx'
import ReviewPage from './pages/ReviewPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

/** 구 `/journal/:symbol` 북마크·Discord 알림 링크 호환용 리다이렉트. */
function JournalSymbolRedirect() {
  const { symbol } = useParams()
  return <Navigate to={`/stock/${symbol}`} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/watchlist" element={<WatchlistPage />} />
          <Route path="/conditions" element={<ConditionsPage />} />
          <Route path="/stock/:ticker" element={<StockPage />} />
          <Route path="/review/:tradeId" element={<ReviewPage />} />
          <Route path="/history" element={<HistoryPage />} />
          {/* 구 저널 경로 호환 (북마크·Discord 알림 링크) */}
          <Route path="/journal" element={<Navigate to="/history" replace />} />
          <Route path="/journal/:symbol" element={<JournalSymbolRedirect />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
