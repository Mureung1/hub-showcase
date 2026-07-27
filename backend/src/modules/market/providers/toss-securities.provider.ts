import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.schema'
import {
  DEFAULT_MARKET_INDICATOR_SYMBOLS,
  MARKET_PROVIDER_BASE_URLS,
} from '../constants/market.constants'
import { MarketProviderDisabledException } from '../lib/market.errors'
import { MarketHttpService } from '../services/market-http.service'

export type TossApiResponse = Record<string, unknown>

interface TossOAuthResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
}

@Injectable()
export class TossSecuritiesProvider {
  private accessToken?: string
  private tokenExpiresAt = 0
  private tokenPromise?: Promise<string>

  constructor(
    private readonly configService: ConfigService<Env, true>,
    private readonly httpService: MarketHttpService,
  ) {}

  async getStocks(symbols: string[]): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/stocks', { symbols: symbols.join(',') })
  }

  async getPrices(symbols: string[]): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/prices', { symbols: symbols.join(',') })
  }

  async getOrderbook(symbol: string): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/orderbook', { symbol })
  }

  async getTrades(symbol: string, count = 50): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/trades', { symbol, count })
  }

  async getCandles(
    symbol: string,
    interval: string,
    count: number,
    before?: string,
  ): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/candles', {
      symbol,
      interval,
      count,
      before,
      adjusted: true,
    })
  }

  async getExchangeRate(): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/exchange-rate')
  }

  async getMarketCalendar(country: 'KR' | 'US', date?: string): Promise<TossApiResponse> {
    return this.requestAuthed(`/api/v1/market-calendar/${country}`, { date })
  }

  async getIndices(
    symbols: readonly string[] = DEFAULT_MARKET_INDICATOR_SYMBOLS,
  ): Promise<TossApiResponse> {
    return this.requestAuthed('/api/v1/market-indicators/prices', { symbols: symbols.join(',') })
  }

  isEnabled(): boolean {
    return (
      Boolean(this.configService.get('TOSS_INVEST_CLIENT_ID', { infer: true })) &&
      Boolean(this.configService.get('TOSS_INVEST_CLIENT_SECRET', { infer: true }))
    )
  }

  private async requestAuthed(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): Promise<TossApiResponse> {
    this.assertEnabled()

    const token = await this.getAccessToken()

    return this.httpService.requestJson<TossApiResponse>({
      provider: 'TOSS_SECURITIES',
      url: `${MARKET_PROVIDER_BASE_URLS.TOSS_SECURITIES}${path}`,
      headers: { Authorization: `Bearer ${token}` },
      query,
    })
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now()

    if (this.accessToken && this.tokenExpiresAt - 60_000 > now) {
      return this.accessToken
    }

    if (this.tokenPromise) return this.tokenPromise

    this.tokenPromise = this.issueAccessToken()

    try {
      return await this.tokenPromise
    } finally {
      this.tokenPromise = undefined
    }
  }

  private async issueAccessToken(): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.configService.get('TOSS_INVEST_CLIENT_ID', { infer: true }) ?? '',
      client_secret: this.configService.get('TOSS_INVEST_CLIENT_SECRET', { infer: true }) ?? '',
    })

    const response = await this.httpService.requestJson<TossOAuthResponse>({
      provider: 'TOSS_SECURITIES',
      url: `${MARKET_PROVIDER_BASE_URLS.TOSS_SECURITIES}/oauth2/token`,
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      retries: 0,
    })

    if (!response.access_token || !response.expires_in) {
      throw new Error('Toss Securities OAuth token response is invalid.')
    }

    this.accessToken = response.access_token
    this.tokenExpiresAt = Date.now() + response.expires_in * 1000

    return response.access_token
  }

  private assertEnabled(): void {
    if (!this.isEnabled()) {
      throw new MarketProviderDisabledException('TOSS_SECURITIES', [
        'TOSS_INVEST_CLIENT_ID',
        'TOSS_INVEST_CLIENT_SECRET',
      ])
    }
  }
}
