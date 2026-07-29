import type { ApiResponse } from '@/shared/api/httpClient'

import type {
  EconomicCalendarEvent,
  MarketCalendarEvent,
  ServerMarketNewsItem,
  StockAnalysisMetrics,
  StockCandle,
  StockQuote,
} from '../model/types'
import type {
  EconomicCalendarParams,
  MacroIndicatorsParams,
  MarketCalendarParams,
  MarketNewsParams,
  StockAnalysisParams,
  StockCandlesParams,
} from './marketApi'

const API_DELAY_MS = 180

const UPDATED_AT = '2026-07-29T09:00:00.000Z'

const MARKET_NEWS_ITEMS: ServerMarketNewsItem[] = [
  {
    id: 'macro-rate-cut-expectation',
    title: '미국 금리 인하 기대가 다시 커졌어요',
    summary: '물가 지표가 둔화되면서 성장주와 반도체 업종에 우호적인 흐름이 이어지고 있습니다.',
    originalUrl: 'https://example.com/markets/rate-cut-expectation',
    source: 'GAZUA Market Feed',
    category: 'MACRO',
    symbols: ['QQQ', 'NVDA'],
    publishedAt: '2026-07-29T08:30:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'samsung-memory-cycle',
    title: '삼성전자, 메모리 업황 회복 기대감 부각',
    summary: 'AI 서버 수요와 재고 정상화 기대가 겹치며 실적 개선 가능성이 주목받고 있습니다.',
    originalUrl: 'https://example.com/stocks/samsung-memory-cycle',
    source: 'GAZUA Market Feed',
    category: 'COMPANY',
    symbols: ['005930'],
    publishedAt: '2026-07-29T07:10:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'energy-oil-price',
    title: '국제 유가 상승, 에너지 업종 강세',
    summary: '원유 재고 감소와 지정학적 불확실성이 겹치며 정유와 에너지 관련주가 반응했습니다.',
    originalUrl: 'https://example.com/sectors/energy-oil-price',
    source: 'GAZUA Market Feed',
    category: 'SECTOR',
    symbols: ['XLE'],
    publishedAt: '2026-07-29T06:20:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'bitcoin-risk-on',
    title: '위험자산 선호 회복에 비트코인 반등',
    summary: '달러 약세와 기술주 반등이 맞물리며 가상자산 시장의 투자심리도 개선되고 있습니다.',
    originalUrl: 'https://example.com/crypto/bitcoin-risk-on',
    source: 'GAZUA Market Feed',
    category: 'CRYPTO',
    symbols: ['BTC'],
    publishedAt: '2026-07-29T05:40:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'fomc-minutes-preview',
    title: 'FOMC 의사록 공개 앞두고 금리 경로 주목',
    summary: '연준 위원들의 발언 톤에 따라 채권 금리와 성장주 변동성이 커질 수 있습니다.',
    originalUrl: 'https://example.com/macro/fomc-minutes-preview',
    source: 'GAZUA Market Feed',
    category: 'MACRO',
    symbols: ['TLT', 'QQQ'],
    publishedAt: '2026-07-29T04:50:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'tesla-margin-check',
    title: '테슬라, 마진 방어 여부가 다음 관전 포인트',
    summary: '신차 기대감은 살아 있지만 가격 인하 경쟁이 수익성 부담으로 작용할 수 있습니다.',
    originalUrl: 'https://example.com/stocks/tesla-margin-check',
    source: 'GAZUA Market Feed',
    category: 'COMPANY',
    symbols: ['TSLA'],
    publishedAt: '2026-07-29T04:10:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'apple-ai-device',
    title: '애플, 온디바이스 AI 기대감으로 반등',
    summary: '신제품 교체 수요와 AI 기능 확산 기대가 투자심리를 지지하고 있습니다.',
    originalUrl: 'https://example.com/stocks/apple-ai-device',
    source: 'GAZUA Market Feed',
    category: 'COMPANY',
    symbols: ['AAPL'],
    publishedAt: '2026-07-29T03:45:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'krw-weakness-exporters',
    title: '원화 약세에 수출 대형주 관심 확대',
    summary: '환율 흐름이 반도체와 자동차 업종 실적 기대에 우호적으로 해석되고 있습니다.',
    originalUrl: 'https://example.com/markets/krw-weakness-exporters',
    source: 'GAZUA Market Feed',
    category: 'DOMESTIC',
    symbols: ['005930', '000660'],
    publishedAt: '2026-07-29T03:00:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'bank-net-interest-margin',
    title: '은행주, 순이자마진 둔화 우려로 숨고르기',
    summary: '금리 인하 기대가 커지며 은행업종의 이익 방어력이 다시 점검되고 있습니다.',
    originalUrl: 'https://example.com/sectors/bank-net-interest-margin',
    source: 'GAZUA Market Feed',
    category: 'SECTOR',
    symbols: ['KB', 'JPM'],
    publishedAt: '2026-07-29T02:35:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'retail-sales-watch',
    title: '미국 소매판매 발표 앞두고 소비주 경계감',
    summary: '소비 둔화 여부가 경기 민감주와 달러 흐름에 영향을 줄 수 있습니다.',
    originalUrl: 'https://example.com/macro/retail-sales-watch',
    source: 'GAZUA Market Feed',
    category: 'GLOBAL',
    symbols: ['XLY', 'WMT'],
    publishedAt: '2026-07-29T01:40:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'bio-sector-rebound',
    title: '바이오 업종, 금리 부담 완화에 반등 시도',
    summary: '할인율 부담이 낮아질 수 있다는 기대가 성장 섹터 전반에 우호적으로 작용했습니다.',
    originalUrl: 'https://example.com/sectors/bio-sector-rebound',
    source: 'GAZUA Market Feed',
    category: 'SECTOR',
    symbols: ['XBI'],
    publishedAt: '2026-07-29T00:55:00.000Z',
    provider: 'NAVER',
  },
  {
    id: 'earnings-season-preview',
    title: '실적 시즌 본격화, 가이던스 눈높이 중요',
    summary: '매출보다 다음 분기 전망치가 주가 반응을 좌우할 가능성이 큽니다.',
    originalUrl: 'https://example.com/markets/earnings-season-preview',
    source: 'GAZUA Market Feed',
    category: 'GLOBAL',
    symbols: ['SPY', 'QQQ'],
    publishedAt: '2026-07-28T23:30:00.000Z',
    provider: 'NAVER',
  },
]

