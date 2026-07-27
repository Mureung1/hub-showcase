import { BadRequestException } from '@nestjs/common'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export interface DateRange {
  from: string
  to: string
}

export function normalizeDateRange(
  from: string | undefined,
  to: string | undefined,
  options: { defaultDays: number; maxDays: number },
): DateRange {
  const today = new Date()
  const defaultFrom = formatDate(today)
  const defaultTo = formatDate(addDays(today, options.defaultDays))

  const normalizedFrom = from ?? defaultFrom
  const normalizedTo = to ?? defaultTo

  assertIsoDate(normalizedFrom, 'from')
  assertIsoDate(normalizedTo, 'to')

  const fromTime = Date.parse(`${normalizedFrom}T00:00:00Z`)
  const toTime = Date.parse(`${normalizedTo}T00:00:00Z`)

  if (fromTime > toTime) {
    throw new BadRequestException({
      code: 'INVALID_DATE_RANGE',
      message: 'from must be before or equal to to.',
    })
  }

  const days = Math.round((toTime - fromTime) / (24 * 60 * 60 * 1000)) + 1

  if (days > options.maxDays) {
    throw new BadRequestException({
      code: 'DATE_RANGE_TOO_LARGE',
      message: `Date range must be ${options.maxDays} days or less.`,
    })
  }

  return { from: normalizedFrom, to: normalizedTo }
}

export function assertIsoDate(value: string, field: string): void {
  if (!ISO_DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new BadRequestException({
      code: 'INVALID_DATE',
      field,
      message: `${field} must be YYYY-MM-DD.`,
    })
  }
}

export function toDartDate(value: string): string {
  assertIsoDate(value, 'date')
  return value.replaceAll('-', '')
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
