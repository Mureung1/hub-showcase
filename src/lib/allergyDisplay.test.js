import { describe, it, expect } from 'vitest'
import { codeNumber, sortAllergyCodes, toSuperscript } from './allergyDisplay.js'

describe('codeNumber', () => {
  it('M{n} 코드에서 숫자만 뽑는다', () => {
    expect(codeNumber('M1')).toBe(1)
    expect(codeNumber('M19')).toBe(19)
  })
})

describe('sortAllergyCodes', () => {
  it('중복을 제거하고 오름차순 정렬한다', () => {
    expect(sortAllergyCodes(['M10', 'M2', 'M2', 'M1'])).toEqual(['M1', 'M2', 'M10'])
  })

  it('숫자 정렬이라 두 자리도 올바른 순서(M2 다음 M10)', () => {
    expect(sortAllergyCodes(['M10', 'M9'])).toEqual(['M9', 'M10'])
  })

  it('빈 입력/undefined는 빈 배열', () => {
    expect(sortAllergyCodes([])).toEqual([])
    expect(sortAllergyCodes(undefined)).toEqual([])
  })
})

describe('toSuperscript', () => {
  it('한 자리·두 자리 숫자를 위첨자 유니코드로 바꾼다', () => {
    expect(toSuperscript(1)).toBe('¹')
    expect(toSuperscript(19)).toBe('¹⁹')
  })
})
