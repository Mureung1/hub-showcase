import { describe, it, expect, beforeEach } from 'vitest'
import { formatAnalyzedAt, getTodayDietAnalysis, saveDietAnalysis } from './dietAnalysisCache.js'

beforeEach(() => {
  localStorage.clear()
})

const FINDINGS = [{ summary: '잘 드셨어요', detail: '단백질을 꾸준히 챙기고 계세요.', type: 'good' }]

describe('getTodayDietAnalysis / saveDietAnalysis', () => {
  it('저장 전에는 null', () => {
    expect(getTodayDietAnalysis('guest', 7, '2026-07-27')).toBeNull()
  })

  it('오늘 날짜로 저장하면 그대로 돌려받는다', () => {
    saveDietAnalysis('guest', 7, '2026-07-27', {
      findings: FINDINGS,
      startDate: '2026-07-21',
      endDate: '2026-07-27',
      recordedDays: 6,
      analyzedAt: '2026-07-27T09:12:00.000Z',
    })
    const cached = getTodayDietAnalysis('guest', 7, '2026-07-27')
    expect(cached.findings).toEqual(FINDINGS)
    expect(cached.recordedDays).toBe(6)
  })

  it('날짜가 바뀌면(캐시된 date !== 오늘) 더 이상 보여주지 않는다', () => {
    saveDietAnalysis('guest', 7, '2026-07-27', { findings: FINDINGS, analyzedAt: '2026-07-27T09:12:00.000Z' })
    expect(getTodayDietAnalysis('guest', 7, '2026-07-28')).toBeNull()
  })

  it('기간 옵션(7일 vs 30일)이 다르면 서로 다른 캐시로 분리된다', () => {
    saveDietAnalysis('guest', 7, '2026-07-27', { findings: FINDINGS, analyzedAt: '2026-07-27T09:12:00.000Z' })
    expect(getTodayDietAnalysis('guest', 30, '2026-07-27')).toBeNull()
  })

  it('사용자(userId)가 다르면 캐시가 섞이지 않는다', () => {
    saveDietAnalysis('user-a', 7, '2026-07-27', { findings: FINDINGS, analyzedAt: '2026-07-27T09:12:00.000Z' })
    expect(getTodayDietAnalysis('user-b', 7, '2026-07-27')).toBeNull()
  })

  it('구버전(v1, text 필드) 캐시는 findings 배열이 없어 무효 처리된다', () => {
    // v1 시절에는 캐시 키에 버전 접두어가 없었다 — 지금 키(v2)에 옛 모양(text만 있고 findings 없음)의
    // 값이 저장돼 있는 상황을 흉내내, findings 배열 유무로도 방어되는지 확인한다.
    localStorage.setItem(
      'cjmt:dietAnalysis:v2:guest:7',
      JSON.stringify({ date: '2026-07-27', text: '옛날 분석', analyzedAt: '2026-07-27T09:12:00.000Z' }),
    )
    expect(getTodayDietAnalysis('guest', 7, '2026-07-27')).toBeNull()
  })

  it('v1 키에 남은 옛 캐시는 애초에 다른 키라 조회되지 않는다', () => {
    localStorage.setItem(
      'cjmt:dietAnalysis:guest:7',
      JSON.stringify({ date: '2026-07-27', text: '옛날 분석', analyzedAt: '2026-07-27T09:12:00.000Z' }),
    )
    expect(getTodayDietAnalysis('guest', 7, '2026-07-27')).toBeNull()
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
