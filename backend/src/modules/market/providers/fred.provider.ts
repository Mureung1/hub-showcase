import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.schema'
import { MARKET_PROVIDER_BASE_URLS } from '../constants/market.constants'
import { MarketProviderDisabledException } from '../lib/market.errors'
import type { FredObservationRaw, FredSeriesMetadataRaw } from '../mappers/fred.mapper'
import { MarketHttpService } from '../services/market-http.service'

export interface FredSeriesRawResult {
  metadata?: FredSeriesMetadataRaw
  observations: FredObservationRaw[]
}

@Injectable()
export class FredProvider {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly httpService: MarketHttpService,
  ) {}

  async getSeries(seriesId: string, from?: string, to?: string): Promise<FredSeriesRawResult> {
    this.assertEnabled()

    const [metadataResponse, observationsResponse] = await Promise.all([
      this.httpService.requestJson<Record<string, unknown>>({
        provider: 'FRED',
        url: `${MARKET_PROVIDER_BASE_URLS.FRED}/series`,
        query: this.createQuery({ series_id: seriesId }),
      }),
      this.httpService.requestJson<Record<string, unknown>>({
        provider: 'FRED',
        url: `${MARKET_PROVIDER_BASE_URLS.FRED}/series/observations`,
        query: this.createQuery({
          series_id: seriesId,
          observation_start: from,
          observation_end: to,
          sort_order: 'asc',
        }),
      }),
    ])

    const seriess = metadataResponse.seriess
    const observations = observationsResponse.observations

    return {
      metadata: Array.isArray(seriess) ? seriess.find(isRecord) : undefined,
      observations: Array.isArray(observations) ? observations.filter(isRecord) : [],
    }
  }

  isEnabled(): boolean {
    return Boolean(this.configService.get('FRED_API_KEY', { infer: true }))
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new MarketProviderDisabledException('FRED', ['FRED_API_KEY'])
    }
  }

  private createQuery(
    query: Record<string, string | undefined>,
  ): Record<string, string | undefined> {
    return {
      ...query,
      api_key: this.configService.get('FRED_API_KEY', { infer: true }),
      file_type: 'json',
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
