import { NO_DEADLINE_DDAY } from '@hub/shared'
import { describe, expect, it } from 'vitest'
import { getDdayClass, getDdayLabel } from './dday'

describe('getDdayClass', () => {
  it('경계값 7일은 urgent로 분류한다', () => {
    expect(getDdayClass(7)).toBe('dday-urgent')
  })

  it('경계값 8일은 soon으로 분류한다', () => {
    expect(getDdayClass(8)).toBe('dday-soon')
  })

  it('경계값 14일은 soon으로 분류한다', () => {
    expect(getDdayClass(14)).toBe('dday-soon')
  })

  it('경계값 15일은 normal로 분류한다', () => {
    expect(getDdayClass(15)).toBe('dday-normal')
  })

  it('마감일(0일)은 urgent로 분류한다', () => {
    expect(getDdayClass(0)).toBe('dday-urgent')
  })

  it('마감이 지난 음수 dday도 urgent로 분류한다', () => {
    expect(getDdayClass(-3)).toBe('dday-urgent')
  })

  it('NO_DEADLINE_DDAY(상시/소진시까지)는 flexible로 분류한다', () => {
    expect(getDdayClass(NO_DEADLINE_DDAY)).toBe('dday-flexible')
  })
})

describe('getDdayLabel', () => {
  it('일반 dday는 D-{숫자} 형식을 반환한다', () => {
    expect(getDdayLabel({ dday: 5, deadline: '2026-08-01' })).toBe('D-5')
  })

  it('NO_DEADLINE_DDAY면 원문 deadline 텍스트를 그대로 반환한다', () => {
    expect(
      getDdayLabel({ dday: NO_DEADLINE_DDAY, deadline: '예산 소진시까지' }),
    ).toBe('예산 소진시까지')
  })
})
