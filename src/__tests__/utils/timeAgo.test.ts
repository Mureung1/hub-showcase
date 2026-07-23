import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatTimeAgo } from '../../components/scheduler/timeAgo'

const NOW = new Date('2026-07-23T12:00:00.000Z')

function minutesAgo(minutes: number) {
  return new Date(NOW.getTime() - minutes * 60_000).toISOString()
}

describe('formatTimeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('1분 미만이면 "지금"으로 표시한다', () => {
    expect(formatTimeAgo(minutesAgo(0))).toBe('지금')
  })

  it('1분 이상 60분 미만이면 "N분 전"으로 표시한다', () => {
    expect(formatTimeAgo(minutesAgo(1))).toBe('1분 전')
    expect(formatTimeAgo(minutesAgo(59))).toBe('59분 전')
  })

  it('60분 이상 24시간 미만이면 "N시간 전"으로 표시한다', () => {
    expect(formatTimeAgo(minutesAgo(60))).toBe('1시간 전')
    expect(formatTimeAgo(minutesAgo(60 * 23))).toBe('23시간 전')
  })

  it('24시간 이상이면 "N일 전"으로 표시한다', () => {
    expect(formatTimeAgo(minutesAgo(60 * 24))).toBe('1일 전')
    expect(formatTimeAgo(minutesAgo(60 * 24 * 3))).toBe('3일 전')
  })
})
