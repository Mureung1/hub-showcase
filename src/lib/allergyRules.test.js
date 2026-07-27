import { describe, it, expect } from 'vitest'
import { MILAIZE_ALLERGENS, getAllergenByCode, mapNeisAllergy, tagAllergensFromMenuName } from './allergyRules.js'

describe('MILAIZE_ALLERGENS', () => {
  it('법정 표시 대상 19종을 모두 담고, code는 M{neisNumber}와 항상 일치한다', () => {
    expect(MILAIZE_ALLERGENS).toHaveLength(19)
    MILAIZE_ALLERGENS.forEach((a) => {
      expect(a.code).toBe(`M${a.neisNumber}`)
    })
  })

  it('NEIS 번호 1~19가 중복 없이 전부 존재한다', () => {
    const numbers = MILAIZE_ALLERGENS.map((a) => a.neisNumber).sort((x, y) => x - y)
    expect(numbers).toEqual(Array.from({ length: 19 }, (_, i) => i + 1))
  })
})

describe('getAllergenByCode', () => {
  it('코드로 알레르기 항목을 찾는다', () => {
    expect(getAllergenByCode('M1').name).toBe('난류(계란)')
  })

  it('모르는 코드는 null — 화면이 깨지지 않게', () => {
    expect(getAllergenByCode('M99')).toBeNull()
    expect(getAllergenByCode(undefined)).toBeNull()
  })
})

describe('mapNeisAllergy', () => {
  it('NEIS 번호 1~19를 밀라이즈 코드로 1:1 변환한다', () => {
    expect(mapNeisAllergy([1, 2, 5, 6])).toEqual(['M1', 'M2', 'M5', 'M6'])
  })

  it('정의되지 않은 번호는 무시한다', () => {
    expect(mapNeisAllergy([1, 99, 6])).toEqual(['M1', 'M6'])
  })

  it('빈 입력/undefined는 빈 배열', () => {
    expect(mapNeisAllergy([])).toEqual([])
    expect(mapNeisAllergy(undefined)).toEqual([])
  })
})

describe('tagAllergensFromMenuName', () => {
  it('돈까스 → M10(돼지고기), M6(밀) 포함', () => {
    const { codes } = tagAllergensFromMenuName('등심왕돈까스')
    expect(codes).toEqual(expect.arrayContaining(['M10', 'M6']))
  })

  it('새우우동 → M9(새우) + M6(밀) 모두 포함', () => {
    const { codes } = tagAllergensFromMenuName('새우우동')
    expect(codes).toEqual(expect.arrayContaining(['M9', 'M6']))
  })

  it('공기밥처럼 알레르기 키워드가 없으면 빈 배열', () => {
    expect(tagAllergensFromMenuName('공기밥').codes).toEqual([])
  })

  it('estimated 플래그가 항상 true — 공식 정보와 구분하기 위한 신호', () => {
    expect(tagAllergensFromMenuName('공기밥').estimated).toBe(true)
    expect(tagAllergensFromMenuName('새우우동').estimated).toBe(true)
  })

  it('빈 메뉴명도 에러 없이 빈 배열', () => {
    expect(tagAllergensFromMenuName('').codes).toEqual([])
    expect(tagAllergensFromMenuName(undefined).codes).toEqual([])
  })
})
