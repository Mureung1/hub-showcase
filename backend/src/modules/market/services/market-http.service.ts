import { Injectable, Logger } from '@nestjs/common'
import { MarketExternalApiException } from '../lib/market.errors'
import type { MarketProvider } from '../types/market.types'

type HttpMethod = 'GET' | 'POST'
type QueryValue = string | number | boolean | null | undefined

interface MarketHttpRequestOptions {
  provider: MarketProvider
  url: string
  method?: HttpMethod
  headers?: Record<string, string>
  query?: Record<string, QueryValue>
  body?: BodyInit
  timeoutMs?: number
  retries?: number
}

@Injectable()
export class MarketHttpService {
  private readonly logger = new Logger(MarketHttpService.name)

  async requestJson<T>(options: MarketHttpRequestOptions): Promise<T> {
    const response = await this.request(options)

    try {
      return (await response.json()) as T
    } catch {
      throw new MarketExternalApiException(
        options.provider,
        response.status,
        'External API returned invalid JSON.',
      )
    }
  }

  async requestArrayBuffer(options: MarketHttpRequestOptions): Promise<ArrayBuffer> {
    const response = await this.request(options)
    return response.arrayBuffer()
  }

  private async request(options: MarketHttpRequestOptions): Promise<Response> {
    const url = this.buildUrl(options.url, options.query)
    const retries = options.retries ?? 2
    const timeoutMs = options.timeoutMs ?? 8000
    const method = options.method ?? 'GET'

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)

      try {
        this.logger.debug(`${options.provider} ${method} ${url.origin}${url.pathname}`)
        const response = await fetch(url, {
          method,
          headers: options.headers,
          body: options.body,
          signal: controller.signal,
        })

        if (response.ok) {
          return response
        }

        if (response.status < 500 || attempt === retries) {
          const message = await this.readErrorBody(response)
          throw new MarketExternalApiException(options.provider, response.status, message)
        }
      } catch (error) {
        if (error instanceof MarketExternalApiException) {
          throw error
        }

        if (attempt === retries) {
          throw new MarketExternalApiException(
            options.provider,
            503,
            'External API network request failed.',
          )
        }
      } finally {
        clearTimeout(timeout)
      }
    }

    throw new MarketExternalApiException(options.provider, 503, 'External API request failed.')
  }

  private buildUrl(url: string, query?: Record<string, QueryValue>): URL {
    const nextUrl = new URL(url)

    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === '') continue
      nextUrl.searchParams.set(key, String(value))
    }

    return nextUrl
  }

  private async readErrorBody(response: Response): Promise<string> {
    try {
      const body = (await response.text()).slice(0, 500)
      return body || `External API failed with HTTP ${response.status}.`
    } catch {
      return `External API failed with HTTP ${response.status}.`
    }
  }
}
