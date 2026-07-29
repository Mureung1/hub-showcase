import { describe, it, expect } from 'vitest'
import { diversifyByCategory } from './placeDiversity.js'

// category_name은 foodCategory.js의 match 토큰을 포함해야 그 계열로 분류된다(한식: '한식', 중식:
// '중식', 양식: '양식' 등). road_address_name은 place_url이 없을 때 identity 계산에 쓰인다.
function mkPlace(name, { category = '', distance = 0, target = null } = {}) {
  return { place_name: name, road_address_name: `${name}주소`, category_name: category, distance, matchedTarget: target }
}

describe('diversifyByCategory', () => {
  it('후보 수가 targetCount 이하면 원본을 그대로(순서까지) 반환한다', () => {
    const candidates = [mkPlace('a', { distance: 10 }), mkPlace('b', { distance: 5 })]
    const result = diversifyByCategory(candidates, { targetCount: 5 })
    expect(result).toBe(candidates)
  })

  it('빈 배열이면 빈 배열을 반환한다', () => {
    expect(diversifyByCategory([], { targetCount: 5 })).toEqual([])
  })

  it('서로 다른 matchedTarget이 targetCount개 이상이면 1단계 고정 픽만으로 채워진다', () => {
    const candidates = [
      mkPlace('단백질집', { category: '한식', distance: 100, target: 'protein' }),
      mkPlace('식이섬유집', { category: '양식', distance: 200, target: 'fiber' }),
      mkPlace('탄수화물집', { category: '중식', distance: 300, target: 'carbs' }),
      mkPlace('지방집', { category: '일식', distance: 400, target: 'fat' }),
    ]
    const result = diversifyByCategory(candidates, { targetCount: 3 })
    expect(result).toHaveLength(3)
    expect(result.every((p) => p.matchedTarget)).toBe(true)
    expect(new Set(result.map((p) => p.matchedTarget)).size).toBe(3)
  })

  it('전부 같은 계열이어도 다양성 없이 targetCount는 채운다', () => {
    const candidates = Array.from({ length: 8 }, (_, i) => mkPlace(`한식${i}`, { category: '한식', distance: i * 10 }))
    const result = diversifyByCategory(candidates, { targetCount: 5 })
    expect(result).toHaveLength(5)
  })

  it('여러 계열에 충분한 후보가 있으면 어느 계열도 상한(cap)을 넘지 않는다', () => {
    const candidates = [
      ...Array.from({ length: 4 }, (_, i) => mkPlace(`한식${i}`, { category: '한식', distance: 10 + i })),
      ...Array.from({ length: 3 }, (_, i) => mkPlace(`중식${i}`, { category: '중식', distance: 20 + i })),
      ...Array.from({ length: 3 }, (_, i) => mkPlace(`양식${i}`, { category: '양식', distance: 30 + i })),
    ]
    const result = diversifyByCategory(candidates, { targetCount: 5 })
    expect(result).toHaveLength(5)
    const counts = {}
    for (const p of result) {
      const bucket = p.category_name
      counts[bucket] = (counts[bucket] || 0) + 1
    }
    // cap = ceil(5 / 3버킷) = 2 — 충분한 공급이 있으므로 실제로 지켜져야 한다.
    expect(Object.values(counts).every((n) => n <= 2)).toBe(true)
    expect(Object.keys(counts).length).toBeGreaterThan(1)
  })

  it('matchedTarget이 전부 없어도(무결핍 상황) 계열 라운드로빈만으로 채운다', () => {
    const candidates = [
      mkPlace('한식', { category: '한식', distance: 10 }),
      mkPlace('중식', { category: '중식', distance: 20 }),
      mkPlace('양식', { category: '양식', distance: 30 }),
      mkPlace('분식', { category: '분식', distance: 40 }),
    ]
    const result = diversifyByCategory(candidates, { targetCount: 3 })
    expect(result).toHaveLength(3)
  })

  it('category_name이 없거나 빈 후보도 "기타" 버킷으로 분류돼 누락되지 않는다', () => {
    const candidates = [
      mkPlace('한식', { category: '한식', distance: 10 }),
      mkPlace('분류없음', { category: '', distance: 20 }),
      mkPlace('중식', { category: '중식', distance: 30 }),
    ]
    const result = diversifyByCategory(candidates, { targetCount: 2 })
    expect(result).toHaveLength(2)
    expect(result.some((p) => p.place_name === '분류없음')).toBe(true)
  })

  it('1단계 고정 픽은 거리가 멀어도 결과 배열의 앞쪽에 온다', () => {
    const candidates = [
      mkPlace('가까운한식', { category: '한식', distance: 5 }),
      mkPlace('먼단백질집', { category: '중식', distance: 900, target: 'protein' }),
      mkPlace('가까운양식', { category: '양식', distance: 15 }),
    ]
    const result = diversifyByCategory(candidates, { targetCount: 2 })
    expect(result).toHaveLength(2)
    expect(result[0].place_name).toBe('먼단백질집')
  })
})
