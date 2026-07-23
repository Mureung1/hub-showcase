import { Route, Routes } from 'react-router-dom'

import { HomePage } from '@/pages/home'
import { InvestmentStudyPage } from '@/pages/investment-study'
import { MarketCalendarPage } from '@/pages/market-calendar'
import { MarketNewsPage } from '@/pages/market-news'
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
      <Route path={ROUTES.MARKET_NEWS.slice(1)} element={<MarketNewsPage />} />
      <Route path={ROUTES.MARKET_CALENDAR.slice(1)} element={<MarketCalendarPage />} />
      <Route path={ROUTES.INVESTMENT_STUDY.slice(1)} element={<InvestmentStudyPage />} />
    </Route>
  </Routes>
)
