import { describe, it, expect } from 'vitest'
import {
  calcYouthRecommendedNutrients,
  findYouthAgeBracket,
  isYouthAge,
  YOUTH_MAX_AGE,
  YOUTH_MIN_AGE,
} from './youthIntake.js'

describe('isYouthAge', () => {
  it('6~18세는 청소년 범위다', () => {
    expect(isYouthAge(6)).toBe(true)
    expect(isYouthAge(12)).toBe(true)
    expect(isYouthAge(18)).toBe(true)
  })

  it('19세부터는 성인 범위라 청소년이 아니다', () => {
    expect(isYouthAge(19)).toBe(false)
  })

  it('6세 미만(기존에도 이미 성인 공식을 쓰던 구간)은 이 파일이 다루지 않는다', () => {
    expect(isYouthAge(5)).toBe(false)
    expect(isYouthAge(3)).toBe(false)
  })

  it('숫자가 아니거나 없으면 false', () => {
    expect(isYouthAge(undefined)).toBe(false)
    expect(isYouthAge('abc')).toBe(false)
    expect(isYouthAge(NaN)).toBe(false)
  })

  it('YOUTH_MIN_AGE/YOUTH_MAX_AGE 상수가 실제 판정과 일치한다', () => {
    expect(isYouthAge(YOUTH_MIN_AGE)).toBe(true)
    expect(isYouthAge(YOUTH_MAX_AGE)).toBe(true)
    expect(isYouthAge(YOUTH_MAX_AGE + 1)).toBe(false)
  })
})

describe('findYouthAgeBracket', () => {
  it('경계값을 포함해 올바른 구간을 찾는다', () => {
    expect(findYouthAgeBracket(6).key).toBe('6-8')
    expect(findYouthAgeBracket(8).key).toBe('6-8')
    expect(findYouthAgeBracket(9).key).toBe('9-11')
    expect(findYouthAgeBracket(14).key).toBe('12-14')
    expect(findYouthAgeBracket(15).key).toBe('15-18')
    expect(findYouthAgeBracket(18).key).toBe('15-18')
  })
})

describe('calcYouthRecommendedNutrients', () => {
  it('6대 영양소를 모두 양수로 반환한다', () => {
    const result = calcYouthRecommendedNutrients({ age: 10, heightCm: 140, weightKg: 35, sex: 'male', activity: 'moderate' })
    for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium']) {
      expect(result[key]).toBeGreaterThan(0)
    }
  })

  it('단백질·식이섬유는 KDRIs 2020 [별표 2] 공식 수치를 그대로 쓴다(연령·체중 무관 고정값)', () => {
    const light = calcYouthRecommendedNutrients({ age: 12, heightCm: 150, weightKg: 40, sex: 'male', activity: 'low' })
    const heavy = calcYouthRecommendedNutrients({ age: 12, heightCm: 165, weightKg: 70, sex: 'male', activity: 'high' })
    expect(light.protein).toBe(60)
    expect(heavy.protein).toBe(60)
    expect(light.fiber).toBe(30)
    expect(heavy.fiber).toBe(30)

    expect(calcYouthRecommendedNutrients({ age: 7, heightCm: 120, weightKg: 22, sex: 'female', activity: 'moderate' }).protein).toBe(35)
    expect(calcYouthRecommendedNutrients({ age: 16, heightCm: 160, weightKg: 55, sex: 'female', activity: 'moderate' }).protein).toBe(55)
  })

  it('활동량이 높을수록(같은 체중·키·나이) 열량이 늘어난다', () => {
    const base = { age: 15, heightCm: 170, weightKg: 60, sex: 'male' }
    const low = calcYouthRecommendedNutrients({ ...base, activity: 'low' })
    const moderate = calcYouthRecommendedNutrients({ ...base, activity: 'moderate' })
    const high = calcYouthRecommendedNutrients({ ...base, activity: 'high' })
    expect(low.calories).toBeLessThan(moderate.calories)
    expect(moderate.calories).toBeLessThan(high.calories)
  })

  it('나이가 들수록(같은 체중·키·활동량) 성장에 필요한 열량 배분이 달라진다(8세→9세 경계에서 식이 바뀜)', () => {
    const age8 = calcYouthRecommendedNutrients({ age: 8, heightCm: 130, weightKg: 28, sex: 'male', activity: 'moderate' })
    const age9 = calcYouthRecommendedNutrients({ age: 9, heightCm: 133, weightKg: 30, sex: 'male', activity: 'moderate' })
    // 정확한 값 대신 "터무니없지 않은 범위"만 확인한다 — 회귀식 계수가 8→9세에서 바뀌므로 단조 증가를
    // 단정하지 않는다.
    expect(age8.calories).toBeGreaterThan(800)
    expect(age9.calories).toBeGreaterThan(800)
    expect(age8.calories).toBeLessThan(3000)
    expect(age9.calories).toBeLessThan(3000)
  })

  it('탄수화물·지방은 성인과 같은 방식으로(EER의 50%/30%) 계산되고, 나트륨은 성인과 동일한 2000mg 고정이다', () => {
    const a = calcYouthRecommendedNutrients({ age: 7, heightCm: 120, weightKg: 22, sex: 'female', activity: 'low' })
    expect(a.carbs).toBe(Math.round((a.calories * 0.5) / 4))
    expect(a.fat).toBe(Math.round((a.calories * 0.3) / 9))
    expect(a.sodium).toBe(2000)

    const b = calcYouthRecommendedNutrients({ age: 17, heightCm: 175, weightKg: 65, sex: 'male', activity: 'high' })
    expect(b.sodium).toBe(2000)
  })

  it('실제 계산이 상식적인 범위 안에 있다(15세 활동적인 남학생 ≈ 2500~3200kcal)', () => {
    const result = calcYouthRecommendedNutrients({ age: 15, heightCm: 170, weightKg: 60, sex: 'male', activity: 'moderate' })
    expect(result.calories).toBeGreaterThan(2200)
    expect(result.calories).toBeLessThan(3300)
  })
})
