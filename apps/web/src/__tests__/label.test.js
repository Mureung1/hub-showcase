import { describe, it, expect } from 'vitest'
import { label } from '../../../../packages/kb/engine/core.js'

describe('label', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 기본 분기 테스트
  // ─────────────────────────────────────────────────────────────────────────
  it('p >= 0.60 이면 "유력" 반환', () => {
    expect(label(0.60)).toBe('유력')
    expect(label(0.75)).toBe('유력')
    expect(label(1.0)).toBe('유력')
  })

  it('0.35 <= p < 0.60 이면 "가능" 반환', () => {
    expect(label(0.35)).toBe('가능')
    expect(label(0.50)).toBe('가능')
    expect(label(0.59)).toBe('가능')
  })

  it('0.15 <= p < 0.35 이면 "낮음" 반환', () => {
    expect(label(0.15)).toBe('낮음')
    expect(label(0.25)).toBe('낮음')
    expect(label(0.34)).toBe('낮음')
  })

  it('p < 0.15 이면 "희박" 반환', () => {
    expect(label(0.14)).toBe('희박')
    expect(label(0.05)).toBe('희박')
    expect(label(0)).toBe('희박')
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 경계값 테스트 (임계값 정확히)
  // ─────────────────────────────────────────────────────────────────────────
  it('경계값 0.60에서 "유력"', () => {
    expect(label(0.60)).toBe('유력')
    expect(label(0.5999)).toBe('가능')
  })

  it('경계값 0.35에서 "가능"', () => {
    expect(label(0.35)).toBe('가능')
    expect(label(0.3499)).toBe('낮음')
  })

  it('경계값 0.15에서 "낮음"', () => {
    expect(label(0.15)).toBe('낮음')
    expect(label(0.1499)).toBe('희박')
  })
})
