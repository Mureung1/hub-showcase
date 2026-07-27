import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.schema'
import { MARKET_CACHE_TTL_MS, MARKET_PROVIDER_BASE_URLS } from '../constants/market.constants'
import { MarketExternalApiException, MarketProviderDisabledException } from '../lib/market.errors'
import {
  assertOpenDartSuccess,
  OpenDartBusinessError,
  parseDartCompanyCodeZip,
  type OpenDartRawResponse,
} from '../mappers/open-dart.mapper'
import { MarketCacheService } from '../services/market-cache.service'
import { MarketHttpService } from '../services/market-http.service'
import type { DartCompanyCode } from '../types/market.types'

interface DisclosureRequest {
  corpCode?: string
  from: string
  to: string
  type?: string
  limit: number
}

interface FinancialsRequest {
  corpCode: string
  year: string
  reportCode: string
}

@Injectable()
export class OpenDartProvider {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly httpService: MarketHttpService,
    private readonly cacheService: MarketCacheService,
  ) {}

  async getDisclosures(request: DisclosureRequest): Promise<Record<string, unknown>[]> {
    this.assertEnabled()

    const response = await this.requestOpenDartJson({
      url: `${MARKET_PROVIDER_BASE_URLS.OPENDART}/list.json`,
      query: {
        corp_code: request.corpCode,
        bgn_de: request.from,
        end_de: request.to,
        pblntf_ty: request.type === 'MAJOR' ? 'B' : undefined,
        page_no: 1,
        page_count: request.limit,
        sort: 'date',
        sort_mth: 'desc',
      },
    })

    const list = response.list
    return Array.isArray(list) ? list.filter(isRecord) : []
  }

  async getCompany(corpCode: string): Promise<OpenDartRawResponse> {
    this.assertEnabled()

    return this.requestOpenDartJson({
      url: `${MARKET_PROVIDER_BASE_URLS.OPENDART}/company.json`,
      query: { corp_code: corpCode },
    })
  }

  async getFinancials(request: FinancialsRequest): Promise<Record<string, unknown>[]> {
    this.assertEnabled()

    const response = await this.requestOpenDartJson({
      url: `${MARKET_PROVIDER_BASE_URLS.OPENDART}/fnlttSinglAcnt.json`,
      query: {
        corp_code: request.corpCode,
        bsns_year: request.year,
        reprt_code: request.reportCode,
      },
    })

    const list = response.list
    return Array.isArray(list) ? list.filter(isRecord) : []
  }

  async findCompanyBySymbol(symbol: string): Promise<DartCompanyCode | undefined> {
    const companies = await this.getCompanyCodes()
    return companies.find((company) => company.stockCode === symbol)
  }

  async getCompanyCodes(): Promise<DartCompanyCode[]> {
    this.assertEnabled()

    const cached = await this.cacheService.getOrSet(
      'OPENDART:corp-codes',
      MARKET_CACHE_TTL_MS.DART_COMPANY_CODES,
      async () => {
        const arrayBuffer = await this.httpService.requestArrayBuffer({
          provider: 'OPENDART',
          url: `${MARKET_PROVIDER_BASE_URLS.OPENDART}/corpCode.xml`,
          query: { crtfc_key: this.configService.get('OPEN_DART_API_KEY', { infer: true }) },
          timeoutMs: 20000,
        })

        return parseDartCompanyCodeZip(arrayBuffer)
      },
    )

    return cached.value
  }

  isEnabled(): boolean {
    return Boolean(this.configService.get('OPEN_DART_API_KEY', { infer: true }))
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new MarketProviderDisabledException('OPENDART', ['OPEN_DART_API_KEY'])
    }
  }

  private async requestOpenDartJson(options: {
    url: string
    query?: Record<string, string | number | undefined>
  }): Promise<OpenDartRawResponse> {
    try {
      const response = await this.httpService.requestJson<OpenDartRawResponse>({
        provider: 'OPENDART',
        url: options.url,
        query: {
          crtfc_key: this.configService.get('OPEN_DART_API_KEY', { infer: true }),
          ...options.query,
        },
      })

      assertOpenDartSuccess(response)
      return response
    } catch (error) {
      if (error instanceof OpenDartBusinessError) {
        throw new MarketExternalApiException(
          'OPENDART',
          error.status === '020' ? 429 : 400,
          error.message,
          `OPENDART_${error.status}`,
        )
      }

      throw error
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
