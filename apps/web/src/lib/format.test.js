import { describe, expect, test } from 'vitest'

import { addLocalDaysIso, todayIso } from './format.js'

describe('local ISO dates', () => {
  test('adds calendar days without converting through UTC', () => {
    const earlyMorning = new Date(2026, 6, 15, 1, 30)

    expect(addLocalDaysIso(7, earlyMorning)).toBe('2026-07-22')
  })

  test('formats the current local calendar date', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
