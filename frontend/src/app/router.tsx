import { lazy, type ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'

import { ROUTES } from '@/shared/config/routes'
import { AppLayoutWidget } from '@/widgets/app-layout'

import { AppRouteBoundary } from './providers/AppRouteBoundary'

const HomePage = lazy(async () => ({ default: (await import('@/pages/home')).HomePage }))
const StockAnalysisPage = lazy(async () => ({
  default: (await import('@/pages/stock-analysis')).StockAnalysisPage,
}))
const RecentAnalysisPage = lazy(async () => ({
  default: (await import('@/pages/recent-analysis')).RecentAnalysisPage,
}))
const MarketNewsPage = lazy(async () => ({
  default: (await import('@/pages/market-news')).MarketNewsPage,
}))
const MarketCalendarPage = lazy(async () => ({
  default: (await import('@/pages/market-calendar')).MarketCalendarPage,
}))
const InvestmentStudyPage = lazy(async () => ({
  default: (await import('@/pages/investment-study')).InvestmentStudyPage,
}))

const withRouteBoundary = (page: ReactNode) => <AppRouteBoundary>{page}</AppRouteBoundary>

export const AppRoutes = () => (
  <Routes>
    <Route path={ROUTES.HOME} element={<AppLayoutWidget />}>
      <Route index element={withRouteBoundary(<HomePage />)} />
      <Route
        path={ROUTES.STOCK_ANALYSIS.slice(1)}
        element={withRouteBoundary(<StockAnalysisPage />)}
      />
      <Route
        path={ROUTES.RECENT_ANALYSIS.slice(1)}
        element={withRouteBoundary(<RecentAnalysisPage />)}
      />
      <Route path={ROUTES.MARKET_NEWS.slice(1)} element={withRouteBoundary(<MarketNewsPage />)} />
      <Route
        path={ROUTES.MARKET_CALENDAR.slice(1)}
        element={withRouteBoundary(<MarketCalendarPage />)}
      />
      <Route
        path={ROUTES.INVESTMENT_STUDY.slice(1)}
        element={withRouteBoundary(<InvestmentStudyPage />)}
      />
    </Route>
  </Routes>
)
