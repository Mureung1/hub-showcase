// server/data/foodDB.json(scripts/buildFoodDB.js가 생성한 실제 데이터)을 대상으로 한 lookupFood 검증.
// 목(mock) 없이 실제 산출물을 쓴다 — 이 모듈의 존재 이유가 "실제 DB에서 실제로 찾아지는지"라
// 목으로는 검증 의미가 없다. 그래서 특정 음식의 정확한 영양값 같은 깨지기 쉬운 수치는 단언하지
// 않고, "같은 항목으로 귀결되는지"/"찾아지는지 여부" 같은 안정적인 동작만 검증한다.
import { describe, it, expect } from 'vitest'
import { lookupFood, toFoodItemResponse } from './foodLookup.js'

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

  // 확정 동의어는 **판정이 아니라 정규화**로 처리한다(textNormalize.js의 MORPHEME_SYNONYMS).
  // 예전엔 "돈까스"가 편집거리 단계까지 흘러가 fuzzy로 겨우 걸렸는데, fuzzy는 신뢰 등급이 아니라
  // 유사도 재검증을 한 번 더 받아야 하고 그 과정에서 엉뚱한 음식이 끼어들 여지가 있었다.
  it('표기 흔들림(돈까스/돈가스, 계란/달걀)은 정규화로 흡수돼 exact가 된다', () => {
    for (const [query, expected] of [
      ['돈까스', '돈가스'],
      ['계란말이', '달걀말이'],
      ['김치찌게', '김치찌개'],
    ]) {
      const result = lookupFood(query)
      expect(result).not.toBeNull()
      expect(result.matchType).toBe('exact')
      expect(result.item.name).toBe(expected)
    }
  })

  it('편집거리 ≤2: 사전에 없는 순수 오타는 여전히 fuzzy로 구제된다', () => {
    const result = lookupFood('비빔밬')
    expect(result).not.toBeNull()
    expect(result.matchType).toBe('fuzzy')
    expect(result.item.name).toBe('비빔밥')
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
  it('lookupFood가 찾은 실제 항목을 /api/fooddb 응답 모양으로 바꾼다', () => {
    const { item } = lookupFood('비빔밥')
    const response = toFoodItemResponse(item)
    // 실제 DB 항목은 출처별 variants를 갖고 있어 대표값(급식 우선)과 식당 맥락 선택이 다를 수 있다 —
    // 모양만 검사하고, 어느 값이 뽑히는지는 아래 '출처 변형 선택' describe가 고정한다.
    expect(response).toEqual({
      name: item.name,
      baseQuantity: { value: 100, unit: 'g', raw: null },
      servSize: null,
      referenceServingGram: expect.anything(),
      foodSize: null,
      brand: null,
      nutrients: expect.any(Object),
    })
  })

  // 회귀 방지: 로컬 음식DB의 servingGram은 "일반적인 1인분"이지 포장 단위 같은 확정 근거가 아니다.
  // 이걸 servSize에 실으면 nutrition.js의 resolveConsumedGrams가 사진에서 추정한 실제 섭취량을
  // 덮어써서, 곱빼기로 먹었든 반만 먹었든 전부 표준 1인분으로 뭉개진다.
  it('로컬 DB의 1인분은 servSize가 아니라 referenceServingGram으로 나간다', () => {
    const { item } = lookupFood('비빔밥')
    expect(toFoodItemResponse(item).servSize).toBeNull()
  })

  it('servingGram이 없는 항목은 referenceServingGram을 null로 채운다', () => {
    const response = toFoodItemResponse({ name: '테스트', nutrientsPer100: { calories: 100 } })
    expect(response.referenceServingGram).toBeNull()
  })

  // 다출처 보존 재빌드(variants[]) 이후의 계약 — 같은 음식이라도 식당 맥락에선 외식 출처를,
  // 학식·급식 맥락에선 급식 출처를 골라야 한다. variants가 없는 구형 스냅샷은 대표값으로 폴백한다.
  describe('출처 변형 선택', () => {
    const item = {
      name: '돼지갈비구이',
      servingGram: 180,
      nutrientsPer100: { calories: 132 },
      variants: [
        { originCode: '6', servingGram: 180, nutrientsPer100: { calories: 132 } },
        { originCode: '3', servingGram: 200, nutrientsPer100: { calories: 294 } },
      ],
    }

    it('restaurant 맥락은 외식 출처를 고른다', () => {
      const response = toFoodItemResponse(item, 'restaurant')
      expect(response.nutrients.calories).toBe(294)
      expect(response.referenceServingGram).toBe(200)
    })

    it('cafeteria 맥락은 급식 출처를 고른다', () => {
      const response = toFoodItemResponse(item, 'cafeteria')
      expect(response.nutrients.calories).toBe(132)
      expect(response.referenceServingGram).toBe(180)
    })

    it('variants가 없으면 대표값을 그대로 쓴다(구형 스냅샷 하위 호환)', () => {
      const legacy = { name: '비빔밥', servingGram: 500, nutrientsPer100: { calories: 171 } }
      expect(toFoodItemResponse(legacy, 'restaurant').nutrients.calories).toBe(171)
      expect(toFoodItemResponse(legacy, 'restaurant').referenceServingGram).toBe(500)
    })
  })
})
