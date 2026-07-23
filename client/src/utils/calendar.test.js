import { test, expect } from 'vitest'
import { buildMonthGrid } from './calendar'

test('정상 케이스: 2026년 7월은 수요일 시작, 31일까지 채운다', () => {
  const cells = buildMonthGrid(2026, 6) // month는 0부터 시작, 6=7월

  const leadingNulls = cells.slice(0, 3)
  expect(leadingNulls.every((cell) => cell === null)).toBe(true)
  expect(cells.length).toBe(3 + 31)
  expect(cells[3]).toEqual({ day: 1, dateKey: '2026-07-01' })
  expect(cells[cells.length - 1]).toEqual({ day: 31, dateKey: '2026-07-31' })
})

test('경계값: 1일이 일요일이면 앞에 null이 없다', () => {
  const cells = buildMonthGrid(2026, 1) // 2026년 2월 1일 = 일요일

  expect(cells[0]).toEqual({ day: 1, dateKey: '2026-02-01' })
})

test('경계값: 1일이 토요일이면 앞에 null이 6개다', () => {
  const cells = buildMonthGrid(2026, 7) // 2026년 8월 1일 = 토요일

  const leadingNulls = cells.slice(0, 6)
  expect(leadingNulls.every((cell) => cell === null)).toBe(true)
  expect(cells[6]).toEqual({ day: 1, dateKey: '2026-08-01' })
})

test('경계값: 평년 2월은 28일까지다', () => {
  const cells = buildMonthGrid(2026, 1)
  const dayCells = cells.filter((cell) => cell !== null)

  expect(dayCells.length).toBe(28)
  expect(dayCells[dayCells.length - 1]).toEqual({ day: 28, dateKey: '2026-02-28' })
})

test('경계값: 윤년 2월은 29일까지다', () => {
  const cells = buildMonthGrid(2024, 1)
  const dayCells = cells.filter((cell) => cell !== null)

  expect(dayCells.length).toBe(29)
  expect(dayCells[dayCells.length - 1]).toEqual({ day: 29, dateKey: '2024-02-29' })
})

test('실패/경계: month=12처럼 범위 밖 값은 다음 해 1월로 자동 보정된다', () => {
  const cells = buildMonthGrid(2026, 12)
  const dayCells = cells.filter((cell) => cell !== null)

  expect(dayCells.length).toBe(31)
  expect(dayCells[0]).toEqual({ day: 1, dateKey: '2027-01-01' })
})
