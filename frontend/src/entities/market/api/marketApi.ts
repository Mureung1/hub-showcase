import { requestApi, type ApiResponse } from '@/shared/api/httpClient'

import type {
  EconomicCalendarEvent,
  MarketCalendarEvent,
  ServerMarketNewsItem,
  StockAnalysisMetrics,
  StockCandle,
  StockQuote,
} from '../model/types'

export interface MarketNewsParams {
  category?: string
  query?: string
  symbol?: string
  limit?: number
}

export interface DateRangeParams {
  from?: string
  to?: string
}

export interface EconomicCalendarParams extends DateRangeParams {
  country?: string
  importance?: string
}

export interface MarketCalendarParams extends EconomicCalendarParams {
  types?: string
}

export interface DisclosureParams extends DateRangeParams {
  symbol?: string
  type?: string
  limit?: number
}

export interface MacroIndicatorsParams extends DateRangeParams {
  names?: string
}

export interface StockCandlesParams {
  interval?: string
  count?: number
  before?: string
}

export interface StockAnalysisParams {
  period?: string
}

export function fetchMarketNews(params: MarketNewsParams = {}) {
  return requestApi<ApiResponse<ServerMarketNewsItem[]>>('/api/market/news', toQuery(params))
}

export function fetchEconomicCalendar(params: EconomicCalendarParams = {}) {
  return requestApi<ApiResponse<EconomicCalendarEvent[]>>('/api/market/calendar/economic', toQuery(params))
}

export function fetchMarketCalendar(params: MarketCalendarParams = {}) {
  return requestApi<ApiResponse<MarketCalendarEvent[]>>('/api/market/calendar', toQuery(params))
}

export function fetchDisclosures(params: DisclosureParams = {}) {
  return requestApi<ApiResponse<unknown[]>>('/api/market/disclosures', toQuery(params))
}

export function fetchMacroIndicators(params: MacroIndicatorsParams = {}) {
  return requestApi<ApiResponse<unknown[]>>('/api/market/macro/indicators', toQuery(params))
}

export function fetchStockQuote(symbol: string) {
  return requestApi<ApiResponse<StockQuote>>(`/api/market/stocks/${symbol}/quote`)
}

export function fetchStockCandles(symbol: string, params: StockCandlesParams = {}) {
  return requestApi<ApiResponse<StockCandle[]>>(`/api/market/stocks/${symbol}/candles`, toQuery(params))
}

export function fetchStockAnalysis(symbol: string, params: StockAnalysisParams = {}) {
  return requestApi<ApiResponse<StockAnalysisMetrics>>(`/api/market/stocks/${symbol}/analysis`, toQuery(params))
}

function toQuery(params: object): Record<string, string | number | undefined> {
  return { ...params } as Record<string, string | number | undefined>
}
