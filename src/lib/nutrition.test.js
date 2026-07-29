// 부족 영양소 판정(buildDeficiencyRows)·나트륨 상한(isSodiumExceeded) 규칙 고정 테스트.
// 핵심 보장: 절대량이 큰 칼로리·나트륨이 부족 top3를 독식하지 않고,
// 단백질·식이섬유가 충족률 기준으로 부족 목록에 진입할 수 있다.
import { describe, it, expect } from 'vitest'
import {
  applyAtwaterEnsemble,
  buildDeficiencyRows,
  calcDayStatus,
  calcRecommendedNutrients,
  countSatisfiedNutrients,
  DAY_STATUS_THRESHOLDS,
  DEFICIENCY_TARGET_KEYS,
  isSodiumExceeded,
  RECORD_ONLY_KEYS,
  scaleMealAnalysisByServings,
  SERVINGS_MAX,
  SERVINGS_MIN,
} from './nutrition.js'

// 표준 성인 남성 가정값 수준의 권장량(값 자체는 테스트 안에서만 의미)
const RECOMMENDED = { calories: 2400, protein: 120, carbs: 300, fat: 80, fiber: 30, sodium: 2000 }

function total(overrides = {}) {
  return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, ...overrides }
}

describe('buildDeficiencyRows', () => {
  it('칼로리·나트륨은 아무것도 안 먹었어도 부족 목록에 절대 들어가지 않는다', () => {
    const rows = buildDeficiencyRows(RECOMMENDED, total())
    const keys = rows.map((r) => r.key)
    expect(keys).not.toContain('calories')
    expect(keys).not.toContain('sodium')
    // 4대 목표 영양소만 후보이므로 top3는 그중에서 나온다
    keys.forEach((key) => expect(DEFICIENCY_TARGET_KEYS).toContain(key))
  })

  it('충족률(actual/recommended) 낮은 순으로 정렬된다 — 절대량 순이 아니다', () => {
    // 탄수 90%(부족량 30g), 단백질 10%(부족량 108g), 식이섬유 50%(부족량 15g), 지방 100%
    const rows = buildDeficiencyRows(RECOMMENDED, total({ carbs: 270, protein: 12, fiber: 15, fat: 80 }))
    expect(rows.map((r) => r.key)).toEqual(['protein', 'fiber', 'carbs'])
  })

  it('밥류만 먹은 날(탄수만 채움) 단백질·식이섬유·지방이 부족으로 나온다', () => {
    const rows = buildDeficiencyRows(RECOMMENDED, total({ carbs: 290, calories: 1300, protein: 25, fat: 10, fiber: 6 }))
    const keys = rows.map((r) => r.key)
    expect(keys).toContain('protein')
    expect(keys).toContain('fiber')
    expect(keys).not.toContain('carbs') // 96% 충족이지만 상위 3개 밖(더 부족한 3개가 먼저)
  })

  it('충족률 100% 이상인 영양소는 부족 목록에서 제외된다', () => {
    const rows = buildDeficiencyRows(RECOMMENDED, total({ carbs: 300, protein: 120, fat: 100, fiber: 10 }))
    expect(rows.map((r) => r.key)).toEqual(['fiber'])
  })

  it('4대 영양소 전부 충족이면 빈 배열(부족 없음 상태)', () => {
    const rows = buildDeficiencyRows(RECOMMENDED, total({ carbs: 310, protein: 125, fat: 85, fiber: 31, sodium: 3000 }))
    expect(rows).toEqual([])
  })

  it('권장량/총합이 없으면(프로필 미입력) 빈 배열', () => {
    expect(buildDeficiencyRows(null, total())).toEqual([])
    expect(buildDeficiencyRows(RECOMMENDED, null)).toEqual([])
  })

  it('row 모양이 기존 화면·프롬프트와 호환된다(key/label/unit/deficiency)', () => {
    const [row] = buildDeficiencyRows(RECOMMENDED, total({ carbs: 300, fat: 80, fiber: 30, protein: 60 }))
    expect(row.key).toBe('protein')
    expect(row.label).toBe('단백질')
    expect(row.unit).toBe('g')
    expect(row.deficiency).toBe(60) // 정수 반올림
    expect(row.recommended).toBe(120)
    expect(row.actual).toBe(60)
  })
})

