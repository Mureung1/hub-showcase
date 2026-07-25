import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import SearchPage from './pages/SearchPage'
import ResultPage from './pages/ResultPage'
import ConfirmPage from './pages/ConfirmPage'
import RulesPage from './pages/RulesPage'
import PointsPage from './pages/PointsPage'
import BulkyPage from './pages/BulkyPage'

export default function App() {
  return (
    <div className="phone relative mx-auto min-h-[840px] max-w-[420px] overflow-hidden rounded-[26px] border border-line bg-card">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/result/:itemId" element={<ResultPage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/points" element={<PointsPage />} />
        <Route path="/bulky" element={<BulkyPage />} />
      </Routes>
    </div>
  )
}
