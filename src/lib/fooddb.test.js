// pickBestFoodMatch / foodNameSimilarity 매칭 규칙 고정 테스트.
// 핵심 보장: ① 정확 일치(공백 무시) 우선 ② 접두 수식어 변형("돌솥비빔밥")은 통과
// ③ 접미 파생("라면땅")은 탈락해 다음 폴백으로 넘어간다 ④ 음식DB 다건 정확 일치는 평균.
import { describe, it, expect } from 'vitest'
import { FOOD_MATCH_SIMILARITY_THRESHOLD, foodNameSimilarity, pickBestFoodMatch } from './fooddb.js'

function record(name, nutrients = {}) {
  return {
    name,
    baseQuantity: { value: 100, unit: 'g', raw: '100g' },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: { calories: 100, protein: 5, fat: 3, carbs: 15, fiber: 1, sodium: 300, ...nutrients },
  }
}

describe('foodNameSimilarity', () => {
  it('동일 이름(공백 무시)은 1', () => {
    expect(foodNameSimilarity('비빔밥', '비빔밥')).toBe(1)
    expect(foodNameSimilarity('돌솥비빔밥', '돌솥 비빔밥')).toBe(1)
  })

  it('접두 수식어 변형(핵심 음식명이 뒤)은 기준값 이상 — 같은 음식', () => {
    for (const [a, b] of [
      ['비빔밥', '돌솥비빔밥'],
      ['비빔밥', '산채비빔밥'],
      ['김치찌개', '참치김치찌개'],
      ['라면', '신라면'],
      ['짜장면', '삼선짜장면'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeGreaterThanOrEqual(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  it('접미 파생(다른 음식으로 이어지는 이름)은 기준값 미만 — 다른 음식', () => {
    for (const [a, b] of [
      ['라면', '라면땅'],
      ['김밥', '김밥천국도시락'],
      ['떡볶이', '떡볶이맛과자'],
    ]) {
      expect(foodNameSimilarity(a, b)).toBeLessThan(FOOD_MATCH_SIMILARITY_THRESHOLD)
    }
  })

  it('무관한 이름은 0', () => {
    expect(foodNameSimilarity('라면', '샐러드')).toBe(0)
    expect(foodNameSimilarity('', '라면')).toBe(0)
  })
})

describe('pickBestFoodMatch', () => {
  it('빈 결과는 null', () => {
    expect(pickBestFoodMatch([], '라면')).toBeNull()
    expect(pickBestFoodMatch(null, '라면')).toBeNull()
  })

  it('정확 일치가 있으면 그것을 쓴다', () => {
    const exact = record('라면')
    expect(pickBestFoodMatch([record('라면땅'), exact], '라면')).toBe(exact)
  })

  it('공백만 다른 등록 표기("돌솥 비빔밥")도 정확 일치로 취급한다', () => {
    const spaced = record('돌솥 비빔밥')
    expect(pickBestFoodMatch([spaced], '돌솥비빔밥')).toBe(spaced)
  })

  it('음식DB(averageExactMatches): 정확 일치 다건이면 100g 기준 평균 — 기존 동작 유지', () => {
    const results = [record('비빔밥', { protein: 4 }), record('비빔밥', { protein: 6 })]
    const picked = pickBestFoodMatch(results, '비빔밥', { averageExactMatches: true })
    expect(picked.nutrients.protein).toBe(5)
    expect(picked.baseQuantity.value).toBe(100)
  })

  it('가공식품DB(기본): 정확 일치 다건이어도 평균 내지 않고 첫 항목 — 기존 동작 유지', () => {
    const first = record('신라면', { protein: 4 })
    const picked = pickBestFoodMatch([first, record('신라면', { protein: 6 })], '신라면')
    expect(picked).toBe(first)
  })

  it('정확 일치가 없어도 접두 수식어 변형이면 채택한다', () => {
    const variant = record('돌솥비빔밥')
    expect(pickBestFoodMatch([variant], '비빔밥')).toBe(variant)
  })

  it('정확 일치가 없고 접미 파생("라면땅")뿐이면 null — 다음 폴백 단계로 넘긴다', () => {
    expect(pickBestFoodMatch([record('라면땅')], '라면')).toBeNull()
    expect(pickBestFoodMatch([record('김밥천국도시락')], '김밥')).toBeNull()
  })

  it('후보가 여럿이면 유사도가 가장 높은 것을 고른다', () => {
    const closer = record('산채비빔밥')
    const farther = record('전주식산채비빔밥')
    expect(pickBestFoodMatch([farther, closer], '비빔밥')).toBe(closer)
  })
})
