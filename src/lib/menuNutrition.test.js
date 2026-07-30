// 식당·메뉴 추천 expected 보강(menuNutrition.js) 규칙 테스트.
// 통합 해석 엔진 호출(/api/resolve-food)만 모킹하고 환산·보정 로직은 실제 코드를 그대로 태운다.
//
// 캐싱·인플라이트 중복제거·연결실패 쿨다운을 검증하던 테스트들은 여기서 사라졌다 — 그 책임이
// 전부 서버(server/proxy.js의 lookupFoodSafety, server/nutrition/resolveFood.js)로 옮겨갔기
// 때문이다. 이 모듈은 이제 "해석 결과를 받아 expected에 반영"하는 일만 한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clampExpectedForItems, enrichExpectedFromDB } from './menuNutrition.js'
import { resolveFoodItems } from './resolveFood.js'

vi.mock('./resolveFood.js', () => ({ resolveFoodItems: vi.fn() }))

// 서버가 돌려주는 해석 결과 한 건의 모양.
function resolved(name, per100 = {}, servingGram = 500) {
  return {
    matchedName: name,
    match: {
      name,
      baseQuantity: { value: 100, unit: 'g', raw: '100g' },
      servSize: null,
      foodSize: null,
      brand: null,
      nutrients: { calories: 120, protein: 2, fat: 3, carbs: 18, fiber: null, sodium: 250, ...per100 },
    },
    source: '식약처DB',
    matchType: 'exact',
    confidence: 'high',
    assumedServing: false,
    servingGram,
  }
}

function unmatched() {
  return { matchedName: null, match: null, source: '추정', matchType: null, confidence: 'low', assumedServing: false, servingGram: null }
}

beforeEach(() => {
  vi.mocked(resolveFoodItems).mockReset()
})

describe('clampExpectedForItems (1단계 — 현실 범위 보정)', () => {
  it('짜장면 단백질 40g → 표준 1인분 상한(16g)으로 보정', () => {
    const items = [{ representativeMenu: '짜장면', expected: { protein: 40 } }]
    const [out] = clampExpectedForItems(items, (i) => i.representativeMenu)
    expect(out.expected.protein).toBe(16)
  })

  it('테이블에 없는 메뉴·expected 없는 항목은 원본 그대로', () => {
    const noTable = { representativeMenu: '정체불명음식', expected: { protein: 99 } }
    const noExpected = { representativeMenu: '짜장면' }
    const out = clampExpectedForItems([noTable, noExpected], (i) => i.representativeMenu)
    expect(out[0].expected.protein).toBe(99)
    expect(out[1]).toBe(noExpected)
  })
})

describe('enrichExpectedFromDB (2단계 — 통합 해석 엔진 보강)', () => {
  it('매칭 성공: 100g값 × 표준 1인분으로 환산해 expected를 대체하고 expectedSource=db', async () => {
    vi.mocked(resolveFoodItems).mockResolvedValue([resolved('국밥', { protein: 5, sodium: 400 }, 500)])
    const items = [{ representativeMenu: '국밥', expected: { protein: 10, fiber: 3 } }]
    const [out] = await enrichExpectedFromDB(items, (i) => i.representativeMenu)

    expect(out.expectedSource).toBe('db')
    expect(out.expected.protein).toBe(25) // 5 × 500/100
    expect(out.expected.fiber).toBe(3) // DB에 없는 키(null)는 AI 값 유지
    expect(out.expected.sodium).toBe(2000) // 400×5=2000 — 국밥 상한(2900)의 1.5배 이내라 유지
  })

  it('매칭 없음: 보정된 AI 추정 유지 + expectedSource=ai', async () => {
    vi.mocked(resolveFoodItems).mockResolvedValue([unmatched()])
    const items = [{ representativeMenu: '감자탕', expected: { protein: 30 } }]
    const [out] = await enrichExpectedFromDB(items, (i) => i.representativeMenu)

    expect(out.expectedSource).toBe('ai')
    expect(out.expected).toEqual({ protein: 30 })
  })

  it('표준 1인분 무게를 모르면 DB 수치를 쓰지 않는다(100g 환산 근거 없음)', async () => {
    vi.mocked(resolveFoodItems).mockResolvedValue([{ ...resolved('수제버거플래터', { protein: 9 }), servingGram: null }])
    const items = [{ representativeMenu: '수제버거플래터', expected: { protein: 35 } }]
    const [out] = await enrichExpectedFromDB(items, (i) => i.representativeMenu)

    expect(out.expectedSource).toBe('ai')
    expect(out.expected).toEqual({ protein: 35 })
  })

  it('일부만 매칭돼도 나머지는 정상 보강한다(부분 실패 허용)', async () => {
    vi.mocked(resolveFoodItems).mockResolvedValue([unmatched(), resolved('갈비탕', { protein: 4 }, 600)])
    const items = [
      { representativeMenu: '설렁탕', expected: { protein: 20 } },
      { representativeMenu: '갈비탕', expected: { protein: 20 } },
    ]
    const out = await enrichExpectedFromDB(items, (i) => i.representativeMenu)

    expect(out[0].expectedSource).toBe('ai')
    expect(out[0].expected).toEqual({ protein: 20 })
    expect(out[1].expectedSource).toBe('db')
    expect(out[1].expected.protein).toBe(24) // 4 × 600/100
  })

  // 이 개편의 핵심 — 예전엔 메뉴 수만큼 순차 조회했다.
  it('메뉴가 여럿이어도 해석 요청은 한 번만 나간다', async () => {
    vi.mocked(resolveFoodItems).mockResolvedValue([resolved('돈까스', { protein: 10 }, 200), resolved('비빔밥', { protein: 3 }, 500)])
    const items = [
      { representativeMenu: '돈까스', expected: { protein: 1 } },
      { representativeMenu: '비빔밥', expected: { protein: 2 } },
    ]
    const out = await enrichExpectedFromDB(items, (i) => i.representativeMenu)

    expect(vi.mocked(resolveFoodItems)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(resolveFoodItems).mock.calls[0][0]).toHaveLength(2)
    expect(out[0].expected.protein).toBe(20) // 10 × 200/100
  })

  it('해석 대상이 없으면(대표 메뉴·expected 없음) 요청 자체를 보내지 않는다', async () => {
    const items = [{ representativeMenu: null, expected: { protein: 5 } }, { representativeMenu: '김밥' }]
    const out = await enrichExpectedFromDB(items, (i) => i.representativeMenu)

    expect(vi.mocked(resolveFoodItems)).not.toHaveBeenCalled()
    expect(out).toBe(items)
  })
})
