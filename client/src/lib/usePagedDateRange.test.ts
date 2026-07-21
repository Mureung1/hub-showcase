import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { format, addDays, parseISO } from 'date-fns'
import type { ScheduleSlot } from 'shared'
import { usePagedDateRange } from './usePagedDateRange.ts'

function makeSlots(startDate: string, days: number): ScheduleSlot[] {
  return Array.from({ length: days }, (_, i) => ({
    date: format(addDays(parseISO(startDate), i), 'yyyy-MM-dd'),
    time: '09:00',
  }))
}

describe('usePagedDateRange', () => {
  it('정확히 7일 범위면 1페이지이고 다음 이동이 불가능하다', () => {
    const { result } = renderHook(() => usePagedDateRange(makeSlots('2026-07-01', 7)))

    expect(result.current.visibleDates).toHaveLength(7)
    expect(result.current.visibleDates[0]).toBe('2026-07-01')
    expect(result.current.visibleDates[6]).toBe('2026-07-07')
    expect(result.current.canGoPrev).toBe(false)
    expect(result.current.canGoNext).toBe(false)
  })

  it('8일 범위면 2페이지이고 마지막 페이지는 1일이다', () => {
    const { result } = renderHook(() => usePagedDateRange(makeSlots('2026-07-01', 8)))

    expect(result.current.canGoNext).toBe(true)
    act(() => result.current.goNext())

    expect(result.current.visibleDates).toEqual(['2026-07-08'])
    expect(result.current.canGoNext).toBe(false)
    expect(result.current.canGoPrev).toBe(true)
  })

  it('14일 범위면 정확히 2페이지로 나뉜다', () => {
    const { result } = renderHook(() => usePagedDateRange(makeSlots('2026-07-01', 14)))

    act(() => result.current.goNext())

    expect(result.current.visibleDates).toHaveLength(7)
    expect(result.current.visibleDates[0]).toBe('2026-07-08')
    expect(result.current.visibleDates[6]).toBe('2026-07-14')
    expect(result.current.canGoNext).toBe(false)
  })

  it('15일 범위면 세 번째 페이지에 1일만 남는다', () => {
    const { result } = renderHook(() => usePagedDateRange(makeSlots('2026-07-01', 15)))

    act(() => result.current.goNext())
    act(() => result.current.goNext())

    expect(result.current.visibleDates).toEqual(['2026-07-15'])
    expect(result.current.canGoNext).toBe(false)
    expect(result.current.canGoPrev).toBe(true)
  })

  it('이전 페이지로 돌아가면 첫 페이지에서 다시 이전 이동이 불가능해진다', () => {
    const { result } = renderHook(() => usePagedDateRange(makeSlots('2026-07-01', 14)))

    act(() => result.current.goNext())
    act(() => result.current.goPrev())

    expect(result.current.visibleDates[0]).toBe('2026-07-01')
    expect(result.current.canGoPrev).toBe(false)
  })

  it('slots의 날짜 범위 자체가 바뀌면 pageStartDate가 새 첫 날짜로 리셋된다', () => {
    const { result, rerender } = renderHook(({ slots }) => usePagedDateRange(slots), {
      initialProps: { slots: makeSlots('2026-07-01', 14) },
    })

    act(() => result.current.goNext())
    expect(result.current.visibleDates[0]).toBe('2026-07-08')

    rerender({ slots: makeSlots('2026-08-01', 7) })

    expect(result.current.visibleDates[0]).toBe('2026-08-01')
    expect(result.current.visibleDates).toHaveLength(7)
  })

  it('slots 배열 참조만 바뀌고 날짜 범위 내용이 같으면 페이지가 유지된다', () => {
    // claude: useScheduleResponse/useScheduleResult가 매 렌더링마다 candidateSlots를 새로 생성하는 상황을 재현 -
    // 배열 참조가 아니라 firstDate/lastDate로 리셋을 판단해야 하는 이유를 검증하는 회귀 테스트.
    const { result, rerender } = renderHook(({ slots }) => usePagedDateRange(slots), {
      initialProps: { slots: makeSlots('2026-07-01', 14) },
    })

    act(() => result.current.goNext())
    expect(result.current.visibleDates[0]).toBe('2026-07-08')

    rerender({ slots: makeSlots('2026-07-01', 14) })

    expect(result.current.visibleDates[0]).toBe('2026-07-08')
  })
})
