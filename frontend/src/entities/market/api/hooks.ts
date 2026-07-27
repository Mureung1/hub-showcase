import { useQuery } from '@tanstack/react-query'

import {
  fetchDisclosures,
  fetchEconomicCalendar,
  fetchMacroIndicators,
  fetchMarketCalendar,
  fetchMarketNews,
  fetchStockAnalysis,
  fetchStockCandles,
  fetchStockQuote,
  type DisclosureParams,
  type EconomicCalendarParams,
  type MacroIndicatorsParams,
  type MarketCalendarParams,
  type MarketNewsParams,
  type StockAnalysisParams,
  type StockCandlesParams,
} from './marketApi'
import { marketQueryKeys } from './_keys'

export function useMarketNews(params: MarketNewsParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.news(params),
    queryFn: () => fetchMarketNews(params),
    retry: 1,
  })
}

export function useEconomicCalendar(params: EconomicCalendarParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.economicCalendar(params),
    queryFn: () => fetchEconomicCalendar(params),
    retry: 1,
  })
}

export function useMarketCalendar(params: MarketCalendarParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.marketCalendar(params),
    queryFn: () => fetchMarketCalendar(params),
    retry: 1,
  })
}

export function useDisclosures(params: DisclosureParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.disclosures(params),
    queryFn: () => fetchDisclosures(params),
    retry: 1,
  })
}

export function useMacroIndicators(params: MacroIndicatorsParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.macroIndicators(params),
    queryFn: () => fetchMacroIndicators(params),
    retry: 1,
  })
}

export function useStockQuote(symbol: string) {
  return useQuery({
    queryKey: marketQueryKeys.stockQuote(symbol),
    queryFn: () => fetchStockQuote(symbol),
    enabled: Boolean(symbol),
    retry: 1,
  })
}

export function useStockCandles(symbol: string, params: StockCandlesParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.stockCandles(symbol, params),
    queryFn: () => fetchStockCandles(symbol, params),
    enabled: Boolean(symbol),
    retry: 1,
  })
}

export function useStockAnalysis(symbol: string, params: StockAnalysisParams = {}) {
  return useQuery({
    queryKey: marketQueryKeys.stockAnalysis(symbol, params),
    queryFn: () => fetchStockAnalysis(symbol, params),
    enabled: Boolean(symbol),
    retry: 1,
  })
}
