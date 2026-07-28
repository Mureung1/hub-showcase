import { describe, it, expect } from 'vitest'
import { findAllergyConflicts } from './allergyConflicts.js'

describe('findAllergyConflicts — 정의된 옵션 키', () => {
  it('프로필에 우유 알레르기가 있고 메뉴에 M2(우유)가 있으면 겹친다', () => {
    expect(findAllergyConflicts(['milk'], ['M2', 'M6'])).toEqual(['M2'])
  })

  it('겹치는 게 없으면 빈 배열', () => {
    expect(findAllergyConflicts(['milk'], ['M6', 'M9'])).toEqual([])
  })

  it('갑각류는 게(M8)·새우(M9)만 가리키고 조개류(M18)는 포함하지 않는다', () => {
    expect(findAllergyConflicts(['shellfish'], ['M8'])).toEqual(['M8'])
    expect(findAllergyConflicts(['shellfish'], ['M9'])).toEqual(['M9'])
    expect(findAllergyConflicts(['shellfish'], ['M18'])).toEqual([])
  })

  it('여러 알레르기 중 일부만 겹쳐도 겹치는 것만 반환한다', () => {
    expect(findAllergyConflicts(['milk', 'egg', 'peanut'], ['M1', 'M6'])).toEqual(['M1'])
  })
})

describe('findAllergyConflicts — 자유 입력(키워드 매칭)', () => {
  it('정의된 옵션에 없는 알레르기도 이름이 그대로 들어오면 매칭한다', () => {
    expect(findAllergyConflicts(['고등어'], ['M7'])).toEqual(['M7'])
    expect(findAllergyConflicts(['잣'], ['M19'])).toEqual(['M19'])
  })

  it('조사가 붙은 자유 입력도 부분 일치로 매칭한다', () => {
    expect(findAllergyConflicts(['고등어 알레르기 있음'], ['M7'])).toEqual(['M7'])
  })

  it('키워드로도 매칭한다(메뉴 알레르기 태깅과 동일한 키워드 체계)', () => {
    expect(findAllergyConflicts(['치킨'], ['M15'])).toEqual(['M15']) // M15 닭고기 키워드에 '치킨' 포함
  })

  it('전혀 관계없는 자유 입력은 매칭되지 않는다', () => {
    expect(findAllergyConflicts(['먼지'], ['M1', 'M2', 'M6'])).toEqual([])
  })
})

describe('findAllergyConflicts — 방어적 입력', () => {
  it('프로필 알레르기가 없으면 빈 배열', () => {
    expect(findAllergyConflicts([], ['M1'])).toEqual([])
    expect(findAllergyConflicts(null, ['M1'])).toEqual([])
    expect(findAllergyConflicts(undefined, ['M1'])).toEqual([])
  })

  it('메뉴에 알레르기 코드가 없으면 빈 배열', () => {
    expect(findAllergyConflicts(['milk'], [])).toEqual([])
    expect(findAllergyConflicts(['milk'], null)).toEqual([])
  })
})
