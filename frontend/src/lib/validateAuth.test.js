// 이메일/비밀번호 형식 검증 함수 테스트 (red 단계: 아직 통과하는 코드가 없다)
import { test, expect } from 'vitest'
import { validateEmail, validatePassword } from './validateAuth'

test('정상 이메일은 통과한다', () => {
  expect(validateEmail('test@example.com')).toBe(true)
})

test('빈 문자열 이메일은 거절한다', () => {
  expect(validateEmail('')).toBe(false)
})

test('@가 없으면 거절한다', () => {
  expect(validateEmail('invalid')).toBe(false)
})

test('도메인이 없으면 거절한다', () => {
  expect(validateEmail('test@')).toBe(false)
})

test('공백이 섞여 있으면 거절한다', () => {
  expect(validateEmail('te st@example.com')).toBe(false)
})

test('6자 이상 비밀번호는 통과한다', () => {
  expect(validatePassword('abcdef')).toBe(true)
})

test('5자 이하 비밀번호는 거절한다', () => {
  expect(validatePassword('abcde')).toBe(false)
})

test('빈 문자열 비밀번호는 거절한다', () => {
  expect(validatePassword('')).toBe(false)
})
