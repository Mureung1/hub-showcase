import { Injectable } from '@nestjs/common'
import {
  DEFAULT_NEWS_QUERIES,
  MARKET_CACHE_TTL_MS,
  MARKET_NEWS_CATEGORIES,
} from '../constants/market.constants'
import type { MarketNewsQueryDto } from '../dto/market-news-query.dto'
import { createApiResponse } from '../lib/market-response'
import { dedupeMarketNews, mapNaverNewsItem } from '../mappers/naver-news.mapper'
import { NaverNewsProvider } from '../providers/naver-news.provider'
import type { ApiResponse, MarketNewsCategory, MarketNewsItem } from '../types/market.types'
import { MarketCacheService } from './market-cache.service'

@Injectable()
export class MarketNewsService {
  constructor(
    private readonly naverNewsProvider: NaverNewsProvider,
    private readonly cacheService: MarketCacheService,
  ) {}

  async getNews(query: MarketNewsQueryDto): Promise<ApiResponse<MarketNewsItem[]>> {
    const limit = query.limit ?? 20
    const cacheKey = `NAVER:news:${query.category ?? 'ALL'}:${query.query ?? ''}:${query.symbol ?? ''}:${limit}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.NEWS,
      async () => {
        const items = await this.loadNews(query, limit)
        return dedupeMarketNews(items).slice(0, limit)
      },
    )

    return createApiResponse(result, 'NAVER', true)
  }

  private async loadNews(query: MarketNewsQueryDto, limit: number): Promise<MarketNewsItem[]> {
    const searchTargets = this.createSearchTargets(query)
    const perQueryLimit = Math.min(Math.max(limit, 10), 100)
    const results = await Promise.all(
      searchTargets.map(async (target) => {
        const rawItems = await this.naverNewsProvider.searchNews(target.query, perQueryLimit)
        return rawItems
          .map((item) =>
            mapNaverNewsItem(
              item,
              target.category,
              query.symbol ? [query.symbol] : extractSymbols(item.title),
            ),
          )
          .filter((item): item is MarketNewsItem => item !== null)
      }),
    )

    return results.flat().sort((left, right) => right.publishedAt.localeCompare(left.publishedAt))
  }

  private createSearchTargets(
    query: MarketNewsQueryDto,
  ): Array<{ category: MarketNewsCategory; query: string }> {
    if (query.query) {
      return [{ category: query.category ?? 'COMPANY', query: query.query }]
    }

    if (query.symbol) {
      return [{ category: query.category ?? 'COMPANY', query: `${query.symbol} 주식` }]
    }

    const categories = query.category ? [query.category] : MARKET_NEWS_CATEGORIES

    return categories.flatMap((category) =>
      DEFAULT_NEWS_QUERIES[category].map((searchQuery) => ({ category, query: searchQuery })),
    )
  }
}

function extractSymbols(value: string): string[] {
  return [...new Set(value.match(/\b\d{6}\b/g) ?? [])]
}
