import { describe, it, expect } from 'vitest'
import { ranked } from '../../../../packages/kb/engine/core.js'

describe('ranked', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 정상 케이스
  // ─────────────────────────────────────────────────────────────────────────
  it('확률 객체를 내림차순으로 정렬한다', () => {
    const result = ranked({ A: 0.3, B: 0.5, C: 0.2 })

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ id: 'B', p: 0.5 })
    expect(result[1]).toEqual({ id: 'A', p: 0.3 })
    expect(result[2]).toEqual({ id: 'C', p: 0.2 })
  })

  it('1등의 id와 p를 올바르게 반환한다', () => {
    const result = ranked({ drain: 0.234, trap: 0.204, sponge: 0.162 })

    expect(result[0].id).toBe('drain')
    expect(result[0].p).toBeCloseTo(0.234, 5)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 경계값
  // ─────────────────────────────────────────────────────────────────────────
  it('값이 1개뿐이면 그 값 하나만 반환', () => {
    const result = ranked({ A: 1 })

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ id: 'A', p: 1 })
  })

  it('동점이면 둘 다 포함되고 길이가 맞다', () => {
    const result = ranked({ A: 0.5, B: 0.5 })

    expect(result).toHaveLength(2)
    expect(result[0].p).toBe(0.5)
    expect(result[1].p).toBe(0.5)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 빈값 / 엣지
  // ─────────────────────────────────────────────────────────────────────────
  it('빈 객체는 빈 배열 반환', () => {
    const result = ranked({})

    expect(result).toEqual([])
  })

  it('모두 0이어도 정렬된 배열 반환', () => {
    const result = ranked({ A: 0, B: 0, C: 0 })

    expect(result).toHaveLength(3)
    expect(result.every(item => item.p === 0)).toBe(true)
  })
})
