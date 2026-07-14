import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { api } from '@/shared/api'

import { MarketQueryKeys } from './_keys'

export const marketSignalSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  confidence: z.number().min(0).max(100),
  trend: z.enum(['up', 'down', 'flat']),
  reasons: z.array(z.string()).min(1),
})

export type MarketSignal = z.infer<typeof marketSignalSchema>

const marketSignalListSchema = z.array(marketSignalSchema)

const DEMO_MARKET_SIGNALS: MarketSignal[] = [
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    confidence: 78,
    trend: 'up',
    reasons: ['AI 인프라 수요', '실적 기대감', '변동성 확대 구간'],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla',
    confidence: 54,
    trend: 'flat',
    reasons: ['가격 경쟁 압력', '거래량 둔화', '이벤트 전 관망'],
  },
  {
    symbol: 'AAPL',
    name: 'Apple',
    confidence: 62,
    trend: 'down',
    reasons: ['단기 모멘텀 약화', '환율 영향', '방어적 수급'],
  },
]

export async function getMarketSignals(): Promise<MarketSignal[]> {
  if (import.meta.env.VITE_USE_API === 'true') {
    const response = await api.get('/signals')

    return marketSignalListSchema.parse(response.data)
  }

  await new Promise((resolve) => window.setTimeout(resolve, 250))

  return marketSignalListSchema.parse(DEMO_MARKET_SIGNALS)
}

export const useGetMarketSignalsQuery = () => {
  return useQuery({
    queryKey: MarketQueryKeys.signals(),
    queryFn: getMarketSignals,
  })
}
