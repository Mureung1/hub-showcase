import { Injectable } from '@nestjs/common'
import { MARKET_CACHE_TTL_MS } from '../constants/market.constants'
import type {
  EconomicCalendarQueryDto,
  MarketCalendarQueryDto,
} from '../dto/market-calendar-query.dto'
import { normalizeDateRange } from '../lib/market-validation'
import { mapFmpEconomicCalendarEvent } from '../mappers/fmp.mapper'
import { mapTossMarketCalendarEvents } from '../mappers/toss-securities.mapper'
import { FmpProvider } from '../providers/fmp.provider'
import { TossSecuritiesProvider } from '../providers/toss-securities.provider'
import type {
  ApiResponse,
  EconomicCalendarEvent,
  MarketCalendarEvent,
  MarketCalendarEventType,
  MarketProvider,
} from '../types/market.types'
import { MarketCacheService } from './market-cache.service'
import { MarketDisclosureService } from './market-disclosure.service'

@Injectable()
export class MarketCalendarService {
  constructor(
    private readonly fmpProvider: FmpProvider,
    private readonly tossSecuritiesProvider: TossSecuritiesProvider,
    private readonly marketDisclosureService: MarketDisclosureService,
    private readonly cacheService: MarketCacheService,
  ) {}

  async getEconomicCalendar(
    query: EconomicCalendarQueryDto,
  ): Promise<ApiResponse<EconomicCalendarEvent[]>> {
    const range = normalizeDateRange(query.from, query.to, { defaultDays: 7, maxDays: 45 })
    const cacheKey = `FMP:economic-calendar:${range.from}:${range.to}:${query.country ?? ''}:${query.importance ?? ''}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.ECONOMIC_CALENDAR,
      async () => {
        const rawItems = await this.fmpProvider.getEconomicCalendar(range.from, range.to)

        return rawItems
          .map(mapFmpEconomicCalendarEvent)
          .filter((event) =>
            query.country ? event.country.toUpperCase() === query.country?.toUpperCase() : true,
          )
          .filter((event) => (query.importance ? event.importance === query.importance : true))
          .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
      },
    )

    return {
      data: result.value,
      meta: {
        provider: 'FMP',
        updatedAt: result.updatedAt,
        cached: result.cached,
        isDelayed: true,
      },
    }
  }

  async getMarketCalendar(
    query: MarketCalendarQueryDto,
  ): Promise<ApiResponse<MarketCalendarEvent[]>> {
    const range = normalizeDateRange(query.from, query.to, { defaultDays: 7, maxDays: 45 })
    const types = parseCalendarTypes(query.types)
    const cacheKey = `MARKET:calendar:${range.from}:${range.to}:${query.types ?? ''}:${query.importance ?? ''}`
    const loadedProviders: MarketProvider[] = []
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.ECONOMIC_CALENDAR,
      async () => {
        const settled = await Promise.allSettled([
          this.loadEconomicEvents(query, loadedProviders),
          this.loadDisclosureEvents(range.from, range.to, loadedProviders),
          this.loadTradingEvents(range.from, loadedProviders),
        ])
        const fulfilled = settled
          .filter(
            (item): item is PromiseFulfilledResult<MarketCalendarEvent[]> =>
              item.status === 'fulfilled',
          )
          .flatMap((item) => item.value)

        if (fulfilled.length === 0) {
          const rejected = settled.find(
            (item): item is PromiseRejectedResult => item.status === 'rejected',
          )
          if (rejected) throw rejected.reason
        }

        return fulfilled
          .filter((event) => (types.length > 0 ? types.includes(event.type) : true))
          .filter((event) => (query.importance ? event.importance === query.importance : true))
          .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
      },
    )

    return {
      data: result.value,
      meta: {
        providers:
          loadedProviders.length > 0
            ? [...new Set(loadedProviders)]
            : ['FMP', 'OPENDART', 'TOSS_SECURITIES'],
        updatedAt: result.updatedAt,
        cached: result.cached,
        isDelayed: true,
      },
    }
  }

  private async loadEconomicEvents(
    query: MarketCalendarQueryDto,
    loadedProviders: MarketProvider[],
  ): Promise<MarketCalendarEvent[]> {
    const response = await this.getEconomicCalendar(query)
    loadedProviders.push('FMP')

    return response.data.map((event) => ({
      id: `FMP:${event.id}`,
      type: 'ECONOMIC',
      title: event.title,
      country: event.country,
      scheduledAt: event.scheduledAt,
      importance: event.importance,
      previous: event.previous,
      consensus: event.consensus,
      actual: event.actual,
      provider: 'FMP',
    }))
  }

  private async loadDisclosureEvents(
    from: string,
    to: string,
    loadedProviders: MarketProvider[],
  ): Promise<MarketCalendarEvent[]> {
    const response = await this.marketDisclosureService.getDisclosures({ from, to, limit: 50 })
    loadedProviders.push('OPENDART')

    return response.data.map((disclosure) => ({
      id: `OPENDART:${disclosure.id}`,
      type: 'DISCLOSURE',
      title: disclosure.reportName,
      symbol: disclosure.stockCode,
      scheduledAt: disclosure.submittedAt,
      provider: 'OPENDART',
    }))
  }

  private async loadTradingEvents(
    date: string,
    loadedProviders: MarketProvider[],
  ): Promise<MarketCalendarEvent[]> {
    const [krCalendar, usCalendar] = await Promise.all([
      this.tossSecuritiesProvider.getMarketCalendar('KR', date),
      this.tossSecuritiesProvider.getMarketCalendar('US', date),
    ])
    loadedProviders.push('TOSS_SECURITIES')

    return [
      ...mapTossMarketCalendarEvents('KR', krCalendar),
      ...mapTossMarketCalendarEvents('US', usCalendar),
    ]
  }
}

function parseCalendarTypes(types: string | undefined): MarketCalendarEventType[] {
  if (!types) return []

  const allowed = new Set<MarketCalendarEventType>([
    'ECONOMIC',
    'DISCLOSURE',
    'MARKET_OPEN',
    'MARKET_CLOSE',
    'MARKET_HOLIDAY',
    'EARLY_CLOSE',
  ])

  return types
    .split(',')
    .map((type) => type.trim())
    .filter((type): type is MarketCalendarEventType => allowed.has(type as MarketCalendarEventType))
}
