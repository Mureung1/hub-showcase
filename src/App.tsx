import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from './components/AppLayout'
import { HomePage } from './pages/HomePage'
import { WatchlistPage } from './pages/WatchlistPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="watchlist" element={<WatchlistPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
