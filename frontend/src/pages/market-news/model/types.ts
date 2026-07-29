import type { ImpactLevel } from '@/shared/ui/ImpactBadge'

export type { ImpactLevel }

export interface MarketNewsItem {
  id: string
  title: string
  impact: ImpactLevel
  tags: string[]
  description: string
  easyInterpretation: string
  originalUrl?: string
  source?: string
  provider?: string
  publishedAt?: string
}
