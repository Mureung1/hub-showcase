import type { ImpactLevel } from '@/shared/ui/ImpactBadge'

export type { ImpactLevel }

export type CalendarPeriod = 'week' | 'month' | 'year'

export interface CalendarEvent {
  id: string
  time: string
  title: string
  description: string
  impact: ImpactLevel
  type?: string
  detail?: string
  scheduledAt?: string
  provider?: string
}
