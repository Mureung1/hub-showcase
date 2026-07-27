import type {
  MarketCalendarEvent,
  StockCandle,
  StockMarket,
  StockQuote,
} from '../types/market.types'

export type TossRecord = Record<string, unknown>

export function mapTossCandles(
  symbol: string,
  interval: string,
  candles: TossRecord[],
): StockCandle[] {
  return candles.map((candle) => ({
    symbol,
    interval,
    timestamp: getString(candle.timestamp) || new Date().toISOString(),
    open: toNumber(candle.openPrice),
    high: toNumber(candle.highPrice),
    low: toNumber(candle.lowPrice),
    close: toNumber(candle.closePrice),
    volume: toOptionalNumber(candle.volume),
    provider: 'TOSS_SECURITIES',
  }))
}

export function mapTossQuote(
  price: TossRecord,
  stock: TossRecord | undefined,
  candles: StockCandle[],
): StockQuote {
  const sortedCandles = [...candles].sort((left, right) =>
    left.timestamp.localeCompare(right.timestamp),
  )
  const latestCandle = sortedCandles.at(-1)
  const previousCandle = sortedCandles.at(-2)
  const currentPrice = toNumber(price.lastPrice)
  const previousClose = previousCandle?.close
  const change = previousClose === undefined ? 0 : currentPrice - previousClose

  return {
    symbol: getString(price.symbol),
    name: getString(stock?.name) || getString(price.symbol),
    market: mapTossMarket(getString(stock?.market)),
    currency: mapTossCurrency(getString(price.currency) || getString(stock?.currency)),
    price: currentPrice,
    change,
    changeRate: previousClose ? change / previousClose : 0,
    open: latestCandle?.open,
    high: latestCandle?.high,
    low: latestCandle?.low,
    previousClose,
    volume: latestCandle?.volume,
    tradingValue:
      latestCandle?.volume === undefined ? undefined : latestCandle.volume * currentPrice,
    timestamp: getString(price.timestamp) || latestCandle?.timestamp || new Date().toISOString(),
    provider: 'TOSS_SECURITIES',
  }
}

export function mapTossMarket(value: string): StockMarket {
  if (value === 'NASDAQ') return 'NASDAQ'
  if (value === 'NYSE') return 'NYSE'
  if (value === 'AMEX') return 'AMEX'
  return 'KRX'
}

export function mapTossCurrency(value: string): 'KRW' | 'USD' {
  return value === 'USD' ? 'USD' : 'KRW'
}

export function mapTossMarketCalendarEvents(
  country: 'KR' | 'US',
  response: TossRecord,
): MarketCalendarEvent[] {
  const result = getRecord(response.result) ?? response
  const days = [
    getRecord(result.today),
    getRecord(result.previousBusinessDay),
    getRecord(result.nextBusinessDay),
  ].filter((day): day is TossRecord => day !== undefined)

  return days.flatMap((day) => createMarketDayEvents(country, day))
}

function createMarketDayEvents(country: 'KR' | 'US', day: TossRecord): MarketCalendarEvent[] {
  const date = getString(day.date)
  const regularMarket =
    getRecord(day.regularMarket) ?? getRecord(getRecord(day.integrated)?.regularMarket)
  const integrated = getRecord(day.integrated)
  const sessions = regularMarket ? [regularMarket] : integrated ? [integrated] : []

  if (sessions.length === 0) {
    return [
      {
        id: `TOSS_SECURITIES:${country}:${date}:holiday`,
        type: 'MARKET_HOLIDAY',
        title: `${country} market holiday`,
        country,
        scheduledAt: `${date}T00:00:00.000Z`,
        provider: 'TOSS_SECURITIES',
      },
    ]
  }

  return sessions.flatMap((session) => {
    const startTime = getString(session.startTime)
    const endTime = getString(session.endTime)

    return [
      {
        id: `TOSS_SECURITIES:${country}:${date}:open`,
        type: 'MARKET_OPEN',
        title: `${country} market open`,
        country,
        scheduledAt: startTime || `${date}T00:00:00.000Z`,
        provider: 'TOSS_SECURITIES' as const,
      },
      {
        id: `TOSS_SECURITIES:${country}:${date}:close`,
        type: 'MARKET_CLOSE',
        title: `${country} market close`,
        country,
        scheduledAt: endTime || `${date}T00:00:00.000Z`,
        provider: 'TOSS_SECURITIES' as const,
      },
    ]
  })
}

export function extractTossResultArray(response: TossRecord): TossRecord[] {
  const result = response.result
  return Array.isArray(result) ? result.filter(isRecord) : []
}

export function extractTossResultRecord(response: TossRecord): TossRecord | undefined {
  return getRecord(response.result)
}

export function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const numeric = Number(value.replaceAll(',', ''))
    if (Number.isFinite(numeric)) return numeric
  }

  return 0
}

function toOptionalNumber(value: unknown): number | undefined {
  const numeric = toNumber(value)
  return numeric === 0 && (value === undefined || value === null || value === '')
    ? undefined
    : numeric
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function getRecord(value: unknown): TossRecord | undefined {
  return isRecord(value) ? value : undefined
}

function isRecord(value: unknown): value is TossRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
