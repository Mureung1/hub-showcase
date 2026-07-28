// 100점 배점표(칼로리 40 / 단백질·탄수화물·지방 각 10 / 나트륨 30) 고정 테스트.
// 핵심 보장: breakdown 각 행 points 합계 === calcScore(불일치 시 배점 로직 버그),
// 칼로리는 90~110%에서 만점(경계 포함), 나트륨은 상한형이라 방향이 반대.
import { describe, it, expect } from 'vitest'
import { calcScore, getScoreBreakdown, SCORE_WEIGHTS } from './nutritionScore.js'

const TARGET = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

describe('getScoreBreakdown / calcScore', () => {
  it('만점 케이스: 칼로리 적정 구간·모든 목표 달성·나트륨 한도 이내 → 100점', () => {
    const actual = { calories: 2000, protein: 60, carbs: 300, fat: 60, sodium: 2000 }
    expect(calcScore(actual, TARGET)).toBe(100)
  })

  it('0점 케이스: 아무것도 안 먹었지만 나트륨만 한도의 3배 → 0점', () => {
    const actual = { calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 6000 }
    expect(calcScore(actual, TARGET)).toBe(0)
  })

  it('경계값: 칼로리 정확히 110%면 여전히 만점(적정 구간 상한 포함)', () => {
    const rows = getScoreBreakdown({ calories: 2200, protein: 0, carbs: 0, fat: 0, sodium: 0 }, TARGET)
    const calorieRow = rows.find((r) => r.key === 'calories')
    expect(calorieRow.points).toBe(SCORE_WEIGHTS.calories)
  })

  it('경계값: 칼로리 111%부터는 만점 밖(감점 시작)', () => {
    const rows = getScoreBreakdown({ calories: 2220, protein: 0, carbs: 0, fat: 0, sodium: 0 }, TARGET)
    const calorieRow = rows.find((r) => r.key === 'calories')
    expect(calorieRow.points).toBeLessThan(SCORE_WEIGHTS.calories)
  })

  it('경계값: 달성률 정확히 70%면 배점의 70%를 받는다', () => {
    const rows = getScoreBreakdown({ calories: 0, protein: 42, carbs: 0, fat: 0, sodium: 0 }, TARGET)
    const proteinRow = rows.find((r) => r.key === 'protein')
    expect(proteinRow.points).toBe(7) // 10점 만점의 70%
  })

  it('나트륨 초과 시 한도 대비 초과 비율만큼 감점된다(160% 섭취 → 40%만 획득)', () => {
    const rows = getScoreBreakdown({ calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 3200 }, TARGET)
    const sodiumRow = rows.find((r) => r.key === 'sodium')
    expect(sodiumRow.points).toBe(Math.round(SCORE_WEIGHTS.sodium * 0.4))
  })

  it('나트륨을 한도보다 적게 먹으면(0 포함) 항상 만점', () => {
    const rows = getScoreBreakdown({ calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 500 }, TARGET)
    const sodiumRow = rows.find((r) => r.key === 'sodium')
    expect(sodiumRow.points).toBe(SCORE_WEIGHTS.sodium)
  })

  it('나트륨이 한도를 살짝 넘어 반올림하면 만점이어도 기준 문구는 "이내" 라고 하지 않는다', () => {
    // 코드 리뷰에서 발견: points는 반올림 때문에 30(만점)이 나올 수 있어도, 실제로는 한도를
    // 넘었으므로(2001 > 2000) 문구가 "이내로 섭취했어요"면 안 된다.
    const rows = getScoreBreakdown({ calories: 0, protein: 0, carbs: 0, fat: 0, sodium: 2001 }, TARGET)
    const sodiumRow = rows.find((r) => r.key === 'sodium')
    expect(sodiumRow.points).toBe(SCORE_WEIGHTS.sodium)
    expect(sodiumRow.criterion).not.toContain('이내로 섭취했어요')
  })

  it('breakdown의 points 합계가 항상 calcScore와 정확히 같다', () => {
    const actual = { calories: 1500, protein: 30, carbs: 200, fat: 90, sodium: 2600 }
    const rows = getScoreBreakdown(actual, TARGET)
    const sum = rows.reduce((s, r) => s + r.points, 0)
    expect(calcScore(actual, TARGET)).toBe(sum)
  })

  it('배점 합계는 항상 100(칼로리 40 + 단백질·탄수화물·지방 각 10 + 나트륨 30)', () => {
    expect(SCORE_WEIGHTS.calories + SCORE_WEIGHTS.protein + SCORE_WEIGHTS.carbs + SCORE_WEIGHTS.fat + SCORE_WEIGHTS.sodium).toBe(100)
  })

  it('target이 전부 없으면(프로필 미입력) null', () => {
    expect(calcScore({ calories: 100 }, {})).toBeNull()
    expect(getScoreBreakdown({ calories: 100 }, {})).toEqual([])
  })

  it('food(fiber)는 배점에 포함되지 않는다', () => {
    const rows = getScoreBreakdown({ calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 0, sodium: 2000 }, TARGET)
    expect(rows.map((r) => r.key)).not.toContain('fiber')
    expect(rows).toHaveLength(5)
  })
})
