// 6주차 §3 — 나트륨 상한형 판정 단일 소스 고정 테스트.
import { describe, it, expect } from 'vitest'
import { isLimitNutrient, isMet, NUTRIENT_CRITERIA, SODIUM_LIMIT_MG } from './nutrientCriteria.js'

describe('nutrientCriteria', () => {
  it('나트륨만 limit, 나머지 5개는 target', () => {
    expect(isLimitNutrient('sodium')).toBe(true)
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber']) {
      expect(isLimitNutrient(key)).toBe(false)
    }
  })

  it('나트륨 threshold는 2000mg 고정', () => {
    const sodium = NUTRIENT_CRITERIA.find((c) => c.key === 'sodium')
    expect(sodium.threshold).toBe(SODIUM_LIMIT_MG)
    expect(SODIUM_LIMIT_MG).toBe(2000)
  })

  it('나트륨 경계값: 1999는 충족, 2000은 충족(경계 포함), 2001은 미충족', () => {
    expect(isMet('sodium', 1999, 2000)).toBe(true)
    expect(isMet('sodium', 2000, 2000)).toBe(true)
    expect(isMet('sodium', 2001, 2000)).toBe(false)
  })

  it('target형(예: 단백질) 경계값: satisfyRatio(0.8) 정확히 도달하면 충족, 미달이면 미충족', () => {
    // 60g 권장 중 80% = 48g
    expect(isMet('protein', 48, 60, 0.8)).toBe(true)
    expect(isMet('protein', 47.9, 60, 0.8)).toBe(false)
  })

  it('target형은 나트륨과 정반대 방향 — 권장량을 넘게 먹어도 계속 충족이다', () => {
    expect(isMet('protein', 200, 60, 0.8)).toBe(true)
  })

  it('권장량이 없으면(0 이하) 항상 미충족 — 잘못된 만족 판정을 내리지 않는다', () => {
    expect(isMet('sodium', 0, 0)).toBe(false)
    expect(isMet('protein', 100, 0)).toBe(false)
  })

  it('모르는 키는 target으로 안전하게 폴백한다', () => {
    expect(isLimitNutrient('unknown_key')).toBe(false)
  })
})
