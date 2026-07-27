import type { ApiResponse, CachedResult, MarketProvider } from '../types/market.types'

export function createApiResponse<T>(
  result: CachedResult<T>,
  provider: MarketProvider,
  isDelayed?: boolean,
): ApiResponse<T> {
  return {
    data: result.value,
    meta: {
      provider,
      updatedAt: result.updatedAt,
      cached: result.cached,
      isDelayed,
    },
  }
}

export function createCombinedApiResponse<T>(
  result: CachedResult<T>,
  providers: MarketProvider[],
  isDelayed?: boolean,
): ApiResponse<T> {
  return {
    data: result.value,
    meta: {
      providers,
      updatedAt: result.updatedAt,
      cached: result.cached,
      isDelayed,
    },
  }
}
