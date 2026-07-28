import { describe, it, expect } from 'vitest'
import { getStandardIntake } from './standardIntake.js'

describe('getStandardIntake — 성인 회귀 가드(청소년 구간 추가 전후 동일해야 함)', () => {
  it('성인 연령대 출력이 청소년 구간 추가 전과 같다(19-29 남/30-49 여/75+ 남)', () => {
    expect(getStandardIntake('male', 25)).toEqual({ calories: 2600, protein: 65, carbs: 130, fat: 70, fiber: 30, sodium: 2000 })
    expect(getStandardIntake('female', 35)).toEqual({ calories: 1900, protein: 50, carbs: 130, fat: 55, fiber: 25, sodium: 2000 })
    expect(getStandardIntake('male', 80)).toEqual({ calories: 1900, protein: 60, carbs: 130, fat: 55, fiber: 30, sodium: 2000 })
  })

  it('나이를 안 주면(기존과 동일) 19세 기준으로 폴백한다', () => {
    expect(getStandardIntake('male', undefined)).toEqual(getStandardIntake('male', 19))
  })
})

describe('getStandardIntake — 청소년(6~18세) 구간', () => {
  it('단백질·식이섬유는 youthIntake.js의 KDRIs 2020 공식 수치와 정확히 같다', () => {
    const result = getStandardIntake('male', 10) // 9-11세 구간
    expect(result.protein).toBe(50)
    expect(result.fiber).toBe(25)

    const girl = getStandardIntake('female', 16) // 15-18세 구간
    expect(girl.protein).toBe(55)
    expect(girl.fiber).toBe(20)
  })

  it('연령 구간 경계를 올바르게 나눈다', () => {
    expect(getStandardIntake('male', 8).calories).toBe(1700) // 6-8
    expect(getStandardIntake('male', 9).calories).toBe(2000) // 9-11
    expect(getStandardIntake('male', 18).calories).toBe(2700) // 15-18
  })

  it('탄수화물·나트륨은 성인과 동일한 전 연령 공통값이다', () => {
    const result = getStandardIntake('female', 12)
    expect(result.carbs).toBe(130)
    expect(result.sodium).toBe(2000)
  })

  it('6세 미만은 이 함수의 청소년 분기 대상이 아니다(기존처럼 성인 표로 폴백)', () => {
    const result = getStandardIntake('male', 5)
    expect(result).toEqual(getStandardIntake('male', 19))
  })
})
