import { describe, it, expect } from 'vitest'

import { formatStars } from './format.js'

describe('formatStars', () => {
  it('1000 미만은 그대로 문자열화한다', () => {
    expect(formatStars(5)).toBe('5')
    expect(formatStars(250)).toBe('250')
  })

  it('1000 이상은 k 단위로 축약한다', () => {
    expect(formatStars(1500)).toBe('1.5k')
    expect(formatStars(64200)).toBe('64.2k')
  })

  it('0은 그대로 "0"이다', () => {
    expect(formatStars(0)).toBe('0')
  })

  it('999는 k 단위로 전환되지 않는다', () => {
    expect(formatStars(999)).toBe('999')
  })

  it('1000은 k 단위로 전환되고 .0은 제거된다', () => {
    expect(formatStars(1000)).toBe('1k')
    expect(formatStars(2000)).toBe('2k')
  })

  it('toFixed(1) 반올림 경계를 따른다', () => {
    expect(formatStars(1050)).toBe('1.1k')
    expect(formatStars(1049)).toBe('1k')
  })

  it('비정상 입력은 현재 구현의 실제 동작을 그대로 따른다 (검증 없음, 스냅샷 목적)', () => {
    expect(formatStars(undefined)).toBe('NaNk')
    expect(formatStars(null)).toBe('null')
    expect(formatStars(-5)).toBe('-5')
    expect(formatStars(NaN)).toBe('NaNk')
  })
})
