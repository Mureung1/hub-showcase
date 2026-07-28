import { describe, it, expect } from 'vitest'
import { getKoreanAverageIntake } from './koreanAverageIntake.js'

describe('getKoreanAverageIntake — 성인 회귀 가드', () => {
  it('19세 이상 출력은 청소년 처리 추가 전과 같다', () => {
    expect(getKoreanAverageIntake('male', 25)).toEqual({
      calories: 2500,
      protein: 95,
      carbs: 340,
      fat: 70,
      fiber: 25,
      sodium: 4000,
    })
    expect(getKoreanAverageIntake('female', 70)).toEqual({
      calories: 1500,
      protein: 55,
      carbs: 240,
      fat: 33,
      fiber: 20,
      sodium: 2500,
    })
  })
})

describe('getKoreanAverageIntake — 청소년(6~18세)', () => {
  it('실제 통계가 없어 null을 반환한다(19-29 성인 평균으로 조용히 대체되던 버그 수정)', () => {
    expect(getKoreanAverageIntake('male', 10)).toBeNull()
    expect(getKoreanAverageIntake('female', 17)).toBeNull()
  })
})

describe('getKoreanAverageIntake — 잘못된 입력', () => {
  it('나이/성별이 없으면 null', () => {
    expect(getKoreanAverageIntake('male', undefined)).toBeNull()
    expect(getKoreanAverageIntake(undefined, 25)).toBeNull()
  })
})
