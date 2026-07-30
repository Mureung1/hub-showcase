import { describe, it, expect } from 'vitest'
import { windowAroundMe } from './leaderboardWindow.js'

function rows(n) {
  return Array.from({ length: n }, (_, i) => ({ rank: i + 1, nickname: `u${i + 1}` }))
}

describe('windowAroundMe', () => {
  it('내 순위를 중심으로 radius만큼 앞뒤 랭크만 골라낸다', () => {
    const result = windowAroundMe(rows(30), 23, 2)
    expect(result.map((r) => r.rank)).toEqual([21, 22, 23, 24, 25])
  })

  it('내 순위가 맨 앞이면 범위를 벗어나는 랭크는 그냥 없다(음수 랭크 없음)', () => {
    const result = windowAroundMe(rows(10), 1, 2)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('내 순위가 맨 뒤면 뒤쪽 범위가 자연히 잘린다', () => {
    const result = windowAroundMe(rows(10), 10, 2)
    expect(result.map((r) => r.rank)).toEqual([8, 9, 10])
  })

  it('meRank가 없으면(0 이하) 빈 배열', () => {
    expect(windowAroundMe(rows(10), 0)).toEqual([])
    expect(windowAroundMe(rows(10), undefined)).toEqual([])
  })

  it('radius 기본값은 2다', () => {
    const result = windowAroundMe(rows(30), 15)
    expect(result.map((r) => r.rank)).toEqual([13, 14, 15, 16, 17])
  })
})
