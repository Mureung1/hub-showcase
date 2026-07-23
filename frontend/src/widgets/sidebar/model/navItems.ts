import { BarChart3, BookOpen, CalendarDays, History, Home, Newspaper } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { ROUTES } from '@/shared/config/routes'

export interface NavItem {
  id: string
  label: string
  icon: LucideIcon
  to?: string
}

export interface NavSection {
  id: string
  title: string
  items: NavItem[]
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'analysis',
    title: '분석',
    items: [
      { id: 'home', label: '홈 (AI 분석)', icon: Home, to: ROUTES.HOME },
      { id: 'stock-analysis', label: '종목 분석', icon: BarChart3, to: '/stocks/nvda' },
      { id: 'recent-analysis', label: '최근 분석', icon: History, to: ROUTES.RECENT_ANALYSIS },
    ],
  },
  {
    id: 'market',
    title: '시장',
    items: [
      { id: 'market-news', label: '시장 소식', icon: Newspaper, to: ROUTES.MARKET_NEWS },
      { id: 'market-calendar', label: '증시 캘린더', icon: CalendarDays },
    ],
  },
  {
    id: 'study',
    title: '학습',
    items: [{ id: 'investment-study', label: '투자 공부', icon: BookOpen }],
  },
]
