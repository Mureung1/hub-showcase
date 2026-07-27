// 부족 영양소 판정(buildDeficiencyRows)·나트륨 상한(isSodiumExceeded) 규칙 고정 테스트.
// 핵심 보장: 절대량이 큰 칼로리·나트륨이 부족 top3를 독식하지 않고,
// 단백질·식이섬유가 충족률 기준으로 부족 목록에 진입할 수 있다.
import { describe, it, expect } from 'vitest'
import {
  buildDeficiencyRows,
  DEFICIENCY_TARGET_KEYS,
  isSodiumExceeded,
  RECORD_ONLY_KEYS,
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
