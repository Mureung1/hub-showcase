import { formatRelativeTime } from './date'

describe('formatRelativeTime', () => {
  it('1분 미만이면 "방금 전"을 반환한다', () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe('방금 전')
  })

  it('60분 미만이면 분 단위로 반환한다', () => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60_000).toISOString()
    expect(formatRelativeTime(thirtyMinutesAgo)).toBe('30분 전')
  })
})
