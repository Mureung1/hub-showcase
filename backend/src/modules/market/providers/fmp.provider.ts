import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.schema'
import { MARKET_PROVIDER_BASE_URLS } from '../constants/market.constants'
import { MarketProviderDisabledException } from '../lib/market.errors'
import { MarketHttpService } from '../services/market-http.service'

@Injectable()
export class FmpProvider {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly httpService: MarketHttpService,
  ) {}

  async getEconomicCalendar(from: string, to: string): Promise<Record<string, unknown>[]> {
    this.assertEnabled()

    const response = await this.httpService.requestJson<unknown>({
      provider: 'FMP',
      url: `${MARKET_PROVIDER_BASE_URLS.FMP}/economic-calendar`,
      query: {
        apikey: this.configService.get('FMP_API_KEY', { infer: true }),
        from,
        to,
      },
    })

    return Array.isArray(response) ? response.filter(isRecord) : []
  }

  isEnabled(): boolean {
    return Boolean(this.configService.get('FMP_API_KEY', { infer: true }))
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new MarketProviderDisabledException('FMP', ['FMP_API_KEY'])
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
