import {
  fetchDisclosuresData,
  fetchEconomicCalendarData,
  fetchMacroIndicatorsData,
  fetchMarketCalendarData,
  fetchMarketNewsData,
  fetchStockAnalysisData,
  fetchStockCandlesData,
  fetchStockQuoteData,
} from './marketDataApi'

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
  return fetchMarketNewsData(params)
}

export function fetchEconomicCalendar(params: EconomicCalendarParams = {}) {
  return fetchEconomicCalendarData(params)
}

export function fetchMarketCalendar(params: MarketCalendarParams = {}) {
  return fetchMarketCalendarData(params)
}

export function fetchDisclosures(params: DisclosureParams = {}) {
  void params
  return fetchDisclosuresData()
}

export function fetchMacroIndicators(params: MacroIndicatorsParams = {}) {
  return fetchMacroIndicatorsData(params)
}

export function fetchStockQuote(symbol: string) {
  return fetchStockQuoteData(symbol)
}

export function fetchStockCandles(symbol: string, params: StockCandlesParams = {}) {
  return fetchStockCandlesData(symbol, params)
}

export function fetchStockAnalysis(symbol: string, params: StockAnalysisParams = {}) {
  return fetchStockAnalysisData(symbol, params)
}
