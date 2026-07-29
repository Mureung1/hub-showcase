import { describe, it, expect } from 'vitest'
import { toKoAuthError } from './authErrors.js'

describe('toKoAuthError', () => {
  it('로그인 실패를 한글로 바꾼다', () => {
    expect(toKoAuthError({ message: 'Invalid login credentials' })).toContain('올바르지 않아요')
  })

  it('이미 가입된 이메일', () => {
    expect(toKoAuthError('User already registered')).toContain('이미 가입')
  })

  it('비밀번호 길이 규칙', () => {
    expect(toKoAuthError('Password should be at least 6 characters')).toContain('6자 이상')
  })

  it('문자열도 받는다', () => {
    expect(toKoAuthError('Email not confirmed')).toContain('메일 확인')
  })

  it('알 수 없는 에러는 폴백', () => {
    expect(toKoAuthError({ message: 'weird xyz' })).toBe(
      '문제가 발생했어요. 잠시 후 다시 시도해 주세요.',
    )
  })
})
