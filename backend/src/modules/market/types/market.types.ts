export type MarketProvider = 'NAVER' | 'FMP' | 'OPENDART' | 'FRED' | 'TOSS_SECURITIES'

export interface ApiResponseMeta {
  provider?: MarketProvider
  providers?: MarketProvider[]
  updatedAt: string
  cached: boolean
  isDelayed?: boolean
}

export interface ApiResponse<T> {
  data: T
  meta: ApiResponseMeta
}

export type MarketNewsCategory = 'DOMESTIC' | 'GLOBAL' | 'MACRO' | 'COMPANY' | 'SECTOR' | 'CRYPTO'

export interface MarketNewsItem {
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

export interface DartCompanyCode {
  corpCode: string
  corpName: string
  stockCode?: string
  modifiedAt: string
}

export interface CorporateDisclosure {
  id: string
  corpCode: string
  stockCode?: string
  companyName: string
  reportName: string
  submittedAt: string
  submitter: string
  disclosureType: string
  detailType?: string
  originalUrl: string
  provider: 'OPENDART'
}

export interface MacroSeries {
  seriesId: string
  title: string
  unit: string
  frequency: string
  observations: Array<{
    date: string
    value: number | null
  }>
  provider: 'FRED'
}

export type StockMarket = 'KRX' | 'NASDAQ' | 'NYSE' | 'AMEX'

export interface StockQuote {
  symbol: string
  name: string
  market: StockMarket
  currency: 'KRW' | 'USD'
  price: number
  change: number
  changeRate: number
  open?: number
  high?: number
  low?: number
  previousClose?: number
  volume?: number
  tradingValue?: number
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
  tradingValue?: number
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

export type MarketCalendarEventType =
  'ECONOMIC' | 'DISCLOSURE' | 'MARKET_OPEN' | 'MARKET_CLOSE' | 'MARKET_HOLIDAY' | 'EARLY_CLOSE'

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

export interface ProviderRawResult<T> {
  data: T
  updatedAt: string
  isDelayed?: boolean
}

export interface CachedResult<T> {
  value: T
  updatedAt: string
  cached: boolean
}
