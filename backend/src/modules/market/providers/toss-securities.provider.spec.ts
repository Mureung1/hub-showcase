import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env.schema'
import { MarketHttpService } from '../services/market-http.service'
import { TossSecuritiesProvider } from './toss-securities.provider'

describe('TossSecuritiesProvider', () => {
  it('caches OAuth tokens and avoids duplicate token issuance for concurrent requests', async () => {
    const configService = {
      get: jest.fn((key: keyof Env) => {
        const values: Partial<Env> = {
          TOSS_INVEST_CLIENT_ID: 'client-id',
          TOSS_INVEST_CLIENT_SECRET: 'client-secret',
        }

        return values[key]
      }),
    } as unknown as ConfigService<Env, true>
    const requestedOptions: Array<{ url: string }> = []
    const requestJson = jest.fn((options: { url: string }) => {
      requestedOptions.push(options)

      if (options.url.endsWith('/oauth2/token')) {
        return Promise.resolve({ access_token: 'token', expires_in: 3600 })
      }

      return Promise.resolve({ result: [] })
    })
    const httpService = { requestJson } as unknown as MarketHttpService
    const provider = new TossSecuritiesProvider(configService, httpService)

    await Promise.all([provider.getPrices(['005930']), provider.getStocks(['005930'])])
    await provider.getPrices(['005930'])

    const tokenCalls = requestedOptions.filter((options) => options.url.endsWith('/oauth2/token'))
    expect(tokenCalls).toHaveLength(1)
  })
})
