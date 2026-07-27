import type { MarketNewsCategory } from '../types/market.types'

export const MARKET_CACHE_TTL_MS = {
  NEWS: 5 * 60 * 1000,
  ECONOMIC_CALENDAR: 10 * 60 * 1000,
  DISCLOSURES: 5 * 60 * 1000,
  FRED_SERIES: 60 * 60 * 1000,
  STOCK_QUOTE: 15 * 1000,
  STOCK_CANDLES_1M: 30 * 1000,
  STOCK_CANDLES_1D: 5 * 60 * 1000,
  STOCK_INFO: 24 * 60 * 60 * 1000,
  TRADING_CALENDAR: 12 * 60 * 60 * 1000,
  DART_COMPANY_CODES: 24 * 60 * 60 * 1000,
} as const

export const MARKET_PROVIDER_BASE_URLS = {
  NAVER_DEVELOPERS: 'https://openapi.naver.com/v1/search/news.json',
  NAVER_API_HUB: 'https://naverapihub.apigw.ntruss.com/search/v1/news',
  FMP: 'https://financialmodelingprep.com/stable',
  OPENDART: 'https://opendart.fss.or.kr/api',
  FRED: 'https://api.stlouisfed.org/fred',
  TOSS_SECURITIES: 'https://openapi.tossinvest.com',
} as const

export const DEFAULT_NEWS_QUERIES: Record<MarketNewsCategory, readonly string[]> = {
  DOMESTIC: ['국내 증시', '코스피', '코스닥'],
  GLOBAL: ['미국 증시', '나스닥', 'S&P500'],
  MACRO: ['거시경제', '금리', '환율'],
  COMPANY: ['실적 발표', '상장사 공시'],
  SECTOR: ['반도체', '2차전지', '바이오'],
  CRYPTO: ['비트코인', '가상자산'],
}

export const MARKET_NEWS_CATEGORIES = Object.keys(DEFAULT_NEWS_QUERIES) as MarketNewsCategory[]

export const DEFAULT_FRED_SERIES = {
  CPI: 'CPIAUCSL',
  CORE_CPI: 'CPILFESL',
  PCE: 'PCEPI',
  CORE_PCE: 'PCEPILFE',
  UNEMPLOYMENT: 'UNRATE',
  NONFARM_PAYROLL: 'PAYEMS',
  FED_FUNDS_RATE: 'FEDFUNDS',
  US_2Y_YIELD: 'DGS2',
  US_10Y_YIELD: 'DGS10',
  DOLLAR_INDEX: 'DTWEXBGS',
  VIX: 'VIXCLS',
} as const

export type DefaultFredSeriesName = keyof typeof DEFAULT_FRED_SERIES

export const DEFAULT_MARKET_INDICATOR_SYMBOLS = [
  'KOSPI',
  'KOSDAQ',
  'KR_BOND_2Y',
  'KR_BOND_3Y',
  'KR_BOND_5Y',
  'KR_BOND_10Y',
  'KR_BOND_20Y',
  'KR_BOND_30Y',
] as const

export const DART_REPORT_CODES = {
  FIRST_QUARTER: '11013',
  HALF_YEAR: '11012',
  THIRD_QUARTER: '11014',
  ANNUAL: '11011',
} as const
