import { describe, expect, test } from 'vitest'

import { addLocalDaysIso, formatPeriod, formatShortDate, todayIso } from './format.js'

describe('short dates', () => {
  test('formats date-only values and full ISO timestamps consistently', () => {
    expect(formatShortDate('2026-07-23')).toBe('07.23')
    expect(formatShortDate('2026-07-23T14:05:06.000Z')).toBe('07.23')
    expect(formatShortDate('2026-07-23 14:05:06+09:00')).toBe('07.23')
  })

  test('rejects malformed or impossible calendar dates', () => {
    expect(formatShortDate('')).toBe('미정')
    expect(formatShortDate('2026-02-30')).toBe('미정')
    expect(formatShortDate('2026-7-3')).toBe('미정')
    expect(formatShortDate(null)).toBe('미정')
  })

  test('formats periods containing timestamps without leaking the time portion', () => {
    expect(formatPeriod('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.000Z')).toBe('07.01 ~ 07.31')
  })
})

describe('local ISO dates', () => {
  test('adds calendar days without converting through UTC', () => {
    const earlyMorning = new Date(2026, 6, 15, 1, 30)

    expect(addLocalDaysIso(7, earlyMorning)).toBe('2026-07-22')
  })

  test('formats the current local calendar date', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
