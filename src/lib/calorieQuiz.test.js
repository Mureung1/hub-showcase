import { describe, it, expect } from 'vitest'
import { buildQuizChoices, pickTodayQuizFood } from './calorieQuiz.js'

const POOL = ['비빔밥', '김치찌개', '라면', '떡볶이']

describe('pickTodayQuizFood', () => {
  it('같은 (userId, dateKey)면 항상 같은 음식을 고른다', () => {
    expect(pickTodayQuizFood(POOL, 'u1', '2026-07-29')).toBe(pickTodayQuizFood(POOL, 'u1', '2026-07-29'))
  })

  it('풀에 속한 항목만 고른다', () => {
    const picked = pickTodayQuizFood(POOL, 'u1', '2026-07-29')
    expect(POOL).toContain(picked)
  })

  it('빈 풀이면 null을 반환한다', () => {
    expect(pickTodayQuizFood([], 'u1', '2026-07-29')).toBeNull()
    expect(pickTodayQuizFood(undefined, 'u1', '2026-07-29')).toBeNull()
  })
})

describe('buildQuizChoices', () => {
  const neighbors = [
    { name: '김치찌개', calories: 400 },
    { name: '된장찌개', calories: 390 },
  ]
  const farOptions = [
    { name: '치킨', calories: 900 },
    { name: '삼겹살', calories: 850 },
    { name: '떡볶이', calories: 700 },
    { name: '순대', calories: 650 },
  ]

  it('보기 4개(정답 1 + 오답 3)를 만들고 정답 인덱스를 정확히 가리킨다', () => {
    const result = buildQuizChoices(neighbors, farOptions, 'seed-1')
    expect(result.choices).toHaveLength(4)
    expect(result.choices[result.correctIndex]).toBe('김치찌개')
    // 오답 3개는 farOptions에서 왔고 정답과 겹치지 않는다.
    const wrongChoices = result.choices.filter((_, i) => i !== result.correctIndex)
    expect(wrongChoices.every((name) => farOptions.some((f) => f.name === name))).toBe(true)
    expect(new Set(result.choices).size).toBe(4)
  })

  it('같은 시드면 항상 같은 보기 순서가 나온다', () => {
    const a = buildQuizChoices(neighbors, farOptions, 'seed-1')
    const b = buildQuizChoices(neighbors, farOptions, 'seed-1')
    expect(a.choices).toEqual(b.choices)
    expect(a.correctIndex).toBe(b.correctIndex)
  })

  it('neighbors가 비었거나 farOptions가 3개 미만이면 null을 반환한다', () => {
    expect(buildQuizChoices([], farOptions, 'seed-1')).toBeNull()
    expect(buildQuizChoices(neighbors, farOptions.slice(0, 2), 'seed-1')).toBeNull()
    expect(buildQuizChoices(neighbors, null, 'seed-1')).toBeNull()
  })
})
