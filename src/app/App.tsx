import { Navigate, Route, Routes } from 'react-router-dom'

import HomePage from '@/pages/home'
import WatchlistPage from '@/pages/watchlist'
import { AppLayout } from '@/widgets/app-layout'

export const App = () => {
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
