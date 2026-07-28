import { describe, it, expect } from 'vitest'
import { validateBodyInfo, AGE_RANGE, HEIGHT_CM_RANGE, WEIGHT_KG_RANGE } from './profileValidation.js'

describe('validateBodyInfo', () => {
  it('세 값 모두 정상 범위면 valid, 에러 없음', () => {
    const result = validateBodyInfo({ age: '25', heightCm: '170', weightKg: '65' })
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual({ age: null, heightCm: null, weightKg: null })
  })

  it('미입력(빈 문자열)은 에러가 아니다 — 온보딩 중 자연스러운 상태', () => {
    const result = validateBodyInfo({ age: '', heightCm: '', weightKg: '' })
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual({ age: null, heightCm: null, weightKg: null })
  })

  it('나이가 범위를 벗어나면(999) invalid + age 에러만 채워진다', () => {
    const result = validateBodyInfo({ age: '999', heightCm: '170', weightKg: '65' })
    expect(result.valid).toBe(false)
    expect(result.errors.age).toMatch(/세 사이로/)
    expect(result.errors.heightCm).toBeNull()
    expect(result.errors.weightKg).toBeNull()
  })

  it('몸무게가 범위를 벗어나면(0.1) invalid + weightKg 에러', () => {
    const result = validateBodyInfo({ age: '25', heightCm: '170', weightKg: '0.1' })
    expect(result.valid).toBe(false)
    expect(result.errors.weightKg).toMatch(/kg 사이로/)
  })

  it('경계값은 포함(inclusive)이다', () => {
    const result = validateBodyInfo({
      age: String(AGE_RANGE.min),
      heightCm: String(HEIGHT_CM_RANGE.max),
      weightKg: String(WEIGHT_KG_RANGE.min),
    })
    expect(result.valid).toBe(true)
  })

  it('경계값 바로 밖은 invalid이다', () => {
    const result = validateBodyInfo({
      age: String(AGE_RANGE.min - 1),
      heightCm: '170',
      weightKg: '65',
    })
    expect(result.valid).toBe(false)
    expect(result.errors.age).not.toBeNull()
  })

  it('숫자가 아닌 값은 invalid이다', () => {
    const result = validateBodyInfo({ age: 'abc', heightCm: '170', weightKg: '65' })
    expect(result.valid).toBe(false)
    expect(result.errors.age).not.toBeNull()
  })
})
