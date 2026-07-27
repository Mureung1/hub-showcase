import { describe, it, expect, beforeEach } from 'vitest'
import { formatAnalyzedAt, getTodayDietAnalysis, saveDietAnalysis } from './dietAnalysisCache.js'

beforeEach(() => {
  localStorage.clear()
})

describe('getTodayDietAnalysis / saveDietAnalysis', () => {
  it('저장 전에는 null', () => {
    expect(getTodayDietAnalysis('guest', 7, '2026-07-27')).toBeNull()
  })

  it('오늘 날짜로 저장하면 그대로 돌려받는다', () => {
    saveDietAnalysis('guest', 7, '2026-07-27', {
      text: '분석 결과',
      startDate: '2026-07-21',
      endDate: '2026-07-27',
      recordedDays: 6,
      analyzedAt: '2026-07-27T09:12:00.000Z',
    })
    const cached = getTodayDietAnalysis('guest', 7, '2026-07-27')
    expect(cached.text).toBe('분석 결과')
    expect(cached.recordedDays).toBe(6)
  })

  it('날짜가 바뀌면(캐시된 date !== 오늘) 더 이상 보여주지 않는다', () => {
    saveDietAnalysis('guest', 7, '2026-07-27', { text: '어제 분석', analyzedAt: '2026-07-27T09:12:00.000Z' })
    expect(getTodayDietAnalysis('guest', 7, '2026-07-28')).toBeNull()
  })

  it('기간 옵션(7일 vs 30일)이 다르면 서로 다른 캐시로 분리된다', () => {
    saveDietAnalysis('guest', 7, '2026-07-27', { text: '7일 분석', analyzedAt: '2026-07-27T09:12:00.000Z' })
    expect(getTodayDietAnalysis('guest', 30, '2026-07-27')).toBeNull()
  })

  it('사용자(userId)가 다르면 캐시가 섞이지 않는다', () => {
    saveDietAnalysis('user-a', 7, '2026-07-27', { text: 'A의 분석', analyzedAt: '2026-07-27T09:12:00.000Z' })
    expect(getTodayDietAnalysis('user-b', 7, '2026-07-27')).toBeNull()
  })
})

describe('formatAnalyzedAt', () => {
  it('오전/오후와 시:분을 한국어로 포맷한다', () => {
    expect(formatAnalyzedAt('2026-07-27T09:12:00')).toBe('오늘 오전 9:12 분석')
    expect(formatAnalyzedAt('2026-07-27T21:05:00')).toBe('오늘 오후 9:05 분석')
    expect(formatAnalyzedAt('2026-07-27T00:00:00')).toBe('오늘 오전 12:00 분석')
  })

  it('잘못된 값은 빈 문자열', () => {
    expect(formatAnalyzedAt('not-a-date')).toBe('')
  })
})