// 6주차 §3 — 나트륨 상한형 판정이 다른 5개(목표형)와 같은 카운트 규칙(countSatisfiedNutrients →
// calcDayStatus) 안에서 방향만 올바르게 반대인지 고정한다. 이 앱의 실제 규칙은 "6개 중 4개"류
// 이분법이 아니라 충족 개수 기준 3단계(good≥5, normal≥2)다.
describe('countSatisfiedNutrients / calcDayStatus — 나트륨 방향 반전', () => {
  const RECOMMENDED = { calories: 2400, protein: 120, carbs: 300, fat: 80, fiber: 30, sodium: 2000 }
  const allSatisfied = { calories: 2400, protein: 120, carbs: 300, fat: 80, fiber: 30, sodium: 1999 }

  it('나트륨 경계값: 1999는 충족 카운트, 2000은 충족 카운트, 2001은 미충족 카운트', () => {
    expect(countSatisfiedNutrients(RECOMMENDED, { ...allSatisfied, sodium: 1999 })).toBe(6)
    expect(countSatisfiedNutrients(RECOMMENDED, { ...allSatisfied, sodium: 2000 })).toBe(6)
    expect(countSatisfiedNutrients(RECOMMENDED, { ...allSatisfied, sodium: 2001 })).toBe(5)
  })

  it('나트륨을 아예 안 먹어도(0mg) 충족으로 카운트된다 — 적게 먹을수록 좋은 상한형이므로', () => {
    expect(countSatisfiedNutrients(RECOMMENDED, { ...allSatisfied, sodium: 0 })).toBe(6)
  })

  it('6개 전부 충족 → good, 5개 충족(나트륨만 초과) → normal 문턱 확인', () => {
    expect(calcDayStatus(RECOMMENDED, allSatisfied)).toBe('good')
    // 나트륨만 초과시키면 5개 충족 — good(5) 문턱은 그대로 넘으므로 여전히 good이어야 정상
    expect(countSatisfiedNutrients(RECOMMENDED, { ...allSatisfied, sodium: 5000 })).toBe(DAY_STATUS_THRESHOLDS.good)
    expect(calcDayStatus(RECOMMENDED, { ...allSatisfied, sodium: 5000 })).toBe('good')
  })

  it('충족 개수가 normal 문턱 아래로 떨어지면 bad', () => {
    const mostlyUnmet = { calories: 0, protein: 0, carbs: 0, fat: 80, fiber: 0, sodium: 5000 }
    expect(countSatisfiedNutrients(RECOMMENDED, mostlyUnmet)).toBe(1)
    expect(calcDayStatus(RECOMMENDED, mostlyUnmet)).toBe('bad')
  })
})

describe('applyAtwaterEnsemble', () => {
  it('탄단지로 역산한 칼로리가 기록된 calories와 20% 이내면 손대지 않는다', () => {
    // 4*40 + 4*10 + 9*10 = 290kcal, 기록값 300kcal → 오차 3.3%
    const nutrients = { calories: 300, protein: 10, carbs: 40, fat: 10, fiber: 3, sodium: 500 }
    expect(applyAtwaterEnsemble(nutrients)).toEqual(nutrients)
  })

  it('오차가 20%를 넘으면 탄단지를 calories에 맞춰 비례 보정한다', () => {
    // 4*10 + 4*10 + 9*10 = 170kcal인데 calories는 500kcal로 기록됨(오차 194%) → carbs/protein/fat을
    // 500/170배로 스케일해 Atwater 역산치가 500kcal에 맞도록 보정, 서로의 비율(1:1:1)은 유지된다.
    const nutrients = { calories: 500, protein: 10, carbs: 10, fat: 10, fiber: 3, sodium: 500 }
    const result = applyAtwaterEnsemble(nutrients)
    expect(result.calories).toBe(500) // calories 자체는 신뢰값으로 보고 건드리지 않는다
    expect(result.fiber).toBe(3) // Atwater와 무관한 항목은 그대로
    expect(result.sodium).toBe(500)
    const recomputed = result.carbs * 4 + result.protein * 4 + result.fat * 9
    expect(recomputed).toBeCloseTo(500, 0)
    // 세 값 사이의 원래 비율(1:1:1)이 보정 후에도 유지돼야 한다
    expect(result.carbs).toBeCloseTo(result.protein, 5)
    expect(result.carbs).toBeCloseTo(result.fat, 5)
  })

  it('calories나 탄단지가 없거나 0 이하면 원본을 그대로 반환한다', () => {
    expect(applyAtwaterEnsemble({ calories: 0, protein: 10, carbs: 10, fat: 10 })).toEqual({
      calories: 0,
      protein: 10,
      carbs: 10,
      fat: 10,
    })
    const missingMacro = { calories: 300, protein: null, carbs: 40, fat: 10 }
    expect(applyAtwaterEnsemble(missingMacro)).toEqual(missingMacro)
  })
})

describe('isSodiumExceeded', () => {
  it('상한 이하면 false, 초과하면 true', () => {
    expect(isSodiumExceeded(RECOMMENDED, total({ sodium: 1999 }))).toBe(false)
    expect(isSodiumExceeded(RECOMMENDED, total({ sodium: 2000 }))).toBe(false)
    expect(isSodiumExceeded(RECOMMENDED, total({ sodium: 2001 }))).toBe(true)
  })

  it('데이터가 없으면 false(경고를 잘못 띄우지 않는다)', () => {
    expect(isSodiumExceeded(null, total())).toBe(false)
    expect(isSodiumExceeded(RECOMMENDED, null)).toBe(false)
  })
})

describe('분류 상수', () => {
  it('목표형 4개 + 기록 전용 2개가 6대 영양소를 정확히 양분한다', () => {
    expect([...DEFICIENCY_TARGET_KEYS, ...RECORD_ONLY_KEYS].sort()).toEqual(
      ['calories', 'carbs', 'fat', 'fiber', 'protein', 'sodium'],
    )
  })
})

