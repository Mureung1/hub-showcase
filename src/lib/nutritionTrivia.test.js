import { describe, it, expect } from 'vitest'
import { pickTodayTrivia } from './nutritionTrivia.js'

const POOL = [
  { id: 'a', category: 'vitaminC', question: '이 중 비타민C가 가장 많은 것은?', choices: ['레몬', '우유', '식초', '흰쌀밥'], correctIndex: 0 },
  { id: 'b', category: 'calcium', question: '이 중 칼슘이 가장 많은 것은?', choices: ['멸치', '닭가슴살', '사과', '흰쌀밥'], correctIndex: 0 },
  { id: 'c', category: 'protein', question: '이 중 단백질이 가장 많은 것은?', choices: ['계란', '수박', '오이', '식빵'], correctIndex: 0 },
]

describe('pickTodayTrivia', () => {
  it('같은 (userId, dateKey)면 항상 같은 문제와 같은 보기 순서를 반환한다', () => {
    const a = pickTodayTrivia(POOL, 'u1', '2026-07-29')
    const b = pickTodayTrivia(POOL, 'u1', '2026-07-29')
    expect(a).toEqual(b)
  })

  it('풀에 속한 문제만 고르고, 4개 보기 그대로 유지한다(순서만 바뀔 수 있음)', () => {
    const picked = pickTodayTrivia(POOL, 'u1', '2026-07-29')
    const source = POOL.find((t) => t.id === picked.id)
    expect(source).toBeDefined()
    expect(picked.choices).toHaveLength(4)
    expect(new Set(picked.choices)).toEqual(new Set(source.choices))
  })

  it('정답 인덱스가 실제로 정답 보기를 가리킨다', () => {
    const picked = pickTodayTrivia(POOL, 'u1', '2026-07-29')
    const source = POOL.find((t) => t.id === picked.id)
    expect(picked.choices[picked.correctIndex]).toBe(source.choices[source.correctIndex])
  })

  it('사용자가 다르면 대체로 다른 문제나 다른 보기 순서가 나온다', () => {
    const a = pickTodayTrivia(POOL, 'u1', '2026-07-29')
    const b = pickTodayTrivia(POOL, 'u2', '2026-07-29')
    expect(a).not.toEqual(b)
  })

  it('날짜가 다르면 대체로 다른 문제나 다른 보기 순서가 나온다', () => {
    const a = pickTodayTrivia(POOL, 'u1', '2026-07-29')
    const b = pickTodayTrivia(POOL, 'u1', '2026-07-30')
    expect(a).not.toEqual(b)
  })

  it('빈 풀이면 null을 반환한다', () => {
    expect(pickTodayTrivia([], 'u1', '2026-07-29')).toBeNull()
    expect(pickTodayTrivia(undefined, 'u1', '2026-07-29')).toBeNull()
  })
})
