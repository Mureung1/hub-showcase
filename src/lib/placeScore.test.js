import { describe, it, expect } from 'vitest'
import { calcFulfillmentRatio, calcPlaceScore } from './placeScore.js'

const DEFICIENT_ROWS = [
  { key: 'protein', label: '단백질', unit: 'g', recommended: 60, actual: 20, deficiency: 40, ratio: 0.33 },
  { key: 'fiber', label: '식이섬유', unit: 'g', recommended: 25, actual: 10, deficiency: 15, ratio: 0.4 },
]

describe('calcFulfillmentRatio', () => {
  it('부족량을 완전히 채우면 1이다', () => {
    expect(calcFulfillmentRatio({ protein: 40 }, [DEFICIENT_ROWS[0]])).toBe(1)
  })

  it('절반만 채우면 0.5다', () => {
    expect(calcFulfillmentRatio({ protein: 20 }, [DEFICIENT_ROWS[0]])).toBe(0.5)
  })

  it('부족량보다 많이 채워도 1을 넘지 않는다(clamp)', () => {
    expect(calcFulfillmentRatio({ protein: 999 }, [DEFICIENT_ROWS[0]])).toBe(1)
  })

  it('여러 부족 영양소는 숫자로 채워진 것들만 평균을 낸다', () => {
    // protein 40/40=1, fiber 0/15=0 → 평균 0.5
    expect(calcFulfillmentRatio({ protein: 40, fiber: 0 }, DEFICIENT_ROWS)).toBe(0.5)
  })

  it('expected에 아예 없는 키(숫자 아님)는 0으로 취급하지 않고 평균에서 제외한다', () => {
    // fiber 키가 expected에 없음 — "이 메뉴는 식이섬유를 0g 준다"가 아니라 "모른다"로 취급.
    // protein만 평균에 반영되므로 1.
    expect(calcFulfillmentRatio({ protein: 40 }, DEFICIENT_ROWS)).toBe(1)
  })

  it('expected/deficientRows가 없으면 0이다', () => {
    expect(calcFulfillmentRatio(null, DEFICIENT_ROWS)).toBe(0)
    expect(calcFulfillmentRatio({ protein: 40 }, [])).toBe(0)
  })

  it('일치하는 키가 없으면 0이다', () => {
    expect(calcFulfillmentRatio({ calories: 500 }, DEFICIENT_ROWS)).toBe(0)
  })
})

describe('calcPlaceScore', () => {
  it('영양 충족 100% + 거리 0m(최단) → 100점 근처', () => {
    const score = calcPlaceScore({ expected: { protein: 40 }, deficientRows: [DEFICIENT_ROWS[0]], distance: 0, maxDistance: 3000 })
    expect(score).toBe(100)
  })

  it('영양 충족 0% + 최장거리 → 0점', () => {
    const score = calcPlaceScore({ expected: {}, deficientRows: DEFICIENT_ROWS, distance: 3000, maxDistance: 3000 })
    expect(score).toBe(0)
  })

  it('가중치 합은 항상 1이다(0~100 범위를 벗어나지 않는지 간접 확인)', () => {
    const score = calcPlaceScore({ expected: { protein: 40 }, deficientRows: [DEFICIENT_ROWS[0]], distance: 3000, maxDistance: 3000 })
    // 영양 100% + 거리 0% → 0.7*1 + 0.3*0 = 0.7 → 70점
    expect(score).toBe(70)
  })

  it('거리가 검색 반경을 넘어도(음수 근접도) 0 밑으로 내려가지 않는다', () => {
    const score = calcPlaceScore({ expected: {}, deficientRows: [], distance: 5000, maxDistance: 3000 })
    expect(score).toBe(0)
  })

  it('maxDistance가 0이어도 예외 없이 처리한다', () => {
    expect(() => calcPlaceScore({ expected: {}, deficientRows: [], distance: 100, maxDistance: 0 })).not.toThrow()
  })
})