// 6주차 §2 — 인분 수 조절. baseNutrients(analysis 원본) 불변 + 표시값만 servings배로 계산하는지 검증.
describe('scaleMealAnalysisByServings', () => {
  const baseAnalysis = {
    items: [{ name: '김치찌개', nutrients: { calories: 400, protein: 20, carbs: 30, fat: 10, fiber: 4, sodium: 1600 } }],
    total: { calories: 400, protein: 20, carbs: 30, fat: 10, fiber: 4, sodium: 1600 },
  }

  it('1.5배 계산: 모든 항목·합계가 정확히 1.5배가 된다', () => {
    const scaled = scaleMealAnalysisByServings(baseAnalysis, 1.5)
    expect(scaled.total).toEqual({ calories: 600, protein: 30, carbs: 45, fat: 15, fiber: 6, sodium: 2400 })
    expect(scaled.items[0].nutrients.calories).toBe(600)
  })

  it('원본(analysis)은 절대 변형되지 않는다 — baseNutrients 불변 규칙', () => {
    scaleMealAnalysisByServings(baseAnalysis, 2)
    expect(baseAnalysis.total.calories).toBe(400)
    expect(baseAnalysis.items[0].nutrients.calories).toBe(400)
  })

  it('인분을 왔다갔다 바꿔도(2배 → 1배) 원본 기준 오차가 0이다', () => {
    const doubled = scaleMealAnalysisByServings(baseAnalysis, 2)
    const backToOne = scaleMealAnalysisByServings(baseAnalysis, 1)
    expect(backToOne.total.calories).toBe(baseAnalysis.total.calories)
    expect(doubled.total.calories).toBe(baseAnalysis.total.calories * 2)
  })

  it('null 영양값은 스케일해도 null 그대로 유지된다(라벨 스캔의 미확인 항목 등)', () => {
    const withNull = { items: [{ name: 'x', nutrients: { ...baseAnalysis.total, fiber: null } }], total: baseAnalysis.total }
    const scaled = scaleMealAnalysisByServings(withNull, 3)
    expect(scaled.items[0].nutrients.fiber).toBeNull()
  })

  it('경계값 상수: 최소 0.5, 최대 10', () => {
    expect(SERVINGS_MIN).toBe(0.5)
    expect(SERVINGS_MAX).toBe(10)
  })
})

// 트랙 3 §1 회귀 가드 — 청소년(youthIntake.js) 분기를 추가하면서 성인(19세 이상) 계산이 단 1비트도
// 바뀌면 안 된다(calcDayStatus가 "과거 기록의 판정은 소급해서 바뀌지 않는다"를 전제하므로, 계산식이
// 조금이라도 달라지면 과거 기록의 하루 상태가 조용히 바뀔 수 있다). 아래 기대값은 youthIntake.js
// 통합 *이전*의 실제 calcRecommendedNutrients 실행 결과를 그대로 캡처한 것이다(임의로 계산한 값이 아님).
describe('calcRecommendedNutrients — 성인 회귀 가드(청소년 분기 추가 전후 동일해야 함)', () => {
  it('성인(19세 이상) 각 케이스의 출력이 청소년 분기 도입 전과 정확히 같다', () => {
    expect(calcRecommendedNutrients({ age: 25, heightCm: 170, weightKg: 65, sex: 'male', activity: 'moderate', conditions: [] })).toEqual(
      { calories: 2468, protein: 123, carbs: 309, fat: 82, fiber: 30, sodium: 2000 },
    )
    expect(calcRecommendedNutrients({ age: 35, heightCm: 160, weightKg: 55, sex: 'female', activity: 'low', conditions: [] })).toEqual({
      calories: 1669,
      protein: 83,
      carbs: 209,
      fat: 56,
      fiber: 25,
      sodium: 2000,
    })
    expect(calcRecommendedNutrients({ age: 70, heightCm: 175, weightKg: 80, sex: 'male', activity: 'high', conditions: [] })).toEqual({
      calories: 2672,
      protein: 134,
      carbs: 334,
      fat: 89,
      fiber: 30,
      sodium: 2000,
    })
    // 기저질환(당뇨) 보정이 걸리는 경로도 함께 고정한다.
    expect(
      calcRecommendedNutrients({ age: 30, heightCm: 165, weightKg: 60, sex: 'female', activity: 'moderate', conditions: ['diabetes'] }),
    ).toEqual({ calories: 2046, protein: 128, carbs: 230, fat: 68, fiber: 25, sodium: 2000 })
    // 성인 최연소 경계(19세) — 청소년 분기(isYouthAge)가 18세까지만 잡아야 이 케이스가 여전히
    // 성인 공식(Mifflin-St Jeor)을 타는지 확인한다.
    expect(calcRecommendedNutrients({ age: 19, heightCm: 172, weightKg: 68, sex: 'male', activity: 'moderate', conditions: [] })).toEqual(
      { calories: 2581, protein: 129, carbs: 323, fat: 86, fiber: 30, sodium: 2000 },
    )
  })
})
