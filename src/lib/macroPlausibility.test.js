// 단백질·지방 현실성 보정 규칙 고정 테스트.
//
// 이 파일이 지키는 핵심 둘:
//  ① AI 추정치의 비현실적인 값은 눌린다(200kcal짜리 반찬에 단백질 40g은 물리적으로 불가능하다).
//  ② **DB 실측값과 검증된 음식은 절대 건드리지 않는다** — 식약처 DB 11,255건 전수 조사 결과
//     단백질 에너지비 35% 초과가 5.5%, 지방 50% 초과가 5.0%였고 전부 진짜 값이었다
//     (가자미찜 단백질 60%, 갈비구이_돼지고기 지방 65%). 여기에 캡을 걸면 정답을 망가뜨린다.
import { describe, it, expect } from 'vitest'
import { capEstimatedMacros, correctMealMacros } from './macroPlausibility.js'

const sum = (items, key) => items.reduce((s, it) => s + (it.nutrients[key] ?? 0), 0)

describe('capEstimatedMacros — 항목 단위(AI 추정치 전용)', () => {
  // 200kcal에 단백질 40g이면 단백질만으로 160kcal다. 남는 40kcal로 탄수·지방을 다 낼 수 없다.
  it('열량 대비 불가능한 단백질·지방을 현실 범위로 눌러 담는다', () => {
    const out = capEstimatedMacros({ calories: 200, protein: 40, carbs: 5, fat: 20, fiber: 1, sodium: 400 }, { foodName: '정체불명반찬' })
    expect(out.protein).toBeGreaterThan(10)
    expect(out.protein).toBeLessThan(20) // KDRI 상한(20%)~점근상한(35%) 사이로 착지
    expect(out.fat).toBeLessThan(20)
  })

  it('열량은 고정하고 줄어든 만큼 탄수화물이 흡수한다', () => {
    const out = capEstimatedMacros({ calories: 200, protein: 40, carbs: 5, fat: 20 }, { foodName: '정체불명반찬' })
    expect(out.calories).toBe(200)
    expect(out.carbs).toBeGreaterThan(5)
  })

  it('DB 실측값(isEstimate=false)은 손대지 않는다', () => {
    const dbValue = { calories: 200, protein: 40, carbs: 5, fat: 20 }
    expect(capEstimatedMacros(dbValue, { foodName: '정체불명반찬', isEstimate: false })).toEqual(dbValue)
  })

  // 삼겹살 지방 범위는 foodData에 등록돼 있다 — 우리가 확인한 근거가 일반 규칙보다 우선한다.
  it('foodData가 검증한 음식의 그 영양소는 건드리지 않는다', () => {
    const out = capEstimatedMacros({ calories: 500, protein: 30, carbs: 2, fat: 45 }, { foodName: '삼겹살' })
    expect(out.fat).toBe(45)
  })

  it('현실 범위 안의 값은 그대로 둔다', () => {
    const normal = { calories: 400, protein: 18, carbs: 50, fat: 12, fiber: 3, sodium: 600 }
    expect(capEstimatedMacros(normal, { foodName: '정체불명반찬' })).toEqual(normal)
  })

  it('순서는 보존된다 — 더 많이 먹은 쪽이 보정 후에도 더 많다', () => {
    const a = capEstimatedMacros({ calories: 200, protein: 45, carbs: 5, fat: 5 }, { foodName: '정체불명반찬' })
    const b = capEstimatedMacros({ calories: 200, protein: 60, carbs: 5, fat: 5 }, { foodName: '정체불명반찬' })
    expect(b.protein).toBeGreaterThan(a.protein)
  })

  it('열량이 없으면 판정하지 않는다', () => {
    const noKcal = { calories: 0, protein: 40, carbs: 5, fat: 20 }
    expect(capEstimatedMacros(noKcal, { foodName: '정체불명반찬' })).toEqual(noKcal)
  })
})

