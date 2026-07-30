import { describe, it, expect } from 'vitest'

import { buildDefaultPreferences, LANGUAGE_OPTIONS } from './preferences.js'

// analysis 응답(openapi.yaml Analysis 스키마) 최소 형태
function buildAnalysis(overrides = {}) {
  return {
    githubId: 'kimsunho2000',
    languages: [{ name: 'JavaScript', ratio: 0.7 }, { name: 'Python', ratio: 0.3 }],
    skillLevel: 'beginner',
    ...overrides,
  }
}

describe('buildDefaultPreferences', () => {
  it('분석 결과의 1순위 언어를 유일 선호 언어로 고른다', () => {
    expect(buildDefaultPreferences(buildAnalysis()).languages).toEqual(['JavaScript'])
  })

  // 첫 기여 서비스라 intermediate도 easy로 내려보내는 게 의도된 매핑이다 (preferences.js 주석 참조)
  it('skillLevel을 난이도로 매핑한다 — beginner·intermediate는 둘 다 easy', () => {
    expect(buildDefaultPreferences(buildAnalysis({ skillLevel: 'beginner' })).difficulty).toBe('easy')
    expect(buildDefaultPreferences(buildAnalysis({ skillLevel: 'intermediate' })).difficulty).toBe('easy')
    expect(buildDefaultPreferences(buildAnalysis({ skillLevel: 'advanced' })).difficulty).toBe('medium')
  })

  it('languages가 빈 배열이면 LANGUAGE_OPTIONS의 첫 옵션으로 폴백한다', () => {
    expect(buildDefaultPreferences(buildAnalysis({ languages: [] })).languages).toEqual([LANGUAGE_OPTIONS[0]])
  })

  it('skillLevel이 알려지지 않은 값이면 difficulty는 easy로 폴백한다', () => {
    expect(buildDefaultPreferences(buildAnalysis({ skillLevel: 'unknown' })).difficulty).toBe('easy')
    expect(buildDefaultPreferences(buildAnalysis({ skillLevel: undefined })).difficulty).toBe('easy')
  })

  it('topics 기본값은 빈 배열이다', () => {
    expect(buildDefaultPreferences(buildAnalysis()).topics).toEqual([])
  })
})
