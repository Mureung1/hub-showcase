import { describe, it, expect } from 'vitest'
import { MAX_LEVEL, MAX_TOTAL_XP, xpRequiredForLevel, getLevelProgress, applyStreakBonus } from './levelSystem.js'

describe('xpRequiredForLevel', () => {
  it('레벨 1->2는 10, 이후 레벨마다 10씩 증가한다', () => {
    expect(xpRequiredForLevel(1)).toBe(10)
    expect(xpRequiredForLevel(2)).toBe(20)
    expect(xpRequiredForLevel(3)).toBe(30)
    expect(xpRequiredForLevel(99)).toBe(990)
  })
})

describe('MAX_TOTAL_XP', () => {
  it('레벨 100(만렙) 도달에 필요한 누적 총 XP는 49500이다', () => {
    expect(MAX_TOTAL_XP).toBe(49500)
  })
})

describe('getLevelProgress', () => {
  it('0 XP는 레벨 1, 다음 레벨까지 10 필요', () => {
    expect(getLevelProgress(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 10, totalXp: 0, isMaxLevel: false })
  })

  it('레벨 경계 바로 아래(9)는 아직 레벨 1', () => {
    const p = getLevelProgress(9)
    expect(p.level).toBe(1)
    expect(p.xpIntoLevel).toBe(9)
  })

  it('정확히 레벨 경계(10)는 레벨 2로 올라간다', () => {
    const p = getLevelProgress(10)
    expect(p.level).toBe(2)
    expect(p.xpIntoLevel).toBe(0)
    expect(p.xpForNextLevel).toBe(20)
  })

  it('레벨 2 구간(10~29) 안에서는 레벨 2를 유지하고 진행치가 누적된다', () => {
    expect(getLevelProgress(29).level).toBe(2)
    expect(getLevelProgress(29).xpIntoLevel).toBe(19)
    expect(getLevelProgress(30).level).toBe(3)
    expect(getLevelProgress(30).xpIntoLevel).toBe(0)
  })

  it('만렙(MAX_TOTAL_XP)에서는 isMaxLevel true, xpForNextLevel null', () => {
    const p = getLevelProgress(MAX_TOTAL_XP)
    expect(p.level).toBe(MAX_LEVEL)
    expect(p.isMaxLevel).toBe(true)
    expect(p.xpForNextLevel).toBeNull()
    expect(p.xpIntoLevel).toBe(0)
  })

  it('만렙 초과분은 상한으로 클램프된다', () => {
    const p = getLevelProgress(MAX_TOTAL_XP + 100000)
    expect(p.totalXp).toBe(MAX_TOTAL_XP)
    expect(p.level).toBe(MAX_LEVEL)
  })

  it('음수는 0으로 클램프된다', () => {
    expect(getLevelProgress(-50)).toEqual({ level: 1, xpIntoLevel: 0, xpForNextLevel: 10, totalXp: 0, isMaxLevel: false })
  })

  it('소수는 내림 처리된다', () => {
    expect(getLevelProgress(10.9).level).toBe(2)
    expect(getLevelProgress(9.9).level).toBe(1)
  })

  it('손상된 값(NaN/undefined)은 0으로 안전하게 처리된다', () => {
    expect(getLevelProgress(NaN).level).toBe(1)
    expect(getLevelProgress(undefined).level).toBe(1)
  })
})

describe('applyStreakBonus', () => {
  it('스트릭이 임계값(기본 2일) 미만이면 보너스 없음', () => {
    expect(applyStreakBonus(20, 0)).toBe(20)
    expect(applyStreakBonus(20, 1)).toBe(20)
  })

  it('스트릭이 임계값 이상이면 10% 가산 후 반올림', () => {
    expect(applyStreakBonus(20, 2)).toBe(22)
    expect(applyStreakBonus(13, 3)).toBe(14) // 13*1.1=14.3 -> 14
  })

  it('임계값을 조정할 수 있다', () => {
    expect(applyStreakBonus(20, 2, { thresholdDays: 3 })).toBe(20)
    expect(applyStreakBonus(20, 3, { thresholdDays: 3 })).toBe(22)
  })

  it('0 이하이거나 유효하지 않은 baseXp는 0을 반환한다', () => {
    expect(applyStreakBonus(0, 5)).toBe(0)
    expect(applyStreakBonus(-10, 5)).toBe(0)
    expect(applyStreakBonus(NaN, 5)).toBe(0)
  })

  it('streakCurrent가 없거나 유효하지 않으면 보너스 없이 그대로 반환한다', () => {
    expect(applyStreakBonus(20, undefined)).toBe(20)
    expect(applyStreakBonus(20, NaN)).toBe(20)
  })
})