const ECONOMIC_CALENDAR_EVENTS: EconomicCalendarEvent[] = [
  {
    id: 'us-cpi',
    title: '미국 CPI 발표',
    country: 'US',
    currency: 'USD',
    scheduledAt: '2026-07-29T12:30:00.000Z',
    importance: 'HIGH',
    previous: '3.1%',
    consensus: '3.0%',
    actual: undefined,
    unit: '%',
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'kr-trade-balance',
    title: '한국 무역수지',
    country: 'KR',
    currency: 'KRW',
    scheduledAt: '2026-07-30T00:00:00.000Z',
    importance: 'MEDIUM',
    previous: '4.2B',
    consensus: '4.5B',
    actual: undefined,
    unit: 'USD',
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'us-retail-sales',
    title: '미국 소매판매',
    country: 'US',
    currency: 'USD',
    scheduledAt: '2026-07-31T12:30:00.000Z',
    importance: 'MEDIUM',
    previous: '0.4%',
    consensus: '0.3%',
    actual: undefined,
    unit: '%',
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'fomc-minutes',
    title: 'FOMC 의사록 공개',
    country: 'US',
    currency: 'USD',
    scheduledAt: '2026-08-01T18:00:00.000Z',
    importance: 'HIGH',
    previous: undefined,
    consensus: undefined,
    actual: undefined,
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'us-jobless-claims',
    title: '미국 신규 실업수당 청구건수',
    country: 'US',
    currency: 'USD',
    scheduledAt: '2026-08-02T12:30:00.000Z',
    importance: 'MEDIUM',
    previous: '224K',
    consensus: '226K',
    actual: undefined,
    unit: 'claims',
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'kr-cpi',
    title: '한국 소비자물가지수',
    country: 'KR',
    currency: 'KRW',
    scheduledAt: '2026-08-04T00:00:00.000Z',
    importance: 'MEDIUM',
    previous: '2.4%',
    consensus: '2.3%',
    actual: undefined,
    unit: '%',
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'us-pmi',
    title: '미국 제조업 PMI',
    country: 'US',
    currency: 'USD',
    scheduledAt: '2026-08-05T14:00:00.000Z',
    importance: 'MEDIUM',
    previous: '51.2',
    consensus: '51.0',
    actual: undefined,
    status: 'UPCOMING',
    provider: 'FMP',
  },
  {
    id: 'us-pce',
    title: '미국 PCE 물가지수',
    country: 'US',
    currency: 'USD',
    scheduledAt: '2026-08-07T12:30:00.000Z',
    importance: 'HIGH',
    previous: '2.8%',
    consensus: '2.7%',
    actual: undefined,
    unit: '%',
    status: 'UPCOMING',
    provider: 'FMP',
  },
]

