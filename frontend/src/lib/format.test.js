// format.js의 fmt/dateShort 단위 테스트.
// 이미 구현된 로직에 테스트를 붙이는 케이스라 red 없이 바로 통과를 확인한다.
import { test, expect } from 'vitest'
import { fmt, dateShort } from './format'

test('0초는 00:00:00', () => {
  expect(fmt(0)).toBe('00:00:00')
})

test('59초는 00:00:59', () => {
  expect(fmt(59)).toBe('00:00:59')
})

test('60초는 00:01:00 (분 자리 올림)', () => {
  expect(fmt(60)).toBe('00:01:00')
})

test('3600초는 01:00:00 (시 자리 올림)', () => {
  expect(fmt(3600)).toBe('01:00:00')
})

test('86400초(24시간)는 24:00:00 — 일 단위로 넘어가지 않는다', () => {
  expect(fmt(86400)).toBe('24:00:00')
})

test('소수점은 버림 처리된다', () => {
  expect(fmt(90.7)).toBe('00:01:30')
})

test('음수는 0으로 클램핑된다', () => {
  expect(fmt(-5)).toBe('00:00:00')
})

// dateShort는 new Date(isoString)으로 파싱 후 로컬 getFullYear/getMonth/getDate를 쓴다.
// 'Z' 없는(타임존 미지정) 문자열은 로컬 시간으로 해석되므로, 실행 환경의 타임존과
// 무관하게 항상 같은 결과가 나온다 — 그래서 아래처럼 'Z'를 빼고 테스트한다.
test('한 자리 월/일은 0으로 채워 YYYY.MM.DD로 표기한다', () => {
  expect(dateShort('2024-01-05T00:00:00')).toBe('2024.01.05')
})

test('두 자리 월/일도 그대로 YYYY.MM.DD로 표기한다', () => {
  expect(dateShort('2024-12-25T00:00:00')).toBe('2024.12.25')
})
