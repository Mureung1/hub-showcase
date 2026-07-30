import { describe, it, expect } from 'vitest'
import { compareTwoPlaces } from './placeDuel.js'

describe('compareTwoPlaces', () => {
  it('나트륨(limit형)은 더 적은 쪽이 승리한다', () => {
    const result = compareTwoPlaces({ sodium: 800 }, { sodium: 1200 }, {})
    const row = result.rows.find((r) => r.key === 'sodium')
    expect(row.winner).toBe('A')
  })

  it('단백질(target형)은 오늘 남은 부족분을 더 많이 채우는 쪽이 승리한다', () => {
    // 권장 60g, 이미 20g 섭취 → 남은 40g. A는 30g 제공(30만큼 채움), B는 50g 제공(40으로 캡).
    const result = compareTwoPlaces(
      { protein: 30 },
      { protein: 50 },
      { todayTotal: { protein: 20 }, recommended: { protein: 60 } },
    )
    const row = result.rows.find((r) => r.key === 'protein')
    expect(row.winner).toBe('B')
  })

  it('부족분을 초과하는 양은 승패에 영향을 주지 않는다(캡 적용)', () => {
    // 남은 10g인데 A=15g, B=100g — 둘 다 10으로 캡되어 무승부.
    const result = compareTwoPlaces(
      { protein: 15 },
      { protein: 100 },
      { todayTotal: { protein: 50 }, recommended: { protein: 60 } },
    )
    const row = result.rows.find((r) => r.key === 'protein')
    expect(row.winner).toBe('tie')
  })

  it('이미 충분히 채운 영양소는 적게 추가되는 쪽이 승리한다(과식 방지)', () => {
    const result = compareTwoPlaces(
      { protein: 10 },
      { protein: 40 },
      { todayTotal: { protein: 70 }, recommended: { protein: 60 } },
    )
    const row = result.rows.find((r) => r.key === 'protein')
    expect(row.winner).toBe('A')
  })

  it('한쪽에만 값이 있는 영양소는 비교에서 제외된다', () => {
    const result = compareTwoPlaces({ protein: 30, sodium: 500 }, { protein: 20 }, {})
    expect(result.rows.map((r) => r.key)).toEqual(['protein'])
  })

  it('전체 승자는 승리한 항목이 더 많은 쪽이다', () => {
    const result = compareTwoPlaces(
      { protein: 40, sodium: 500, fiber: 10 },
      { protein: 20, sodium: 800, fiber: 5 },
      { todayTotal: {}, recommended: { protein: 60, fiber: 25 } },
    )
    expect(result.overallWinner).toBe('A')
  })

  it('승리 항목 수가 같으면 무승부다', () => {
    const result = compareTwoPlaces({ sodium: 500 }, { sodium: 500 }, {})
    expect(result.overallWinner).toBe('tie')
  })

  it('비교 가능한 영양소가 없으면 rows가 비고 무승부다', () => {
    const result = compareTwoPlaces({}, {}, {})
    expect(result.rows).toEqual([])
    expect(result.overallWinner).toBe('tie')
  })
})
