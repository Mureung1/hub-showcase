import type { EconomicCalendarEvent, MarketEventImportance } from '../types/market.types'

export type FmpEconomicCalendarRawItem = Record<string, unknown>

export function mapFmpEconomicCalendarEvent(
  item: FmpEconomicCalendarRawItem,
): EconomicCalendarEvent {
  const title = getString(item, ['event', 'title', 'name']) ?? 'Economic event'
  const country = getString(item, ['country']) ?? 'UNKNOWN'
  const currency = getString(item, ['currency'])
  const scheduledAt = normalizeFmpDate(getString(item, ['date', 'datetime', 'time', 'releasedAt']))
  const actual = getNumberOrString(item, ['actual'])

  return {
    id: Buffer.from(`${title}:${country}:${scheduledAt}`).toString('base64url'),
    title,
    country,
    currency,
    scheduledAt,
    importance: mapFmpImportance(getString(item, ['impact', 'importance', 'priority'])),
    previous: getNumberOrString(item, ['previous']),
    consensus: getNumberOrString(item, ['estimate', 'consensus', 'forecast']),
    actual,
    unit: getString(item, ['unit']),
    status: actual === undefined ? 'UPCOMING' : 'RELEASED',
    provider: 'FMP',
  }
}

export function mapFmpImportance(value: string | undefined): MarketEventImportance {
  const normalized = value?.trim().toUpperCase()

  if (!normalized) return 'LOW'
  if (normalized === 'HIGH' || normalized === '3' || normalized.includes('HIGH')) return 'HIGH'
  if (
    normalized === 'MEDIUM' ||
    normalized === 'MID' ||
    normalized === '2' ||
    normalized.includes('MEDIUM')
  ) {
    return 'MEDIUM'
  }

  return 'LOW'
}

export function getNumberOrString(
  item: FmpEconomicCalendarRawItem,
  keys: string[],
): number | string | undefined {
  const value = keys
    .map((key) => item[key])
    .find((candidate) => candidate !== undefined && candidate !== null)

  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()

  if (!trimmed || trimmed === '-') return undefined

  const numeric = Number(trimmed.replaceAll(',', ''))
  return Number.isFinite(numeric) ? numeric : trimmed
}

function getString(item: FmpEconomicCalendarRawItem, keys: string[]): string | undefined {
  const value = keys.map((key) => item[key]).find((candidate) => typeof candidate === 'string')
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeFmpDate(value: string | undefined): string {
  if (!value) return new Date().toISOString()

  const normalized = value.trim().replace(' ', 'T')
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/u.test(normalized)
  const dateTime = normalized.includes('T') ? normalized : `${normalized}T00:00:00`

  return new Date(hasTimezone ? dateTime : `${dateTime}Z`).toISOString()
}
