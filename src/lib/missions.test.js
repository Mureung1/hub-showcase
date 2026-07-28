import { describe, it, expect } from 'vitest'
import { pickDailyMission, evaluateMission } from './missions.js'

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

describe('pickDailyMission', () => {
  it('recommended가 없으면(성별조차 안 고른 게스트) null — 미션 대신 SexPrompt로 유도해야 하는 신호', () => {
    expect(pickDailyMission(null, null, { dateKey: '2026-07-28', mealCount: 0 })).toBeNull()
  })

  it('오늘 기록이 없으면 no-record 트리거에서 고른다', () => {
    const mission = pickDailyMission(RECOMMENDED, null, { dateKey: '2026-07-28', mealCount: 0 })
    expect(mission.trigger).toBe('no-record')
  })

  it('가장 부족한 영양소(달성률이 가장 낮은 것)의 트리거를 고른다', () => {
    // 단백질 30/60=50%, 식이섬유 20/25=80%(충족선) → 단백질이 더 부족.
    const total = { calories: 1800, protein: 30, carbs: 280, fat: 55, fiber: 20, sodium: 1500 }
    const mission = pickDailyMission(RECOMMENDED, total, { dateKey: '2026-07-28', mealCount: 1 })
    expect(mission.trigger).toBe('protein')
  })

  it('4대 목표 영양소는 다 채웠지만 나트륨이 상한을 넘었으면 sodium-exceeded', () => {
    const total = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2500 }
    const mission = pickDailyMission(RECOMMENDED, total, { dateKey: '2026-07-28', mealCount: 1 })
    expect(mission.trigger).toBe('sodium-exceeded')
  })

  it('전부 충족(나트륨도 상한 이내)이면 all-satisfied', () => {
    const total = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 1500 }
    const mission = pickDailyMission(RECOMMENDED, total, { dateKey: '2026-07-28', mealCount: 1 })
    expect(mission.trigger).toBe('all-satisfied')
  })

  it('같은 (userId, dateKey, 트리거)면 항상 같은 미션이 나온다(렌더마다 흔들리지 않음)', () => {
    const a = pickDailyMission(RECOMMENDED, null, { dateKey: '2026-07-28', userId: 'u1', mealCount: 0 })
    const b = pickDailyMission(RECOMMENDED, null, { dateKey: '2026-07-28', userId: 'u1', mealCount: 0 })
    expect(a.id).toBe(b.id)
  })

  it('날짜가 바뀌면 같은 트리거 안에서도 다른 미션이 나올 수 있다(순환 동작)', () => {
    const ids = new Set()
    for (let day = 1; day <= 20; day++) {
      const dateKey = `2026-07-${String(day).padStart(2, '0')}`
      const mission = pickDailyMission(RECOMMENDED, null, { dateKey, userId: 'u1', mealCount: 0 })
      ids.add(mission.id)
    }
    expect(ids.size).toBeGreaterThan(1)
  })

  it('같은 날짜라도 사용자가 다르면 다른 미션이 나올 수 있다', () => {
    const ids = new Set()
    for (let i = 0; i < 20; i++) {
      const mission = pickDailyMission(RECOMMENDED, null, { dateKey: '2026-07-28', userId: `user-${i}`, mealCount: 0 })
      ids.add(mission.id)
    }
    expect(ids.size).toBeGreaterThan(1)
  })
})

describe('evaluateMission', () => {
  it('목표형(protein) 미션은 달성률 0.8 이상에서 완료로 판정한다', () => {
    const mission = { id: 'protein-1', trigger: 'protein' }
    expect(evaluateMission(mission, { protein: 48 }, { protein: 60 })).toBe(true)
    expect(evaluateMission(mission, { protein: 47 }, { protein: 60 })).toBe(false)
  })

  it('sodium-exceeded 미션은 오늘 나트륨이 상한 이내로 돌아오면 완료된다(방향이 반대)', () => {
    const mission = { id: 'sodium-1', trigger: 'sodium-exceeded' }
    expect(evaluateMission(mission, { sodium: 1999 }, { sodium: 2000 })).toBe(true)
    expect(evaluateMission(mission, { sodium: 2500 }, { sodium: 2000 })).toBe(false)
  })

  it('no-record 미션은 끼니가 1개 이상 기록되면 완료된다', () => {
    const mission = { id: 'no-record-1', trigger: 'no-record' }
    expect(evaluateMission(mission, null, RECOMMENDED, { mealCount: 0 })).toBe(false)
    expect(evaluateMission(mission, null, RECOMMENDED, { mealCount: 1 })).toBe(true)
  })

  it('all-satisfied(정보성) 미션은 완료 여부가 없어 null이다', () => {
    const mission = { id: 'all-satisfied-1', trigger: 'all-satisfied' }
    expect(evaluateMission(mission, RECOMMENDED, RECOMMENDED)).toBeNull()
  })

  it('mission이 없으면 null', () => {
    expect(evaluateMission(null, RECOMMENDED, RECOMMENDED)).toBeNull()
  })
})
