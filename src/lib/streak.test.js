import { describe, it, expect } from 'vitest'
import { calcStreak } from './streak.js'

describe('calcStreak', () => {
  it('기록이 하나도 없으면 전부 0/false', () => {
    expect(calcStreak([], '2026-07-28')).toEqual({ current: 0, longest: 0, recordedToday: false })
  })

  it('오늘까지 3일 연속이면 current=3, recordedToday=true', () => {
    const result = calcStreak(['2026-07-26', '2026-07-27', '2026-07-28'], '2026-07-28')
    expect(result).toEqual({ current: 3, longest: 3, recordedToday: true })
  })

  it('오늘 미기록이어도 어제까지 이어졌으면 끊긴 것으로 세지 않는다(자정 전 유예)', () => {
    const result = calcStreak(['2026-07-26', '2026-07-27'], '2026-07-28')
    expect(result.recordedToday).toBe(false)
    expect(result.current).toBe(2)
  })

  it('하루라도 비면 그 이전 연속은 current에서 끊긴다', () => {
    // 7/24 기록 후 7/25 공백, 7/26~7/28 연속 — current는 최근 구간(3)만 센다.
    const result = calcStreak(['2026-07-24', '2026-07-26', '2026-07-27', '2026-07-28'], '2026-07-28')
    expect(result.current).toBe(3)
  })

  it('longest는 현재 연속과 무관하게 전체 구간 중 가장 긴 것을 찾는다', () => {
    // 과거에 5일 연속(7/1~7/5)이 있었지만 지금은 끊겨 있고, 최근엔 1일만 기록.
    const result = calcStreak(
      ['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-28'],
      '2026-07-28',
    )
    expect(result.current).toBe(1)
    expect(result.longest).toBe(5)
  })

  it('월 경계를 넘는 연속도 정확히 센다(로컬 Date 파싱이 아니라 정수 일련번호라 안전)', () => {
    const result = calcStreak(['2026-07-30', '2026-07-31', '2026-08-01'], '2026-08-01')
    expect(result.current).toBe(3)
  })

  it('중복 날짜 키가 섞여도 결과가 흔들리지 않는다', () => {
    const result = calcStreak(['2026-07-28', '2026-07-28', '2026-07-27'], '2026-07-28')
    expect(result.current).toBe(2)
  })

  it('입력 순서가 뒤죽박죽이어도(오래된 순 아님) 정확하다', () => {
    const result = calcStreak(['2026-07-28', '2026-07-26', '2026-07-27'], '2026-07-28')
    expect(result.current).toBe(3)
  })
})
