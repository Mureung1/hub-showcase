import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.schema'
import { MARKET_PROVIDER_BASE_URLS } from '../constants/market.constants'
import { MarketProviderDisabledException } from '../lib/market.errors'
import { naverNewsResponseSchema, type NaverNewsRawItem } from '../mappers/naver-news.mapper'
import { MarketHttpService } from '../services/market-http.service'

@Injectable()
export class NaverNewsProvider {
  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly httpService: MarketHttpService,
  ) {}

  async searchNews(query: string, limit: number): Promise<NaverNewsRawItem[]> {
    this.assertEnabled()

    const mode = this.configService.get('NAVER_API_MODE', { infer: true })
    const url =
      mode === 'API_HUB'
        ? MARKET_PROVIDER_BASE_URLS.NAVER_API_HUB
        : MARKET_PROVIDER_BASE_URLS.NAVER_DEVELOPERS

    const response = await this.httpService.requestJson<unknown>({
      provider: 'NAVER',
      url,
      headers: this.createHeaders(mode),
      query: {
        query,
        display: Math.min(limit, 100),
        start: 1,
        sort: 'date',
        format: mode === 'API_HUB' ? 'json' : undefined,
      },
    })

    return naverNewsResponseSchema.parse(response).items
  }

  isEnabled(): boolean {
    const mode = this.configService.get('NAVER_API_MODE', { infer: true })

    if (mode === 'API_HUB') {
      return (
        Boolean(this.configService.get('NAVER_CLIENT_ID', { infer: true })) &&
        Boolean(this.configService.get('NAVER_API_HUB_KEY', { infer: true }))
      )
    }

    return (
      Boolean(this.configService.get('NAVER_CLIENT_ID', { infer: true })) &&
      Boolean(this.configService.get('NAVER_CLIENT_SECRET', { infer: true }))
    )
  }

  private assertEnabled(): void {
    if (this.isEnabled()) return

    const mode = this.configService.get('NAVER_API_MODE', { infer: true })
    const missingVariables =
      mode === 'API_HUB'
        ? ['NAVER_CLIENT_ID', 'NAVER_API_HUB_KEY']
        : ['NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET']

    throw new MarketProviderDisabledException('NAVER', missingVariables)
  }

  private createHeaders(mode: 'DEVELOPERS' | 'API_HUB'): Record<string, string> {
    const clientId = this.configService.get('NAVER_CLIENT_ID', { infer: true }) ?? ''

    if (mode === 'API_HUB') {
      return {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': this.configService.get('NAVER_API_HUB_KEY', { infer: true }) ?? '',
      }
    }

    return {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': this.configService.get('NAVER_CLIENT_SECRET', { infer: true }) ?? '',
    }
  }
}
