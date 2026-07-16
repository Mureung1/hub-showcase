import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import LoginPage from './pages/LoginPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import WatchlistPage from './pages/WatchlistPage.jsx'
import ConditionsPage from './pages/ConditionsPage.jsx'
import ConditionDetailPage from './pages/ConditionDetailPage.jsx'
import StockPage from './pages/StockPage.jsx'
import TradeDetailPage from './pages/TradeDetailPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'

/** 구 `/journal/:symbol` 북마크·Discord 알림 링크 호환용 리다이렉트. */
function JournalSymbolRedirect() {
  const { symbol } = useParams()
  return <Navigate to={`/stock/${symbol}`} replace />
}

/** 구 `/review/:tradeId`(ReviewPage) 흡수 후 리다이렉트 — `/trade/:id`가 AI 복기 섹션을 포함한다. */
function ReviewRedirect() {
  const { tradeId } = useParams()
  return <Navigate to={`/trade/${tradeId}`} replace />
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
          <Route path="/condition/:id" element={<ConditionDetailPage />} />
          <Route path="/stock/:ticker" element={<StockPage />} />
          <Route path="/trade/:id" element={<TradeDetailPage />} />
          <Route path="/review/:tradeId" element={<ReviewRedirect />} />
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
