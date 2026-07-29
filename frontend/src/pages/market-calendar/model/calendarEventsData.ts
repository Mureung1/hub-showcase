import type { FilterChipOption } from '@/shared/ui/FilterChipRow'

import type { CalendarEvent, CalendarPeriod } from './types'

export const PERIOD_FILTERS: FilterChipOption<CalendarPeriod>[] = [
  { id: 'week', label: '이번 주' },
  { id: 'month', label: '이번 달' },
  { id: 'year', label: '연간' },
]

export const CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: 'us-cpi',
    time: '오늘 21:30',
    title: '미국 CPI 발표',
    description: '금리 인하 기대감을 좌우하는 핵심 물가 지표',
    impact: 'high',
  },
  {
    id: 'oil-inventory',
    time: '오늘 23:00',
    title: '원유 재고 발표',
    description: '유가와 정유, 항공 업종에 영향을 주는 지표',
    impact: 'low',
  },
  {
    id: 'fomc-minutes',
    time: '내일 03:00',
    title: 'FOMC 의사록 공개',
    description: '연준 위원들의 금리 시각 확인',
    impact: 'medium',
  },
  {
    id: 'us-retail-sales',
    time: '금 21:30',
    title: '미국 소매판매',
    description: '소비 경기 흐름을 보여주는 지표',
    impact: 'medium',
  },
]
