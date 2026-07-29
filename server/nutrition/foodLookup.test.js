// server/data/foodDB.json(scripts/buildFoodDB.js가 생성한 실제 데이터)을 대상으로 한 lookupFood 검증.
// 목(mock) 없이 실제 산출물을 쓴다 — 이 모듈의 존재 이유가 "실제 DB에서 실제로 찾아지는지"라
// 목으로는 검증 의미가 없다. 그래서 특정 음식의 정확한 영양값 같은 깨지기 쉬운 수치는 단언하지
// 않고, "같은 항목으로 귀결되는지"/"찾아지는지 여부" 같은 안정적인 동작만 검증한다.
import { describe, it, expect } from 'vitest'
import { findByCaloriesNear, listByCategory, lookupFood, toFoodItemResponse } from './foodLookup.js'

describe('lookupFood', () => {
  it('완전일치: 정규화된 이름이 DB에 그대로 있으면 exact로 찾는다', () => {
    const result = lookupFood('김치찌개')
    expect(result).not.toBeNull()
    expect(result.matchType).toBe('exact')
    expect(result.item.name).toBe('김치찌개')
    expect(result.item.category).toBe('soup')
  })

  it('오탈자 "김치찌게"와 수식어가 붙은 "돼지김치찌개"는 "김치찌개"와 같은 항목으로 귀결된다', () => {
    const base = lookupFood('김치찌개')
    const typo = lookupFood('김치찌게')
    const withModifier = lookupFood('돼지김치찌개')

    expect(typo?.item.name).toBe(base.item.name)
    expect(withModifier?.item.name).toBe(base.item.name)
  })

  it('부분포함: DB에 없는 수식어 조합도 접미사로 더 구체적인 항목을 찾는다(긴 이름 우선)', () => {
    const result = lookupFood('간장고등어구이')
    expect(result).not.toBeNull()
    expect(result.matchType).toBe('partial')
    expect(result.item.name).toBe('고등어구이')
  })

  it('편집거리 ≤2: "돈까스"는 DB의 "돈가스" 표기와 fuzzy로 매칭된다', () => {
    const result = lookupFood('돈까스')
    expect(result).not.toBeNull()
    expect(result.matchType).toBe('fuzzy')
  })

  it('존재하지 않는 메뉴는 null을 반환한다', () => {
    expect(lookupFood('존재하지않는이상한음식XYZ123')).toBeNull()
  })

  it('빈 문자열/공백/undefined는 null을 반환한다', () => {
    expect(lookupFood('')).toBeNull()
    expect(lookupFood('   ')).toBeNull()
    expect(lookupFood(undefined)).toBeNull()
  })

  it('모든 항목이 6주차 §0 스키마(카테고리·영양소)를 갖춘다', () => {
    const result = lookupFood('비빔밥')
    expect(result.item).toMatchObject({
      name: expect.any(String),
      category: expect.any(String),
      nutrientsPer100: {
        calories: expect.any(Number),
      },
    })
  })
})

// FR-8 — /api/fooddb의 local-fuzzy 폴백이 쓰는 응답 모양 변환. 식약처 실시간 API 응답
// (normalizeFoodItem, server/proxy.js)과 같은 필드 이름을 써야 findFoodMatch(Analyze.jsx)의
// 나머지 로직이 출처를 몰라도 동일하게 동작한다.
describe('toFoodItemResponse', () => {
  it('lookupFood가 찾은 실제 항목을 기존 /api/fooddb 응답 모양으로 바꾼다', () => {
    const { item } = lookupFood('비빔밥')
    const response = toFoodItemResponse(item)
    expect(response).toEqual({
      name: item.name,
      baseQuantity: 100,
      servSize: item.servingGram ?? null,
      foodSize: null,
      brand: null,
      nutrients: item.nutrientsPer100,
    })
  })

  it('servingGram이 없는 항목은 servSize를 null로 채운다', () => {
    const response = toFoodItemResponse({ name: '테스트', nutrientsPer100: { calories: 100 } })
    expect(response.servSize).toBeNull()
  })
})

// FR-17 — 식단 퀴즈용 1인분 칼로리 근접/원거리 후보 검색.
describe('findByCaloriesNear', () => {
  it('존재하는 음식의 1인분 칼로리 기준 근접/원거리 후보를 반환한다', () => {
    const result = findByCaloriesNear('비빔밥')
    expect(result).not.toBeNull()
    expect(result.targetFood).toBe('비빔밥')
    expect(result.targetCalories).toBeGreaterThan(0)
    expect(Array.isArray(result.neighbors)).toBe(true)
    expect(Array.isArray(result.farOptions)).toBe(true)
  })

  it('foodData.js에 검증된 칼로리 범위가 있으면 그 중앙값을 목표 칼로리로 쓴다(DB 원본 서빙량을 신뢰하지 않음)', () => {
    // foodData.js: 비빔밥 plausible.calories = [550, 700] → 중앙값 625
    const result = findByCaloriesNear('비빔밥')
    expect(result.targetCalories).toBe(625)
  })

  it('neighbors는 목표 칼로리와 tolerance 이내다', () => {
    const result = findByCaloriesNear('비빔밥', { toleranceRatio: 0.15 })
    for (const n of result.neighbors) {
      expect(Math.abs(n.calories - result.targetCalories)).toBeLessThanOrEqual(result.targetCalories * 0.15 + 1)
    }
  })

  it('farOptions는 목표 칼로리와 충분히 멀다', () => {
    const result = findByCaloriesNear('비빔밥', { toleranceRatio: 0.15 })
    for (const f of result.farOptions) {
      expect(Math.abs(f.calories - result.targetCalories)).toBeGreaterThan(result.targetCalories * 0.15 * 3 - 1)
    }
  })

  it('검증된 칼로리 범위가 없는 음식은 DB 서빙량 기반 값으로 폴백한다', () => {
    // foodData.js: 김치찌개는 찌개류 편차 문제로 plausible.calories가 의도적으로 비어 있음.
    const result = findByCaloriesNear('김치찌개')
    expect(result).not.toBeNull()
    expect(result.targetCalories).toBeGreaterThan(0)
  })

  it('존재하지 않는 음식은 null을 반환한다', () => {
    expect(findByCaloriesNear('존재하지않는이상한음식XYZ123')).toBeNull()
  })
})

// FR-19 — 커스텀 조합 빌더용 카테고리별 재료 목록.
describe('listByCategory', () => {
  it('해당 카테고리의 항목만 돌려준다(soup 카테고리에 김치찌개가 포함된다)', () => {
    const list = listByCategory('soup', { limit: 500 })
    expect(list.length).toBeGreaterThan(0)
    expect(list.some((item) => item.name === '김치찌개')).toBe(true)
  })

  it('q로 이름을 좁힐 수 있다', () => {
    const list = listByCategory('soup', { q: '김치찌개', limit: 500 })
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((item) => item.name.includes('김치찌개'))).toBe(true)
  })

  it('limit로 개수를 제한한다', () => {
    const list = listByCategory('soup', { limit: 2 })
    expect(list.length).toBeLessThanOrEqual(2)
  })

  it('존재하지 않는 카테고리는 빈 배열을 반환한다', () => {
    expect(listByCategory('없는카테고리')).toEqual([])
  })
})
