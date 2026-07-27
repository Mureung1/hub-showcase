import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_FOOD_CATEGORY,
  FOOD_CATEGORIES,
  filterPlacesByCategory,
  getFoodCategory,
  getSelectedFoodCategory,
  matchesFoodCategory,
  setSelectedFoodCategory,
} from './foodCategory.js'

// 네이버 지역 검색이 돌려주는 모양(toPlaceShape를 거친 뒤)의 최소 조각
const place = (name, categoryName) => ({ place_name: name, category_name: categoryName })

describe('getFoodCategory', () => {
  it('키로 카테고리를 찾는다', () => {
    expect(getFoodCategory('korean').label).toBe('한식')
  })

  it('모르는 키/빈 값은 "전체"로 떨어진다 — 저장된 값이 깨져도 화면이 멈추지 않게', () => {
    expect(getFoodCategory('없는키').key).toBe('all')
    expect(getFoodCategory(undefined).key).toBe('all')
  })

  it('목록은 "전체"로 시작하고 기획서의 8개를 모두 담는다', () => {
    expect(FOOD_CATEGORIES[0].key).toBe(DEFAULT_FOOD_CATEGORY)
    expect(FOOD_CATEGORIES.map((c) => c.label)).toEqual([
      '전체',
      '한식',
      '중식',
      '일식',
      '양식',
      '분식',
      '아시안',
      '카페·디저트',
    ])
  })
})

describe('matchesFoodCategory', () => {
  it('"전체"는 카테고리 문자열과 무관하게 전부 통과시킨다', () => {
    expect(matchesFoodCategory('all', '중식>중국요리')).toBe(true)
    expect(matchesFoodCategory('all', '')).toBe(true)
  })

  it('네이버 카테고리 문자열의 상위/하위 분류 어디에 있어도 잡아낸다', () => {
    expect(matchesFoodCategory('korean', '한식>육류,고기요리')).toBe(true)
    expect(matchesFoodCategory('korean', '음식점>한식')).toBe(true)
    expect(matchesFoodCategory('cafe', '음식점>카페,디저트>베이커리')).toBe(true)
  })

  it('다른 종류는 걸러낸다 — "한식을 골랐는데 중국집이 나온다"를 막는 지점', () => {
    expect(matchesFoodCategory('korean', '중식>중국요리')).toBe(false)
    expect(matchesFoodCategory('japanese', '한식>국밥')).toBe(false)
  })

  it('카테고리 문자열이 비어 있으면(분류 없음) 특정 카테고리에는 넣지 않는다', () => {
    expect(matchesFoodCategory('korean', '')).toBe(false)
    expect(matchesFoodCategory('korean', undefined)).toBe(false)
  })
})

describe('filterPlacesByCategory', () => {
  const places = [
    place('진짜순대국', '한식>국밥'),
    place('홍콩반점', '중식>중국요리'),
    place('스시로', '일식>초밥,롤'),
  ]

  it('"전체"는 원본을 그대로 돌려준다', () => {
    expect(filterPlacesByCategory('all', places)).toBe(places)
  })

  it('고른 종류만 남긴다', () => {
    expect(filterPlacesByCategory('chinese', places).map((p) => p.place_name)).toEqual(['홍콩반점'])
  })

  it('맞는 게 하나도 없으면 빈 배열 — 호출부가 완화 재검색으로 넘어갈 수 있게', () => {
    expect(filterPlacesByCategory('bunsik', places)).toEqual([])
  })
})

describe('선택값 저장', () => {
  beforeEach(() => {
    localStorage.clear()
    setSelectedFoodCategory(DEFAULT_FOOD_CATEGORY)
  })

  it('고른 값을 다음에 읽을 수 있다', () => {
    setSelectedFoodCategory('japanese')
    expect(getSelectedFoodCategory()).toBe('japanese')
  })

  it('유효하지 않은 값을 넣어도 "전체"로 정규화된다', () => {
    setSelectedFoodCategory('없는키')
    expect(getSelectedFoodCategory()).toBe('all')
  })
})
