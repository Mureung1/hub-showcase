import { describe, it, expect } from 'vitest'
import { validateSchoolEmail } from './validateSchoolEmail.js'

describe('validateSchoolEmail', () => {
  it('정상적인 .ac.kr 이메일이면 true를 반환한다', () => {
    expect(validateSchoolEmail('student@hanyang.ac.kr')).toBe(true)
  })

  it('대문자로 된 .AC.KR 이메일이면 true를 반환한다', () => {
    expect(validateSchoolEmail('student@snu.AC.KR')).toBe(true)
  })

  it('빈 문자열이면 false를 반환한다', () => {
    expect(validateSchoolEmail('')).toBe(false)
  })

  it('null이면 false를 반환한다', () => {
    expect(validateSchoolEmail(null)).toBe(false)
  })

  it('undefined이면 false를 반환한다', () => {
    expect(validateSchoolEmail(undefined)).toBe(false)
  })

  it('.ac.kr이 아닌 이메일이면 false를 반환한다', () => {
    expect(validateSchoolEmail('student@gmail.com')).toBe(false)
  })

  it('문자열이 아니면 false를 반환한다', () => {
    expect(validateSchoolEmail(123)).toBe(false)
  })

  it('아이디 부분이 없으면 false를 반환한다', () => {
    expect(validateSchoolEmail('@ac.kr')).toBe(false)
  })

  it('도메인 이름이 없으면 false를 반환한다', () => {
    expect(validateSchoolEmail('student@ac.kr')).toBe(false)
  })
})
