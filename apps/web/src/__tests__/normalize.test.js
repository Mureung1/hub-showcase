import { describe, it, expect } from 'vitest'
import { normalize } from '../../../../packages/kb/engine/core.js'

describe('normalize', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 정상 케이스
  // ─────────────────────────────────────────────────────────────────────────
  it('합이 5인 객체를 정규화하면 합이 1이 된다', () => {
    const result = normalize({ A: 2, B: 3 })
    expect(result.A).toBeCloseTo(0.4, 5)
    expect(result.B).toBeCloseTo(0.6, 5)

    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
  })

  it('이미 합이 1인 객체는 그대로 반환', () => {
    const result = normalize({ A: 0.5, B: 0.5 })
    expect(result.A).toBeCloseTo(0.5, 5)
    expect(result.B).toBeCloseTo(0.5, 5)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 경계값
  // ─────────────────────────────────────────────────────────────────────────
  it('값이 1개뿐이면 그 값이 1이 된다', () => {
    const result = normalize({ A: 5 })
    expect(result.A).toBeCloseTo(1, 5)
  })

  it('0을 포함해도 합이 0보다 크면 정규화 성공', () => {
    const result = normalize({ A: 0, B: 1 })
    expect(result.A).toBeCloseTo(0, 5)
    expect(result.B).toBeCloseTo(1, 5)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 에러 케이스 (반대 / 빈값)
  // ─────────────────────────────────────────────────────────────────────────
  it('합이 0이면 에러를 던진다', () => {
    expect(() => normalize({ A: 0, B: 0 })).toThrow('확률 합이 0')
  })

  it('음수와 양수가 상쇄되어 합이 0이면 에러', () => {
    expect(() => normalize({ A: -1, B: 1 })).toThrow('확률 합이 0')
  })

  it('빈 객체는 합이 0이므로 에러', () => {
    expect(() => normalize({})).toThrow('확률 합이 0')
  })
})