const MARKET_CALENDAR_EVENTS: MarketCalendarEvent[] = [
  ...ECONOMIC_CALENDAR_EVENTS.map((event): MarketCalendarEvent => ({
    id: event.id,
    type: 'ECONOMIC',
    title: event.title,
    country: event.country,
    scheduledAt: event.scheduledAt,
    importance: event.importance,
    previous: event.previous,
    consensus: event.consensus,
    actual: event.actual,
    provider: 'FMP',
  })),
  {
    id: 'samsung-disclosure',
    type: 'DISCLOSURE',
    title: '삼성전자 잠정실적 공시',
    symbol: '005930',
    scheduledAt: '2026-07-30T06:00:00.000Z',
    importance: 'HIGH',
    provider: 'OPENDART',
  },
  {
    id: 'krx-market-close',
    type: 'MARKET_CLOSE',
    title: 'KRX 정규장 마감',
    country: 'KR',
    scheduledAt: '2026-07-29T06:30:00.000Z',
    importance: 'LOW',
    provider: 'TOSS_SECURITIES',
  },
  {
    id: 'nvidia-earnings-preview',
    type: 'DISCLOSURE',
    title: 'NVIDIA 실적 프리뷰',
    symbol: 'NVDA',
    scheduledAt: '2026-08-01T20:00:00.000Z',
    importance: 'HIGH',
    provider: 'OPENDART',
  },
  {
    id: 'tesla-delivery-update',
    type: 'DISCLOSURE',
    title: 'Tesla 인도량 업데이트',
    symbol: 'TSLA',
    scheduledAt: '2026-08-03T13:00:00.000Z',
    importance: 'MEDIUM',
    provider: 'OPENDART',
  },
  {
    id: 'us-market-open',
    type: 'MARKET_OPEN',
    title: '미국 정규장 개장',
    country: 'US',
    scheduledAt: '2026-07-29T13:30:00.000Z',
    importance: 'LOW',
    provider: 'TOSS_SECURITIES',
  },
  {
    id: 'us-market-close',
    type: 'MARKET_CLOSE',
    title: '미국 정규장 마감',
    country: 'US',
    scheduledAt: '2026-07-29T20:00:00.000Z',
    importance: 'LOW',
    provider: 'TOSS_SECURITIES',
  },
  {
    id: 'krx-holiday',
    type: 'MARKET_HOLIDAY',
    title: 'KRX 광복절 대체 휴장',
    country: 'KR',
    scheduledAt: '2026-08-17T00:00:00.000Z',
    importance: 'LOW',
    provider: 'TOSS_SECURITIES',
  },
  {
    id: 'us-early-close',
    type: 'EARLY_CLOSE',
    title: '미국장 조기 마감',
    country: 'US',
    scheduledAt: '2026-08-21T17:00:00.000Z',
    importance: 'LOW',
    provider: 'TOSS_SECURITIES',
  },
]

const STOCK_QUOTES: Record<string, StockQuote> = {
  '005930': {
    symbol: '005930',
    name: '삼성전자',
    market: 'KRX',
    currency: 'KRW',
    price: 78200,
    change: 1200,
    changeRate: 1.56,
    timestamp: UPDATED_AT,
    provider: 'TOSS_SECURITIES',
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA',
    market: 'NASDAQ',
    currency: 'USD',
    price: 178.42,
    change: 3.18,
    changeRate: 1.81,
    timestamp: UPDATED_AT,
    provider: 'TOSS_SECURITIES',
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla',
    market: 'NASDAQ',
    currency: 'USD',
    price: 284.1,
    change: 1.2,
    changeRate: 0.42,
    timestamp: UPDATED_AT,
    provider: 'TOSS_SECURITIES',
  },
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple',
    market: 'NASDAQ',
    currency: 'USD',
    price: 231.8,
    change: 2.04,
    changeRate: 0.89,
    timestamp: UPDATED_AT,
    provider: 'TOSS_SECURITIES',
  },
}

