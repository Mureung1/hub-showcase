import { tasks } from '../data/tasks'
import type { Profile } from '../types'

// 날짜 계산에만 집중하는 최소 프로필
function profile(closureDate: string): Profile {
  return { industry: '서비스업', isCorporation: false, hasEmployee: false, isRented: false, closureDate }
}

// Date 객체 비교 시 타임존 문제를 피하기 위해 y/m/d로 분해
function ymd(date: Date) {
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() }
}

const closureReport   = tasks.find(t => t.id === 'business-closure-report')!   // +20일
const insuranceReport = tasks.find(t => t.id === 'insurance-loss-report')!     // +14일
const vatReturn       = tasks.find(t => t.id === 'vat-final-return')!          // 다음 달 25일
const incomeTaxReturn = tasks.find(t => t.id === 'income-tax-return')!         // 다음 해 5/31

// ─────────────────────────────────────────
// addDays — 폐업신고 +20일
// ─────────────────────────────────────────
describe('addDays — 폐업신고 +20일', () => {
  test('정상: 같은 달 안에서 끝남 (9/1 → 9/21)', () => {
    expect(ymd(closureReport.dueDate!(profile('2026-09-01')))).toEqual({ y: 2026, m: 9, d: 21 })
  })

  test('정상: 다른 달로 넘어감 (9/20 → 10/10)', () => {
    expect(ymd(closureReport.dueDate!(profile('2026-09-20')))).toEqual({ y: 2026, m: 10, d: 10 })
  })

  test('경계값: 12월 → 다음 해 1월 (12/20 → 1/9)', () => {
    expect(ymd(closureReport.dueDate!(profile('2026-12-20')))).toEqual({ y: 2027, m: 1, d: 9 })
  })

  test('경계값: 윤년 2월 (2028-02-10 → 3/1)', () => {
    expect(ymd(closureReport.dueDate!(profile('2028-02-10')))).toEqual({ y: 2028, m: 3, d: 1 })
  })

  test('경계값: 비윤년 2월 (2026-02-10 → 3/2)', () => {
    expect(ymd(closureReport.dueDate!(profile('2026-02-10')))).toEqual({ y: 2026, m: 3, d: 2 })
  })

  test('경계값: 월말 31일 (1/31 → 2/20)', () => {
    expect(ymd(closureReport.dueDate!(profile('2026-01-31')))).toEqual({ y: 2026, m: 2, d: 20 })
  })

  test('빈 값: 빈 문자열 → Invalid Date', () => {
    expect(closureReport.dueDate!(profile('')).getTime()).toBeNaN()
  })

  test('실패: 날짜 형식 아님 → Invalid Date', () => {
    expect(closureReport.dueDate!(profile('not-a-date')).getTime()).toBeNaN()
  })
})

// ─────────────────────────────────────────
// addDays — 4대보험 +14일
// ─────────────────────────────────────────
describe('addDays — 4대보험 +14일', () => {
  test('정상: 같은 달 안에서 끝남 (9/10 → 9/24)', () => {
    expect(ymd(insuranceReport.dueDate!(profile('2026-09-10')))).toEqual({ y: 2026, m: 9, d: 24 })
  })

  test('정상: 다른 달로 넘어감 (9/20 → 10/4)', () => {
    expect(ymd(insuranceReport.dueDate!(profile('2026-09-20')))).toEqual({ y: 2026, m: 10, d: 4 })
  })

  test('경계값: 12월 → 다음 해 1월 (12/25 → 1/8)', () => {
    expect(ymd(insuranceReport.dueDate!(profile('2026-12-25')))).toEqual({ y: 2027, m: 1, d: 8 })
  })

  test('빈 값: 빈 문자열 → Invalid Date', () => {
    expect(insuranceReport.dueDate!(profile('')).getTime()).toBeNaN()
  })
})

// ─────────────────────────────────────────
// next25thOfFollowingMonth — 부가세 마감일
// ─────────────────────────────────────────
describe('next25thOfFollowingMonth — 부가세: 다음 달 25일', () => {
  test('정상: 일반 달 (3/10 → 4/25)', () => {
    expect(ymd(vatReturn.dueDate!(profile('2026-03-10')))).toEqual({ y: 2026, m: 4, d: 25 })
  })

  test('정상: 월말 폐업 (9/30 → 10/25)', () => {
    expect(ymd(vatReturn.dueDate!(profile('2026-09-30')))).toEqual({ y: 2026, m: 10, d: 25 })
  })

  test('경계값: 11월 폐업 → 12/25', () => {
    expect(ymd(vatReturn.dueDate!(profile('2026-11-15')))).toEqual({ y: 2026, m: 12, d: 25 })
  })

  test('경계값: 12월 폐업 → 다음 해 1/25 ★', () => {
    expect(ymd(vatReturn.dueDate!(profile('2026-12-01')))).toEqual({ y: 2027, m: 1, d: 25 })
  })

  test('경계값: 12월 31일 폐업 → 다음 해 1/25', () => {
    expect(ymd(vatReturn.dueDate!(profile('2026-12-31')))).toEqual({ y: 2027, m: 1, d: 25 })
  })

  test('빈 값: 빈 문자열 → Invalid Date', () => {
    expect(vatReturn.dueDate!(profile('')).getTime()).toBeNaN()
  })
})

// ─────────────────────────────────────────
// may31OfNextYear — 종합소득세 마감일
// ─────────────────────────────────────────
describe('may31OfNextYear — 종합소득세: 다음 해 5/31', () => {
  test('정상: 연초 폐업 (2026/1/1 → 2027/5/31)', () => {
    expect(ymd(incomeTaxReturn.dueDate!(profile('2026-01-01')))).toEqual({ y: 2027, m: 5, d: 31 })
  })

  test('정상: 연말 폐업 (2026/12/31 → 2027/5/31)', () => {
    expect(ymd(incomeTaxReturn.dueDate!(profile('2026-12-31')))).toEqual({ y: 2027, m: 5, d: 31 })
  })

  test('정상: 중간 달 폐업 (2026/6/15 → 2027/5/31)', () => {
    expect(ymd(incomeTaxReturn.dueDate!(profile('2026-06-15')))).toEqual({ y: 2027, m: 5, d: 31 })
  })

  test('경계값: 폐업일이 이미 5/31 → 다음 해 5/31', () => {
    expect(ymd(incomeTaxReturn.dueDate!(profile('2026-05-31')))).toEqual({ y: 2027, m: 5, d: 31 })
  })

  test('경계값: 2025/11 폐업 → 2026/5/31', () => {
    expect(ymd(incomeTaxReturn.dueDate!(profile('2025-11-01')))).toEqual({ y: 2026, m: 5, d: 31 })
  })

  test('빈 값: 빈 문자열 → Invalid Date', () => {
    expect(incomeTaxReturn.dueDate!(profile('')).getTime()).toBeNaN()
  })
})
