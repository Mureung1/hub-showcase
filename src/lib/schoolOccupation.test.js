import { describe, it, expect } from 'vitest'
import { occupationForSchoolKind, OCCUPATION_FOR_UNIVERSITY } from './schoolOccupation.js'

describe('occupationForSchoolKind', () => {
  it('초등학교는 elementary', () => {
    expect(occupationForSchoolKind('초등학교')).toBe('elementary')
  })

  it('중학교/고등학교는 둘 다 middle_high(occupation 옵션이 둘을 구분하지 않음)', () => {
    expect(occupationForSchoolKind('중학교')).toBe('middle_high')
    expect(occupationForSchoolKind('고등학교')).toBe('middle_high')
  })

  it('고교/고등기술학교 등 "고등"을 포함한 변형 표기도 잡는다', () => {
    expect(occupationForSchoolKind('공립고교')).toBe('middle_high')
  })

  it('모르는 값·문자열이 아닌 값은 null(호출부가 기존 값을 유지)', () => {
    expect(occupationForSchoolKind('특수학교')).toBeNull()
    expect(occupationForSchoolKind(undefined)).toBeNull()
    expect(occupationForSchoolKind(null)).toBeNull()
  })
})

describe('OCCUPATION_FOR_UNIVERSITY', () => {
  it('university 문자열이다', () => {
    expect(OCCUPATION_FOR_UNIVERSITY).toBe('university')
  })
})
