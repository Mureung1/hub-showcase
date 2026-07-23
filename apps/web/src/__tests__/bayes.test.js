import { describe, it, expect } from 'vitest'
import { bayes, normalize } from '../../../../packages/kb/engine/core.js'

describe('bayes', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 정상 케이스
  // ─────────────────────────────────────────────────────────────────────────
  it('likelihood가 높은 가설의 확률이 올라간다', () => {
    const prior = { A: 0.5, B: 0.5 }
    const L = { A: 0.8, B: 0.2 }

    const result = bayes(prior, L)

    expect(result.A).toBeGreaterThan(result.B)
    expect(result.A).toBeGreaterThan(0.5) // A는 올라감
    expect(result.B).toBeLessThan(0.5)    // B는 내려감
  })

  it('손계산 대조: P(drain|egg) ≈ 0.557, P(trap|egg) ≈ 0.364', () => {
    // engine/test.js의 손계산 예제 (6개 가설, 정확히 동일한 입력)
    const prior = normalize({
      drain_organic: 0.35, trap_dry: 0.20, food_waste: 0.15,
      mold_under_sink: 0.12, fridge_spoiled: 0.10, sponge_dishcloth: 0.08,
    })
    const L_egg = {
      drain_organic: 0.70, trap_dry: 0.80, food_waste: 0.10,
      mold_under_sink: 0.05, fridge_spoiled: 0.10, sponge_dishcloth: 0.05
    }

    const result = bayes(prior, L_egg)

    expect(result.drain_organic).toBeCloseTo(0.557, 2)
    expect(result.trap_dry).toBeCloseTo(0.364, 2)
  })

  it('결과의 합은 항상 1이다', () => {
    const prior = { A: 0.3, B: 0.5, C: 0.2 }
    const L = { A: 0.9, B: 0.1, C: 0.5 }

    const result = bayes(prior, L)
    const sum = Object.values(result).reduce((a, b) => a + b, 0)

    expect(sum).toBeCloseTo(1, 5)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 경계값: 빈 우도 → prior 불변
  // ─────────────────────────────────────────────────────────────────────────
  it('빈 우도(L={})면 NEUTRAL=0.5 적용되어 prior 비율 유지', () => {
    const prior = { A: 0.6, B: 0.4 }
    const L = {} // 모든 키가 NEUTRAL=0.5

    const result = bayes(prior, L)

    // 모두 같은 likelihood면 prior 비율 유지
    expect(result.A).toBeCloseTo(0.6, 3)
    expect(result.B).toBeCloseTo(0.4, 3)
  })

  it('L에 일부 키만 있으면 없는 키는 NEUTRAL 적용', () => {
    const prior = { A: 0.5, B: 0.5 }
    const L = { A: 0.9 } // B는 NEUTRAL=0.5

    const result = bayes(prior, L)

    // A는 0.9, B는 0.5 → A가 더 높아짐
    expect(result.A).toBeGreaterThan(result.B)
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 에러 케이스
  // ─────────────────────────────────────────────────────────────────────────
  it('prior가 빈 객체면 에러', () => {
    expect(() => bayes({}, { A: 0.5 })).toThrow()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // 엣지: 극단적 likelihood
  // ─────────────────────────────────────────────────────────────────────────
  it('likelihood가 0이어도 clamp로 LMIN=0.05 적용되어 동작', () => {
    const prior = { A: 0.5, B: 0.5 }
    const L = { A: 0, B: 1 } // A는 0 → clamp로 0.05

    const result = bayes(prior, L)

    // B가 훨씬 높아야 함
    expect(result.B).toBeGreaterThan(result.A)
    // 합은 여전히 1
    const sum = Object.values(result).reduce((a, b) => a + b, 0)
    expect(sum).toBeCloseTo(1, 5)
  })
})
