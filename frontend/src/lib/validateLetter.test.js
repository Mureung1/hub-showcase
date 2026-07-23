// 편지 본문 검증 함수의 테스트 (red 단계: 아직 통과하는 코드가 없다)
import { test, expect } from 'vitest'
import { validateLetterContent, MAX_LETTER_LENGTH } from './validateLetter'

test('정상 본문은 통과한다', () => {
  expect(validateLetterContent('안녕')).toBe(true)
})

test('빈 문자열은 거절한다', () => {
  expect(validateLetterContent('')).toBe(false)
})

test('공백만 있으면 거절한다', () => {
  expect(validateLetterContent('   ')).toBe(false)
})

test('최대 길이(5000자)는 통과한다', () => {
  expect(validateLetterContent('가'.repeat(MAX_LETTER_LENGTH))).toBe(true)
})

test('최대 길이를 넘으면(5001자) 거절한다', () => {
  expect(validateLetterContent('가'.repeat(MAX_LETTER_LENGTH + 1))).toBe(false)
})

// 서버(letterSchema)는 trim하지 않은 원문 길이로 5000자 상한을 검사한다.
// trim한 길이는 5000 이하지만 앞뒤 공백까지 합친 원문 길이가 5000을 넘는 경우,
// 프론트가 이를 통과시키면 서버에서만 거절당해 원인 모를 전송 실패로 이어진다.
test('trim하면 5000자 이하지만 앞뒤 공백 포함 원문이 5000자를 넘으면 거절한다', () => {
  const padded = '  ' + '가'.repeat(MAX_LETTER_LENGTH) + '  '
  expect(validateLetterContent(padded)).toBe(false)
})
