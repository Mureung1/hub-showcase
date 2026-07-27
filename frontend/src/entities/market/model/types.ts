export type MarketNewsCategory = 'DOMESTIC' | 'GLOBAL' | 'MACRO' | 'COMPANY' | 'SECTOR' | 'CRYPTO'

export interface ServerMarketNewsItem {
  id: string
  title: string
  summary: string
  originalUrl: string
  providerUrl?: string
  source?: string
  category: MarketNewsCategory
  symbols: string[]
  publishedAt: string
  provider: 'NAVER'
}

export type MarketEventImportance = 'LOW' | 'MEDIUM' | 'HIGH'

export interface EconomicCalendarEvent {
  id: string
  title: string
  country: string
  currency?: string
  scheduledAt: string
  importance: MarketEventImportance
  previous?: number | string
  consensus?: number | string
  actual?: number | string
  unit?: string
  status: 'UPCOMING' | 'RELEASED'
  provider: 'FMP'
}

export type MarketCalendarEventType =
  | 'ECONOMIC'
  | 'DISCLOSURE'
  | 'MARKET_OPEN'
  | 'MARKET_CLOSE'
  | 'MARKET_HOLIDAY'
  | 'EARLY_CLOSE'

export interface MarketCalendarEvent {
  id: string
  type: MarketCalendarEventType
  title: string
  country?: string
  symbol?: string
  scheduledAt: string
  importance?: MarketEventImportance
  previous?: string | number
  consensus?: string | number
  actual?: string | number
  provider: 'FMP' | 'OPENDART' | 'TOSS_SECURITIES'
}

export interface StockQuote {
  symbol: string
  name: string
  market: 'KRX' | 'NASDAQ' | 'NYSE' | 'AMEX'
  currency: 'KRW' | 'USD'
  price: number
  change: number
  changeRate: number
  timestamp: string
  provider: 'TOSS_SECURITIES'
}

export interface StockCandle {
  symbol: string
  interval: string
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
  provider: 'TOSS_SECURITIES'
}

export interface StockAnalysisMetrics {
  symbol: string
  asOf: string
  return1d?: number
  return5d?: number
  return20d?: number
  movingAverage5?: number
  movingAverage20?: number
  movingAverage60?: number
  rsi14?: number
  annualizedVolatility?: number
  volumeChangeRate?: number
  drawdownFromRecentHigh?: number
  basis: {
    period: string
    dataPoints: number
    generatedAt: string
  }
}
