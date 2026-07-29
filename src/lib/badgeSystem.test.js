import { describe, it, expect } from 'vitest'
import { BADGES, evaluateBadges, getBadgeDex } from './badgeSystem.js'

function ctx(overrides = {}) {
  return {
    streakCurrent: 0,
    level: 1,
    totalClaimedQuestCount: 0,
    countsByQuestId: {},
    ...overrides,
  }
}

describe('evaluateBadges', () => {
  it('조건을 만족한 뱃지만 반환한다', () => {
    const result = evaluateBadges(ctx({ streakCurrent: 3 }), [])
    expect(result.map((b) => b.id)).toEqual(['streak-3'])
  })

  it('스트릭 3종은 각 임계값에서만 개별적으로 걸린다', () => {
    expect(evaluateBadges(ctx({ streakCurrent: 7 }), []).map((b) => b.id)).toEqual(['streak-3', 'streak-7'])
    expect(evaluateBadges(ctx({ streakCurrent: 30 }), []).map((b) => b.id)).toEqual(['streak-3', 'streak-7', 'streak-30'])
  })

  it('레벨 3종', () => {
    expect(evaluateBadges(ctx({ level: 10 }), []).map((b) => b.id)).toEqual(['level-10'])
    expect(evaluateBadges(ctx({ level: 100 }), []).map((b) => b.id)).toEqual(['level-10', 'level-30', 'level-100'])
  })

  it('퀘스트 누적 2종', () => {
    expect(evaluateBadges(ctx({ totalClaimedQuestCount: 10 }), []).map((b) => b.id)).toEqual(['quest-10'])
    expect(evaluateBadges(ctx({ totalClaimedQuestCount: 50 }), []).map((b) => b.id)).toEqual(['quest-10', 'quest-50'])
  })

  it('nutrition-master: 단백질+나트륨 퀘스트 합산 20회 이상', () => {
    expect(evaluateBadges(ctx({ countsByQuestId: { 'protein-80': 10, 'sodium-in-limit': 9 } }), [])).toEqual([])
    expect(
      evaluateBadges(ctx({ countsByQuestId: { 'protein-80': 10, 'sodium-in-limit': 10 } }), []).map((b) => b.id),
    ).toEqual(['nutrition-master'])
  })

  it('이미 unlocked인 뱃지는 조건을 다시 만족해도 반환하지 않는다(중복 방지)', () => {
    const result = evaluateBadges(ctx({ streakCurrent: 3 }), ['streak-3'])
    expect(result).toEqual([])
  })

  it('조건을 아무 것도 만족하지 않으면 빈 배열', () => {
    expect(evaluateBadges(ctx(), [])).toEqual([])
  })
})

describe('getBadgeDex', () => {
  it('전체 뱃지 목록에 unlocked 여부만 붙여 반환한다(조건 재평가 없이 저장값만 신뢰)', () => {
    const dex = getBadgeDex(['streak-3', 'level-100'])
    expect(dex).toHaveLength(BADGES.length)
    expect(dex.find((b) => b.id === 'streak-3').unlocked).toBe(true)
    expect(dex.find((b) => b.id === 'level-100').unlocked).toBe(true)
    expect(dex.find((b) => b.id === 'streak-7').unlocked).toBe(false)
  })

  it('unlockedIds를 생략하면 전부 잠김 상태', () => {
    const dex = getBadgeDex()
    expect(dex.every((b) => b.unlocked === false)).toBe(true)
  })
})
