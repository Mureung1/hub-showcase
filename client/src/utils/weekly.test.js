import { test, expect } from 'vitest'
import { filterCheckinsInWeek } from './weekly'

test('기준일이 속한 주(월~일) 안의 기록만 남긴다', () => {
  const checkins = [
    { id: 1, createdAt: '2026-07-22T10:00:00' }, // 이번 주 수요일
    { id: 2, createdAt: '2026-07-19T10:00:00' }, // 지난주 일요일
  ]

  const result = filterCheckinsInWeek(checkins, '2026-07-23T00:00:00') // 기준일: 목요일

  expect(result.map((c) => c.id)).toEqual([1])
})

test('경계값: 주의 시작(월요일 00:00)은 포함, 다음 주 시작은 제외', () => {
  const checkins = [
    { id: 1, createdAt: '2026-07-20T00:00:00' }, // 이번 주 월요일 00:00
    { id: 2, createdAt: '2026-07-27T00:00:00' }, // 다음 주 월요일 00:00
  ]

  const result = filterCheckinsInWeek(checkins, '2026-07-23T00:00:00')

  expect(result.map((c) => c.id)).toEqual([1])
})

test('빈 배열이면 빈 배열을 반환한다', () => {
  expect(filterCheckinsInWeek([], '2026-07-23T00:00:00')).toEqual([])
})
