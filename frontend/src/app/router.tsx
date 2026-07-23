import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/home'
import { RecentAnalysisPage } from '@/pages/recent-analysis'
import { StockAnalysisPage } from '@/pages/stock-analysis'
import { ROUTES } from '@/shared/config/routes'
import { AppLayoutWidget } from '@/widgets/app-layout'

export const AppRoutes = () => (
  <Routes>
    <Route path={ROUTES.HOME} element={<AppLayoutWidget />}>
      <Route index element={<HomePage />} />
      <Route path={ROUTES.STOCK_ANALYSIS.slice(1)} element={<StockAnalysisPage />} />
      <Route path={ROUTES.RECENT_ANALYSIS.slice(1)} element={<RecentAnalysisPage />} />
    </Route>
  </Routes>
)
