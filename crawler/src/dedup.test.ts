import { describe, expect, it } from 'vitest'
import { isDuplicateTitle, titleSimilarity } from './dedup.js'

describe('titleSimilarity', () => {
  it('완전히 같은 제목은 유사도 1이다', () => {
    expect(titleSimilarity('청년 창업 임대료 지원', '청년 창업 임대료 지원')).toBe(1)
  })

  it('기관명 접두어/연도 표기만 다른 사실상 같은 공고는 임계값 이상으로 나온다', () => {
    const a = '2026년 방산 특화 창업중심대학 창업기업 모집 공고'
    const b = '2026년도 방산 특화 창업중심대학 창업기업 모집 공고'
    expect(titleSimilarity(a, b)).toBeGreaterThanOrEqual(0.75)
  })

  it('완전히 다른 주제의 공고는 유사도가 낮다', () => {
    const a = '청년 창업 임대료 지원'
    const b = '소상공인 방역물품 지원'
    expect(titleSimilarity(a, b)).toBeLessThan(0.3)
  })

  it('둘 중 하나가 빈 문자열(정규화 후 포함)이면 0을 반환한다', () => {
    expect(titleSimilarity('', '청년 창업 임대료 지원')).toBe(0)
    expect(titleSimilarity('(),.', '청년 창업 임대료 지원')).toBe(0)
  })
})

describe('isDuplicateTitle', () => {
  it('기존 목록 중 임계값 이상 유사한 제목이 있으면 true', () => {
    const existing = ['청년 창업 임대료 지원', '소상공인 방역물품 지원']
    expect(isDuplicateTitle('청년 창업 임대료 지원', existing)).toBe(true)
  })

  it('기존 목록과 충분히 다르면 false', () => {
    const existing = ['청년 창업 임대료 지원', '소상공인 방역물품 지원']
    expect(isDuplicateTitle('스마트오더 시스템 지원', existing)).toBe(false)
  })

  it('기존 목록이 비어있으면 항상 false', () => {
    expect(isDuplicateTitle('아무 제목', [])).toBe(false)
  })
})
