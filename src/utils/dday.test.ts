import { describe, expect, it } from 'vitest'
import { getDdayClass } from './dday'

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
})
