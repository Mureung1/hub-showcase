import { describe, it, expect } from 'vitest'
import { buildLevelRow, parseBackupText, MEAL_COLUMNS } from './backupFormat.js'

// 게이미피케이션 v2(레벨/XP)의 CSV 백업 지원만 다룬다 — 나머지 파싱/직렬화 회귀는
// scripts/check-csv-roundtrip.mjs가 실제 직렬화 함수로 왕복 검증한다.

function sectioned({ profileLines = [], mealLines = [] } = {}) {
  return [
    '[profile]',
    'key,value',
    ...profileLines,
    '[meals]',
    MEAL_COLUMNS.join(','),
    ...mealLines,
  ].join('\n')
}

const VALID_PROFILE_LINES = [
  'age,30',
  'sex,male',
  'heightCm,175',
  'weightKg,70',
  'activity,moderate',
]

describe('buildLevelRow', () => {
  it('totalXp가 0이면 빈 배열(레벨 필드 없는 옛 백업과 동일한 형태)', () => {
    expect(buildLevelRow(0)).toEqual([])
  })

  it('totalXp가 양수면 key-value 행 하나를 만든다', () => {
    expect(buildLevelRow(150)).toEqual([['totalXp', 150]])
  })
})

describe('parseBackupText — totalXp', () => {
  it('프로필이 유효하고 totalXp가 있으면 둘 다 복구된다', () => {
    const text = sectioned({ profileLines: [...VALID_PROFILE_LINES, 'totalXp,230'] })
    const result = parseBackupText(text)
    expect(result.profile).not.toBeNull()
    expect(result.totalXp).toBe(230)
  })

  it('프로필 자체가 무효(온보딩 전 백업)해도 totalXp는 독립적으로 복구된다', () => {
    // age/sex 등 필수 키가 아예 없어 프로필은 무효 처리되지만, totalXp 행만은 유효하다.
    const text = sectioned({ profileLines: ['totalXp,50'] })
    const result = parseBackupText(text)
    expect(result.profile).toBeNull()
    expect(result.totalXp).toBe(50)
  })

  it('totalXp 필드가 없는 옛 백업도 그대로 읽힌다(하위 호환)', () => {
    const text = sectioned({ profileLines: VALID_PROFILE_LINES })
    const result = parseBackupText(text)
    expect(result.profile).not.toBeNull()
    expect(result.totalXp).toBe(0)
  })

  it('음수/비숫자 totalXp는 0으로 방어한다', () => {
    expect(parseBackupText(sectioned({ profileLines: [...VALID_PROFILE_LINES, 'totalXp,-10'] })).totalXp).toBe(0)
    expect(parseBackupText(sectioned({ profileLines: [...VALID_PROFILE_LINES, 'totalXp,abc'] })).totalXp).toBe(0)
  })

  it('소수는 내림 처리된다', () => {
    expect(parseBackupText(sectioned({ profileLines: [...VALID_PROFILE_LINES, 'totalXp,12.9'] })).totalXp).toBe(12)
  })

  it('평면(FLAT) 형식은 totalXp가 항상 0이다(신체정보와 마찬가지로 이 형식엔 레벨 데이터가 없음)', () => {
    const flatText = [
      ['date', 'source', 'item_name', 'brand', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium'].join(','),
      '2026-07-10,식약처DB,비빔밥,,650,15,95,12,6,900',
    ].join('\n')
    const result = parseBackupText(flatText)
    expect(result.format).toBe('flat')
    expect(result.totalXp).toBe(0)
  })
})
