import { Injectable } from '@nestjs/common'
import {
  DEFAULT_FRED_SERIES,
  MARKET_CACHE_TTL_MS,
  type DefaultFredSeriesName,
} from '../constants/market.constants'
import type { MacroIndicatorsQueryDto, MacroSeriesQueryDto } from '../dto/macro-query.dto'
import { createApiResponse } from '../lib/market-response'
import { normalizeDateRange } from '../lib/market-validation'
import { mapFredMacroSeries } from '../mappers/fred.mapper'
import { FredProvider } from '../providers/fred.provider'
import type { ApiResponse, MacroSeries } from '../types/market.types'
import { MarketCacheService } from './market-cache.service'

@Injectable()
export class MacroDataService {
  constructor(
    private readonly fredProvider: FredProvider,
    private readonly cacheService: MarketCacheService,
  ) {}

  async getSeries(seriesId: string, query: MacroSeriesQueryDto): Promise<ApiResponse<MacroSeries>> {
    const range =
      query.from || query.to
        ? normalizeDateRange(query.from, query.to, { defaultDays: 365, maxDays: 3650 })
        : undefined
    const cacheKey = `FRED:series:${seriesId}:${range?.from ?? ''}:${range?.to ?? ''}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.FRED_SERIES,
      async () => {
        const raw = await this.fredProvider.getSeries(seriesId, range?.from, range?.to)
        return mapFredMacroSeries(seriesId, raw.metadata, raw.observations)
      },
    )

    return createApiResponse(result, 'FRED', true)
  }

  async getIndicators(query: MacroIndicatorsQueryDto): Promise<ApiResponse<MacroSeries[]>> {
    const names = parseIndicatorNames(query.names)
    const cacheKey = `FRED:indicators:${names.join(',')}:${query.from ?? ''}:${query.to ?? ''}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.FRED_SERIES,
      async () => {
        const series = await Promise.all(
          names.map(async (name) => {
            const response = await this.getSeries(DEFAULT_FRED_SERIES[name], query)
            return response.data
          }),
        )

        return series
      },
    )

    return createApiResponse(result, 'FRED', true)
  }
}

function parseIndicatorNames(names: string | undefined): DefaultFredSeriesName[] {
  const allowed = new Set(Object.keys(DEFAULT_FRED_SERIES) as DefaultFredSeriesName[])

  if (!names) return Object.keys(DEFAULT_FRED_SERIES) as DefaultFredSeriesName[]

  return names
    .split(',')
    .map((name) => name.trim())
    .filter((name): name is DefaultFredSeriesName => allowed.has(name as DefaultFredSeriesName))
}
