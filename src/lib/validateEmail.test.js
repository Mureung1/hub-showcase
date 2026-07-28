import { describe, it, expect } from 'vitest'
import { isValidEmail } from './validateEmail'

describe('isValidEmail', () => {
  it.each(['student@university.ac.kr', 'a@b.com', 'a.b+c@sub.domain.co'])(
    '흔한 정상 형식 "%s"은 통과한다',
    (email) => {
      expect(isValidEmail(email)).toBe(true)
    },
  )

  it.each(['abc@abc', 'abc', '@abc.com', 'abc@.com', 'abc@abc.', 'a b@abc.com', ''])(
    '최상위도메인이 없거나 형식이 잘못된 "%s"는 걸러진다',
    (email) => {
      expect(isValidEmail(email)).toBe(false)
    },
  )
})
