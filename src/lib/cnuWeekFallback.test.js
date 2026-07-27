import { describe, it, expect } from 'vitest'
import { resolveCnuWeekResult } from './cnuWeekFallback.js'

const SAMPLE_DAYS = [{ date: '20260727', cafeterias: {} }]

describe('resolveCnuWeekResult', () => {
  it('1차: 크롤링이 성공하면 live를 쓴다', () => {
    const result = resolveCnuWeekResult({
      liveResult: { week: '20260727', days: SAMPLE_DAYS },
      fallbackWeek: { week: '20260720', updatedAt: '2026-07-20', days: SAMPLE_DAYS },
    })
    expect(result).toEqual({ source: 'live', week: '20260727', days: SAMPLE_DAYS, updatedAt: null })
  })

  it('2차: 크롤링이 예외(null)면 폴백으로 넘어간다', () => {
    const fallbackWeek = { week: '20260720', updatedAt: '2026-07-20', days: SAMPLE_DAYS }
    const result = resolveCnuWeekResult({ liveResult: null, fallbackWeek })
    expect(result).toEqual({ source: 'fallback', week: '20260720', days: SAMPLE_DAYS, updatedAt: '2026-07-20' })
  })

  it('3차: 크롤링도 실패하고 폴백도 없으면 빈 상태(에러 아님)', () => {
    const result = resolveCnuWeekResult({ liveResult: null, fallbackWeek: null })
    expect(result).toEqual({ source: 'empty', week: null, days: [], updatedAt: null })
  })

  it('3차: 폴백 항목은 있지만 days가 비어 있으면 역시 빈 상태', () => {
    const result = resolveCnuWeekResult({ liveResult: null, fallbackWeek: { week: '20260720', updatedAt: '2026-07-20', days: [] } })
    expect(result).toEqual({ source: 'empty', week: null, days: [], updatedAt: null })
  })
})