describe('correctMealMacros — 한 끼 단위', () => {
  const tray = (items) => items.map(([name, source, calories, protein, fat]) => ({ name, source, nutrients: { calories, protein, fat, carbs: 10, fiber: 1, sodium: 100 } }))

  it('정상적인 한 끼는 전혀 건드리지 않고 원본 배열을 그대로 돌려준다', () => {
    const normal = tray([
      ['쌀밥', '식약처DB', 250, 5, 0.5],
      ['미역국', '식약처DB', 60, 4, 2],
      ['돼지갈비찜', '식약처DB', 280, 18, 10],
    ])
    const out = correctMealMacros(normal)
    expect(out.corrections).toEqual({})
    expect(out.items).toBe(normal) // 참조까지 동일 — 불필요한 재계산이 없다
  })

  // 실측 사고 재현: 판 전체가 과대추정되면 에너지비는 정상인데 절대량만 비현실적이다.
  // 그래서 에너지비 캡만으로는 못 잡고 절대량 캡이 필요하다.
  it('한 끼 단백질이 현실 한계를 넘으면 낮춘다', () => {
    const out = correctMealMacros(
      tray([
        ['쌀밥', '식약처DB', 300, 6, 1],
        ['창작주찬', '추정', 350, 22, 24],
        ['창작반찬', '추정', 220, 20, 14],
        ['수제디저트', '추정', 151, 12, 8],
      ]),
    )
    expect(out.corrections.protein).toBeTruthy()
    expect(sum(out.items, 'protein')).toBeLessThan(60)
    expect(sum(out.items, 'protein')).toBeGreaterThan(40) // 0으로 뭉개지 않는다
  })

  it('근거가 약한 항목(AI 추정)부터 깎고 DB 실측값은 최대한 남긴다', () => {
    const out = correctMealMacros(
      tray([
        ['쌀밥', '식약처DB', 300, 6, 1],
        ['창작주찬', '추정', 350, 22, 24],
        ['창작반찬', '추정', 220, 20, 14],
        ['수제디저트', '추정', 151, 12, 8],
      ]),
    )
    expect(out.items[0].nutrients.protein).toBe(6) // 식약처DB 항목은 그대로
    expect(out.items[1].nutrients.protein).toBeLessThan(22) // 추정 항목이 깎였다
  })

  it('단백질·지방을 덜어낸 만큼 열량도 함께 줄인다 — Atwater 정합 유지', () => {
    const before = tray([
      ['창작주찬', '추정', 350, 30, 24],
      ['창작반찬', '추정', 350, 30, 24],
    ])
    const out = correctMealMacros(before)
    expect(sum(out.items, 'calories')).toBeLessThan(sum(before, 'calories'))
  })

  // foodData가 검증한 고단백 음식(치킨 단백질 범위 등록됨)으로만 이뤄진 한 끼는 손대지 않는다.
  it('검증된 음식만으로 상한을 넘으면 아무것도 깎지 않는다 — 검증된 근거가 일반 규칙을 이긴다', () => {
    const out = correctMealMacros(tray([['치킨', '식약처DB', 900, 70, 52]]))
    expect(out.corrections).toEqual({})
    expect(out.items[0].nutrients.protein).toBe(70)
  })

  it('항목 하나를 40% 넘게 깎지는 않는다 — 한 항목에 책임을 다 지우지 않는다', () => {
    const out = correctMealMacros(tray([['창작주찬', '추정', 900, 90, 10]]))
    expect(out.items[0].nutrients.protein).toBeGreaterThanOrEqual(90 * 0.6 - 0.05)
  })

  it('빈 배열이나 열량 0이면 판정하지 않는다', () => {
    expect(correctMealMacros([]).corrections).toEqual({})
    expect(correctMealMacros(tray([['x', '추정', 0, 50, 50]])).corrections).toEqual({})
  })

  // 리뷰에서 발견(경미): 단백질을 먼저 깎아 열량이 줄었으면, 뒤이어 계산하는 지방의 에너지비 상한도
  // 그 줄어든 열량을 기준으로 삼아야 한다. 예전엔 두 영양소 모두 원본(보정 전) 열량 합계 하나만
  // 참조해서, 단백질과 지방이 함께 과대추정된 경우 지방 상한이 실제보다 느슨하게 잡혔다.
  it('단백질 보정으로 줄어든 열량이 지방 상한 계산에도 반영된다', () => {
    // 지방만 과대(단백질은 정상) — 열량은 원본(1000) 그대로 지방 상한을 계산한다.
    const fatOnly = correctMealMacros(
      tray([
        ['창작주찬', '추정', 500, 10, 60],
        ['창작반찬', '추정', 500, 10, 60],
      ]),
    )
    // 단백질·지방 둘 다 과대 — 단백질 보정이 먼저 열량을 줄인 뒤 지방 상한을 계산해야 한다.
    const both = correctMealMacros(
      tray([
        ['창작주찬', '추정', 500, 60, 60],
        ['창작반찬', '추정', 500, 60, 60],
      ]),
    )

    expect(both.corrections.protein).toBeTruthy()
    expect(fatOnly.corrections.fat).toBeTruthy()
    expect(both.corrections.fat).toBeTruthy()
    // 단백질 보정으로 줄어든 열량 때문에 지방 상한이 더 낮아야 한다(그대로였다면 두 상한이 같았다).
    expect(both.corrections.fat.ceiling).toBeLessThan(fatOnly.corrections.fat.ceiling)
  })
})
