// 식당·메뉴 추천 expected 보강(menuNutrition.js) 규칙 테스트.
// 네트워크(searchFoodDB)만 모킹하고 매칭·환산·보정 로직은 실제 코드를 그대로 태운다.
// 주의: menuCache가 모듈 수준이라 테스트마다 서로 다른 메뉴명을 써서 캐시 간섭을 피한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { clampExpectedForItems, enrichExpectedFromDB } from './menuNutrition.js'
import { searchFoodDB } from './fooddb.js'

vi.mock('./fooddb.js', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, searchFoodDB: vi.fn() }
})

function dbRecord(name, per100 = {}) {
  return {
    name,
    baseQuantity: { value: 100, unit: 'g', raw: '100g' },
    servSize: null,
    foodSize: null,
    brand: null,
    nutrients: { calories: 120, protein: 2, fat: 3, carbs: 18, fiber: null, sodium: 250, ...per100 },
  }
}

beforeEach(() => {
  vi.mocked(searchFoodDB).mockReset()
})

describe('clampExpectedForItems (1단계 — 현실 범위 보정)', () => {
  it('짜장면 단백질 40g → 표준 1인분 상한(16g)으로 보정', () => {
    const items = [{ representativeMenu: '짜장면', expected: { protein: 40 } }]
    const [out] = clampExpectedForItems(items, (i) => i.representativeMenu)
    expect(out.expected.protein).toBe(16)
  })

  it('테이블에 없는 메뉴·expected 없는 항목은 원본 그대로', () => {
    const noTable = { representativeMenu: '괴식샐러드볼', expected: { protein: 99 } }
    const noExpected = { representativeMenu: '짜장면' }
    const out = clampExpectedForItems([noTable, noExpected], (i) => i.representativeMenu)
    expect(out[0].expected.protein).toBe(99)
    expect(out[1]).toBe(noExpected)
  })
})

describe('enrichExpectedFromDB (2단계 — 식약처 DB 보강)', () => {
  it('DB 매칭 성공: 100g값 × 표준 1인분으로 환산해 expected를 대체하고 expectedSource=db', async () => {
    // 국밥 referenceGrams=500 → 100g당 protein 5 → 25g
    vi.mocked(searchFoodDB).mockResolvedValue([dbRecord('국밥', { protein: 5, sodium: 400 })])
    const items = [{ representativeMenu: '국밥', expected: { protein: 10, fiber: 3 } }]
    const [out] = await enrichExpectedFromDB(items, (i) => i.representativeMenu)
    expect(out.expectedSource).toBe('db')
    expect(out.expected.protein).toBe(25) // DB 기반 (5 × 500/100)
    expect(out.expected.fiber).toBe(3) // DB에 없는 키(null)는 AI 값 유지
    expect(out.expected.sodium).toBe(2000) // 400×5=2000 — 국밥 상한(2900)의 1.5배 이내라 유지
  })

  it('DB 결과 없음: 보정된 AI 추정 유지 + expectedSource=ai', async () => {
    vi.mocked(searchFoodDB).mockResolvedValue([])
    const items = [{ representativeMenu: '감자탕', expected: { protein: 30 } }]
    const [out] = await enrichExpectedFromDB(items, (i) => i.representativeMenu)
    expect(out.expectedSource).toBe('ai')
    expect(out.expected).toEqual({ protein: 30 })
  })

  it('네트워크 오류: 해당 메뉴만 AI 유지, 다른 메뉴는 정상 보강 (부분 실패 허용)', async () => {
    vi.mocked(searchFoodDB).mockImplementation(async (term) => {
      if (term === '설렁탕') throw new Error('boom')
      return [dbRecord('갈비탕', { protein: 4 })]
    })
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

  it('같은 메뉴명은 캐시로 한 번만 조회한다', async () => {
    vi.mocked(searchFoodDB).mockResolvedValue([dbRecord('비빔밥', { protein: 3 })])
    const items = [{ name: '비빔밥', expected: { protein: 1 } }]
    await enrichExpectedFromDB(items, (i) => i.name)
    const callsAfterFirst = vi.mocked(searchFoodDB).mock.calls.length
    await enrichExpectedFromDB(items, (i) => i.name)
    expect(vi.mocked(searchFoodDB).mock.calls.length).toBe(callsAfterFirst) // 추가 호출 없음
  })

  it('표준 1인분 무게를 모르는 메뉴는 DB 조회 없이 AI 유지 (100g 환산 오류 방지)', async () => {
    const items = [{ representativeMenu: '수제버거플래터', expected: { protein: 35 } }]
    const [out] = await enrichExpectedFromDB(items, (i) => i.representativeMenu)
    expect(vi.mocked(searchFoodDB)).not.toHaveBeenCalled()
    expect(out.expected).toEqual({ protein: 35 })
  })

  it('같은 배치의 동일 대표 메뉴는 in-flight 중복 없이 한 번만 조회한다', async () => {
    vi.mocked(searchFoodDB).mockResolvedValue([dbRecord('돈까스', { protein: 10 })])
    const items = [
      { representativeMenu: '돈까스', expected: { protein: 1 } },
      { representativeMenu: '돈까스', expected: { protein: 2 } },
    ]
    const out = await enrichExpectedFromDB(items, (i) => i.representativeMenu)
    expect(vi.mocked(searchFoodDB).mock.calls.length).toBe(1)
    expect(out[0].expectedSource).toBe('db')
    expect(out[1].expectedSource).toBe('db')
    expect(out[0].expected.protein).toBe(20) // 10 × 200/100
  })

  // 주의: 이 테스트는 모듈 수준 쿨다운(fooddbDownUntil)을 세팅하므로 반드시 파일의 마지막에 둔다 —
  // 이후 테스트가 있으면 DB 보강이 통째로 건너뛰어져 실패한다.
  it('식약처 연결 실패(FOODDB_CONNECTION_FAILED): 전 항목 AI 유지, 오류로 죽지 않는다', async () => {
    vi.mocked(searchFoodDB).mockImplementation(async () => {
      const err = new Error('식약처 API 서버에 연결할 수 없습니다')
      err.code = 'FOODDB_CONNECTION_FAILED'
      throw err
    })
    const items = [
      { representativeMenu: '냉면', expected: { protein: 12 } },
      { representativeMenu: '우동', expected: { protein: 11 } },
    ]
    const out = await enrichExpectedFromDB(items, (i) => i.representativeMenu)
    expect(out.every((i) => i.expectedSource === 'ai')).toBe(true)
    expect(out[0].expected).toEqual({ protein: 12 })
  })
})
