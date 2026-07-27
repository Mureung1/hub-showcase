import { BadRequestException, Injectable } from '@nestjs/common'
import { DART_REPORT_CODES, MARKET_CACHE_TTL_MS } from '../constants/market.constants'
import type {
  CompanyFinancialsQueryDto,
  MarketDisclosureQueryDto,
} from '../dto/market-disclosure-query.dto'
import { createApiResponse } from '../lib/market-response'
import { normalizeDateRange, toDartDate } from '../lib/market-validation'
import { mapOpenDartDisclosure } from '../mappers/open-dart.mapper'
import { OpenDartProvider } from '../providers/open-dart.provider'
import type { ApiResponse, CorporateDisclosure } from '../types/market.types'
import { MarketCacheService } from './market-cache.service'

@Injectable()
export class MarketDisclosureService {
  constructor(
    private readonly openDartProvider: OpenDartProvider,
    private readonly cacheService: MarketCacheService,
  ) {}

  async getDisclosures(
    query: MarketDisclosureQueryDto,
  ): Promise<ApiResponse<CorporateDisclosure[]>> {
    const range = normalizeDateRange(query.from, query.to, { defaultDays: 0, maxDays: 90 })
    const corpCode = query.symbol ? await this.resolveCorpCode(query.symbol) : undefined
    const limit = query.limit ?? 30
    const cacheKey = `OPENDART:disclosures:${corpCode ?? ''}:${range.from}:${range.to}:${query.type ?? ''}:${limit}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.DISCLOSURES,
      async () => {
        const rawItems = await this.openDartProvider.getDisclosures({
          corpCode,
          from: toDartDate(range.from),
          to: toDartDate(range.to),
          type: query.type,
          limit,
        })

        return rawItems.map(mapOpenDartDisclosure)
      },
    )

    return createApiResponse(result, 'OPENDART', true)
  }

  async getCompany(symbol: string): Promise<ApiResponse<Record<string, unknown>>> {
    const company = await this.openDartProvider.findCompanyBySymbol(symbol)

    if (!company) {
      throw new BadRequestException({
        code: 'UNKNOWN_DART_SYMBOL',
        message: `No OpenDART corp code for ${symbol}.`,
      })
    }

    const cacheKey = `OPENDART:company:${company.corpCode}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.STOCK_INFO,
      async () => this.openDartProvider.getCompany(company.corpCode),
    )

    return createApiResponse(result, 'OPENDART', true)
  }

  async getFinancials(
    symbol: string,
    query: CompanyFinancialsQueryDto,
  ): Promise<ApiResponse<Record<string, unknown>[]>> {
    const company = await this.openDartProvider.findCompanyBySymbol(symbol)

    if (!company) {
      throw new BadRequestException({
        code: 'UNKNOWN_DART_SYMBOL',
        message: `No OpenDART corp code for ${symbol}.`,
      })
    }

    const year = query.year ?? String(new Date().getUTCFullYear() - 1)
    const reportCode = query.reportCode ?? DART_REPORT_CODES.ANNUAL
    const cacheKey = `OPENDART:financials:${company.corpCode}:${year}:${reportCode}`
    const result = await this.cacheService.getOrSet(
      cacheKey,
      MARKET_CACHE_TTL_MS.DISCLOSURES,
      async () =>
        this.openDartProvider.getFinancials({ corpCode: company.corpCode, year, reportCode }),
    )

    return createApiResponse(result, 'OPENDART', true)
  }

  private async resolveCorpCode(symbol: string): Promise<string | undefined> {
    const company = await this.openDartProvider.findCompanyBySymbol(symbol)

    if (!company) {
      throw new BadRequestException({
        code: 'UNKNOWN_DART_SYMBOL',
        message: `No OpenDART corp code for ${symbol}.`,
      })
    }

    return company.corpCode
  }
}
