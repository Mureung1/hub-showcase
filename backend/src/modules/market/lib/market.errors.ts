import { HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common'
import type { MarketProvider } from '../types/market.types'

export class MarketProviderDisabledException extends ServiceUnavailableException {
  constructor(provider: MarketProvider, missingVariables: string[]) {
    super({
      code: 'PROVIDER_DISABLED',
      provider,
      missingVariables,
      message: `${provider} provider is disabled because required environment variables are missing.`,
    })
  }
}

export class MarketExternalApiException extends HttpException {
  constructor(
    provider: MarketProvider,
    statusCode: number,
    message: string,
    code = 'EXTERNAL_API_ERROR',
  ) {
    super(
      {
        code,
        provider,
        message,
      },
      mapExternalStatus(statusCode),
    )
  }
}

function mapExternalStatus(statusCode: number): HttpStatus {
  if (statusCode === 400 || statusCode === 404) return HttpStatus.BAD_GATEWAY
  if (statusCode === 401 || statusCode === 403) return HttpStatus.SERVICE_UNAVAILABLE
  if (statusCode === 429) return HttpStatus.TOO_MANY_REQUESTS
  if (statusCode >= 500) return HttpStatus.BAD_GATEWAY

  return HttpStatus.BAD_GATEWAY
}
