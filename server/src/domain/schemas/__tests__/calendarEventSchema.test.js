import assert from 'node:assert/strict'
import test from 'node:test'
import { CalendarEventSchema } from '../calendarEventSchema.js'
import { createCalendarEvent } from './fixtures.js'

test('CalendarEventSchema accepts a valid all-day event', () => {
  assert.equal(CalendarEventSchema.safeParse(createCalendarEvent()).success, true)
})

test('all-day events reject time and timezone values', () => {
  for (const [fieldName, value] of [
    ['startTime', '10:00'],
    ['endTime', '11:00'],
    ['timezone', 'Asia/Seoul'],
  ]) {
    assert.equal(
      CalendarEventSchema.safeParse(
        createCalendarEvent({ [fieldName]: value }),
      ).success,
      false,
      fieldName,
    )
  }
})

test('a timed deadline may have endTime=null', () => {
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({
        startTime: '10:00',
        endTime: null,
        isAllDay: false,
        timezone: 'Asia/Seoul',
      }),
    ).success,
    true,
  )
})

test('timed events require startTime and timezone', () => {
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({ isAllDay: false, timezone: 'Asia/Seoul' }),
    ).success,
    false,
  )
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({ isAllDay: false, startTime: '10:00' }),
    ).success,
    false,
  )
})

test('inclusive endDate must be on or after startDate', () => {
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({ startDate: '2026-07-21', endDate: '2026-07-20' }),
    ).success,
    false,
  )
})

test('same-day endTime must be on or after startTime', () => {
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({
        startTime: '11:00',
        endTime: '10:00',
        isAllDay: false,
        timezone: 'Asia/Seoul',
      }),
    ).success,
    false,
  )
})

test('times are not incorrectly compared across different dates', () => {
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({
        startDate: '2026-07-20',
        endDate: '2026-07-21',
        startTime: '23:00',
        endTime: '01:00',
        isAllDay: false,
        timezone: 'Asia/Seoul',
      }),
    ).success,
    true,
  )
})

test('calendar event review state is enforced', () => {
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({ reviewRequired: true }),
    ).success,
    false,
  )
  assert.equal(
    CalendarEventSchema.safeParse(
      createCalendarEvent({
        reviewRequired: true,
        reviewReasons: ['ambiguous_date'],
      }),
    ).success,
    true,
  )
})

test('cancelled events retain their dates', () => {
  const result = CalendarEventSchema.safeParse(
    createCalendarEvent({ status: 'cancelled' }),
  )

  assert.equal(result.success, true)
  assert.equal(result.data.startDate, '2026-07-20')
  assert.equal(result.data.endDate, '2026-07-20')
})

test('negative sequence values fail', () => {
  assert.equal(
    CalendarEventSchema.safeParse(createCalendarEvent({ sequence: -1 })).success,
    false,
  )
})
