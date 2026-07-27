import { describe, it, expect } from 'vitest'
import { getOccupationRecommendation, OCCUPATION_OPTIONS } from './occupationKeywords.js'

describe('OCCUPATION_OPTIONS', () => {
  it('확정된 5개 선택지를 그 순서 그대로 담는다', () => {
    expect(OCCUPATION_OPTIONS.map((o) => o.label)).toEqual(['초등학생', '중·고등학생', '대학생', '직장인', '기타'])
  })
})

describe('getOccupationRecommendation', () => {
  it('초등학생/중고등학생 → 학식·급식 바로가기 + 분식·간식 키워드', () => {
    expect(getOccupationRecommendation('elementary')).toEqual({ mealShortcut: 'cafeteria', keywords: ['분식', '간식'] })
    expect(getOccupationRecommendation('middle_high')).toEqual({ mealShortcut: 'cafeteria', keywords: ['분식', '간식'] })
  })

  it('대학생 → 학식 바로가기 + 백반·가성비 맛집 키워드', () => {
    expect(getOccupationRecommendation('university')).toEqual({
      mealShortcut: 'cafeteria',
      keywords: ['백반', '가성비 맛집'],
    })
  })

  it('직장인 → 바로가기 없이 백반·한식뷔페·구내식당·점심특선 키워드', () => {
    expect(getOccupationRecommendation('worker')).toEqual({
      mealShortcut: null,
      keywords: ['백반', '한식 뷔페', '구내식당', '점심 특선'],
    })
  })

  it('기타 → 바로가기·키워드 모두 없음(기존 부족 영양소 추천만)', () => {
    expect(getOccupationRecommendation('other')).toEqual({ mealShortcut: null, keywords: [] })
  })

  it('미설정(null/undefined)·모르는 값은 기타와 동일하게 떨어진다 — 기존 동작 완전 유지', () => {
    expect(getOccupationRecommendation(null)).toEqual({ mealShortcut: null, keywords: [] })
    expect(getOccupationRecommendation(undefined)).toEqual({ mealShortcut: null, keywords: [] })
    expect(getOccupationRecommendation('모르는값')).toEqual({ mealShortcut: null, keywords: [] })
  })
})