export async function fetchMarketNewsData(
  params: MarketNewsParams = {},
): Promise<ApiResponse<ServerMarketNewsItem[]>> {
  await wait()

  const limit = params.limit ?? MARKET_NEWS_ITEMS.length
  const normalizedQuery = params.query?.trim().toLowerCase()
  const normalizedSymbol = params.symbol?.trim().toUpperCase()

  const data = MARKET_NEWS_ITEMS.filter((item) => {
    if (params.category && item.category !== params.category) return false
    if (normalizedSymbol && !item.symbols.includes(normalizedSymbol)) return false
    if (!normalizedQuery) return true

    return [item.title, item.summary, item.source, item.category, ...item.symbols]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery))
  }).slice(0, limit)

  return {
    data,
    meta: {
      provider: 'NAVER',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchEconomicCalendarData(
  params: EconomicCalendarParams = {},
): Promise<ApiResponse<EconomicCalendarEvent[]>> {
  await wait()

  return {
    data: ECONOMIC_CALENDAR_EVENTS.filter((event) => {
      if (params.country && event.country !== params.country) return false
      if (params.importance && event.importance !== params.importance) return false
      return true
    }),
    meta: {
      provider: 'FMP',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchMarketCalendarData(
  params: MarketCalendarParams = {},
): Promise<ApiResponse<MarketCalendarEvent[]>> {
  await wait()

  const requestedTypes = new Set(params.types?.split(',').filter(Boolean))

  return {
    data: MARKET_CALENDAR_EVENTS.filter((event) => {
      if (requestedTypes.size > 0 && !requestedTypes.has(event.type)) return false
      if (params.country && event.country !== params.country) return false
      if (params.importance && event.importance !== params.importance) return false
      return true
    }),
    meta: {
      providers: ['FMP', 'OPENDART', 'TOSS_SECURITIES'],
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchDisclosuresData(): Promise<ApiResponse<unknown[]>> {
  await wait()

  return {
    data: [
      {
        id: 'samsung-disclosure',
        symbol: '005930',
        title: '삼성전자 잠정실적 공시',
        disclosedAt: '2026-07-30T06:00:00.000Z',
        provider: 'OPENDART',
      },
      {
        id: 'skhynix-disclosure',
        symbol: '000660',
        title: 'SK하이닉스 주요 경영사항 공시',
        disclosedAt: '2026-07-31T06:00:00.000Z',
        provider: 'OPENDART',
      },
    ],
    meta: {
      provider: 'OPENDART',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchMacroIndicatorsData(
  params: MacroIndicatorsParams = {},
): Promise<ApiResponse<unknown[]>> {
  await wait()

  const requestedNames = new Set(
    params.names
      ?.split(',')
      .map((name) => name.trim())
      .filter(Boolean),
  )
  const indicators = [
    { name: 'CPI', label: '미국 CPI', value: '3.0%', previous: '3.1%', provider: 'FRED' },
    {
      name: 'UNEMPLOYMENT',
      label: '미국 실업률',
      value: '4.0%',
      previous: '4.1%',
      provider: 'FRED',
    },
    {
      name: 'FED_FUNDS_RATE',
      label: '미국 기준금리',
      value: '4.50%',
      previous: '4.75%',
      provider: 'FRED',
    },
  ]

  return {
    data:
      requestedNames.size > 0
        ? indicators.filter((indicator) => requestedNames.has(indicator.name))
        : indicators,
    meta: {
      provider: 'FRED',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchStockQuoteData(symbol: string): Promise<ApiResponse<StockQuote>> {
  await wait()

  return {
    data: STOCK_QUOTES[symbol.toUpperCase()] ?? {
      symbol,
      name: symbol,
      market: 'NASDAQ',
      currency: 'USD',
      price: 128.32,
      change: 0.84,
      changeRate: 0.66,
      timestamp: UPDATED_AT,
      provider: 'TOSS_SECURITIES',
    },
    meta: {
      provider: 'TOSS_SECURITIES',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchStockCandlesData(
  symbol: string,
  params: StockCandlesParams = {},
): Promise<ApiResponse<StockCandle[]>> {
  await wait()

  const interval = params.interval ?? '1d'
  const count = params.count ?? 20
  const basePrice = symbol === '005930' ? 76000 : 170

  return {
    data: Array.from({ length: count }, (_, index) => {
      const close = basePrice + index * (symbol === '005930' ? 120 : 0.7)

      return {
        symbol,
        interval,
        timestamp: new Date(Date.UTC(2026, 6, 1 + index)).toISOString(),
        open: close - 80,
        high: close + 180,
        low: close - 220,
        close,
        volume: 1_000_000 + index * 25_000,
        provider: 'TOSS_SECURITIES',
      }
    }),
    meta: {
      provider: 'TOSS_SECURITIES',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

export async function fetchStockAnalysisData(
  symbol: string,
  params: StockAnalysisParams = {},
): Promise<ApiResponse<StockAnalysisMetrics>> {
  await wait()

  return {
    data: {
      symbol,
      asOf: UPDATED_AT,
      return1d: 1.56,
      return5d: 4.12,
      return20d: 7.85,
      movingAverage5: 77680,
      movingAverage20: 74210,
      movingAverage60: 70840,
      rsi14: 62.4,
      annualizedVolatility: 23.8,
      volumeChangeRate: 18.5,
      drawdownFromRecentHigh: -3.2,
      basis: {
        period: params.period ?? '6m',
        dataPoints: 126,
        generatedAt: UPDATED_AT,
      },
    },
    meta: {
      provider: 'TOSS_SECURITIES',
      updatedAt: UPDATED_AT,
      cached: true,
      isDelayed: true,
    },
  }
}

function wait(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, API_DELAY_MS)
  })
}
