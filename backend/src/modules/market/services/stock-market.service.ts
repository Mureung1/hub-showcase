import { Injectable } from '@nestjs/common'
import { MARKET_CACHE_TTL_MS } from '../constants/market.constants'
import type {
  StockAnalysisQueryDto,
  StockCandlesQueryDto,
  StockTradesQueryDto,
  TradingCalendarQueryDto,
} from '../dto/stock-query.dto'
import { createApiResponse } from '../lib/market-response'
import { calculateStockAnalysis } from '../mappers/technical-analysis.mapper'
import {
  extractTossResultArray,
  extractTossResultRecord,
  mapTossCandles,
  mapTossQuote,
  type TossRecord,
} from '../mappers/toss-securities.mapper'
import { TossSecuritiesProvider } from '../providers/toss-securities.provider'
import type {
  ApiResponse,
  StockAnalysisMetrics,
  StockCandle,
  StockQuote,
} from '../types/market.types'
import { MarketCacheService } from './market-cache.service'

@Injectable()
export class StockMarketService {
  constructor(
    private readonly tossSecuritiesProvider: TossSecuritiesProvider,
    private readonly cacheService: MarketCacheService,
  ) {}

  async getStockInfo(symbol: string): Promise<ApiResponse<TossRecord | undefined>> {
    const cacheKey = `TOSS_SECURITIES:stock-info:${symbol}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.STOCK_INFO,
      async () => {
        const response = await this.tossSecuritiesProvider.getStocks([symbol])
        return extractTossResultArray(response).at(0)
      },
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getQuote(symbol: string): Promise<ApiResponse<StockQuote>> {
    const cacheKey = `TOSS_SECURITIES:quote:${symbol}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.STOCK_QUOTE,
      async () => {
        const [pricesResponse, stocksResponse, candlesResponse] = await Promise.all([
          this.tossSecuritiesProvider.getPrices([symbol]),
          this.tossSecuritiesProvider.getStocks([symbol]),
          this.getCandles(symbol, { interval: '1d', count: 2 }),
        ])
        const price = extractTossResultArray(pricesResponse).at(0) ?? {}
        const stock = extractTossResultArray(stocksResponse).at(0)

        return mapTossQuote(price, stock, candlesResponse.data)
      },
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getOrderbook(symbol: string): Promise<ApiResponse<TossRecord | undefined>> {
    const cacheKey = `TOSS_SECURITIES:orderbook:${symbol}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.STOCK_QUOTE,
      async () => extractTossResultRecord(await this.tossSecuritiesProvider.getOrderbook(symbol)),
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getTrades(symbol: string, query: StockTradesQueryDto): Promise<ApiResponse<TossRecord[]>> {
    const count = query.count ?? 50
    const cacheKey = `TOSS_SECURITIES:trades:${symbol}:${count}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.STOCK_QUOTE,
      async () =>
        extractTossResultArray(await this.tossSecuritiesProvider.getTrades(symbol, count)),
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getCandles(
    symbol: string,
    query: StockCandlesQueryDto,
  ): Promise<ApiResponse<StockCandle[]>> {
    const interval = query.interval ?? '1d'
    const count = query.count ?? 120
    const ttl =
      interval === '1m'
        ? MARKET_CACHE_TTL_MS.STOCK_CANDLES_1M
        : MARKET_CACHE_TTL_MS.STOCK_CANDLES_1D
    const cacheKey = `TOSS_SECURITIES:candles:${symbol}:${interval}:${count}:${query.before ?? ''}`
    const result = await this.cacheService.getOrSet(cacheKey, ttl, async () => {
      const response = await this.tossSecuritiesProvider.getCandles(
        symbol,
        interval,
        count,
        query.before,
      )
      const page = extractTossResultRecord(response)
      const candles = Array.isArray(page?.candles)
        ? (page.candles.filter(isRecord) as TossRecord[])
        : []

      return mapTossCandles(symbol, interval, candles)
    })

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getExchangeRate(): Promise<ApiResponse<TossRecord | undefined>> {
    const result = await this.cacheService.getOrSet(
      'TOSS_SECURITIES:exchange-rate',
      MARKET_CACHE_TTL_MS.STOCK_QUOTE,
      async () => extractTossResultRecord(await this.tossSecuritiesProvider.getExchangeRate()),
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getTradingCalendar(
    query: TradingCalendarQueryDto,
  ): Promise<ApiResponse<Record<string, TossRecord>>> {
    const cacheKey = `TOSS_SECURITIES:trading-calendar:${query.date ?? ''}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.TRADING_CALENDAR,
      async () => ({
        KR: await this.tossSecuritiesProvider.getMarketCalendar('KR', query.date),
        US: await this.tossSecuritiesProvider.getMarketCalendar('US', query.date),
      }),
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getIndices(): Promise<ApiResponse<TossRecord[]>> {
    const result = await this.cacheService.getOrSet(
      'TOSS_SECURITIES:indices',
      MARKET_CACHE_TTL_MS.STOCK_QUOTE,
      async () => extractTossResultArray(await this.tossSecuritiesProvider.getIndices()),
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }

  async getAnalysis(
    symbol: string,
    query: StockAnalysisQueryDto,
  ): Promise<ApiResponse<StockAnalysisMetrics>> {
    const period = query.period ?? '6m'
    const count = periodToCandleCount(period)
    const cacheKey = `TOSS_SECURITIES:analysis:${symbol}:${period}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.STOCK_CANDLES_1D,
      async () => {
        const candlesResponse = await this.getCandles(symbol, { interval: '1d', count })
        return calculateStockAnalysis(symbol, period, candlesResponse.data)
      },
    )

    return createApiResponse(result, 'TOSS_SECURITIES', true)
  }
}

function periodToCandleCount(period: string): number {
  if (period === '3m') return 80
  if (period === '1y') return 200
  return 140
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
