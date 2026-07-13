import assert from 'node:assert/strict'
import test from 'node:test'
import {
  IdSchema,
  IsoDateSchema,
  IsoDateTimeSchema,
  IsoTimeSchema,
} from '../commonSchemas.js'

test('IsoDateSchema accepts valid dates and leap days', () => {
  assert.equal(IsoDateSchema.safeParse('2026-02-28').success, true)
  assert.equal(IsoDateSchema.safeParse('2024-02-29').success, true)
})

test('IsoDateSchema rejects impossible dates and months', () => {
  assert.equal(IsoDateSchema.safeParse('2026-02-30').success, false)
  assert.equal(IsoDateSchema.safeParse('2026-13-01').success, false)
})

test('IsoTimeSchema accepts 23:59 and rejects 24:00', () => {
  assert.equal(IsoTimeSchema.safeParse('23:59').success, true)
  assert.equal(IsoTimeSchema.safeParse('24:00').success, false)
})

test('IsoDateTimeSchema requires a timezone offset or Z', () => {
  assert.equal(
    IsoDateTimeSchema.safeParse('2026-07-10T10:00:00+09:00').success,
    true,
  )
  assert.equal(
    IsoDateTimeSchema.safeParse('2026-07-10T01:00:00Z').success,
    true,
  )
  assert.equal(
    IsoDateTimeSchema.safeParse('2026-07-10T10:00:00').success,
    false,
  )
})

test('IdSchema rejects whitespace-only IDs', () => {
  assert.equal(IdSchema.safeParse('   ').success, false)
})
