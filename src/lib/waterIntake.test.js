import { describe, it, expect, beforeEach } from 'vitest'
import { get, set } from './storage.js'
import { addMl, getWaterIntake, getWaterTargetMl, removeEntry, toggleSupplement, WATER_CUP_ML } from './waterIntake.js'

describe('getWaterTargetMl', () => {
  it('체중 정보가 없으면 기본 목표(1600ml)를 반환한다', () => {
    expect(getWaterTargetMl(undefined, 'moderate')).toBe(1600)
    expect(getWaterTargetMl(0, 'moderate')).toBe(1600)
  })

  it('체중×30ml을 기본으로 계산한다(활동량 낮음은 보정 없음)', () => {
    expect(getWaterTargetMl(60, 'low')).toBe(1800)
  })

  it('활동량이 높을수록 목표가 완만하게 증가한다', () => {
    const low = getWaterTargetMl(60, 'low')
    const moderate = getWaterTargetMl(60, 'moderate')
    const high = getWaterTargetMl(60, 'high')
    expect(moderate).toBeGreaterThan(low)
    expect(high).toBeGreaterThan(moderate)
    // TDEE 계수(1.3~1.7배)처럼 급격히 커지지 않고 완만한 보너스여야 한다.
    expect(high).toBeLessThan(low * 1.3)
  })

  it('알 수 없는 활동량 값은 보정 없이 처리한다', () => {
    expect(getWaterTargetMl(60, 'unknown')).toBe(1800)
  })
})

describe('waterIntake', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('저장된 값이 없으면 0ml·영양제 미복용·빈 기록 기본값을 준다', () => {
    expect(getWaterIntake('u1', '2026-07-29')).toEqual({ mlConsumed: 0, supplementTaken: false, entries: [] })
  })

  it('addMl은 저장하고 누적된 값을 돌려준다', () => {
    const first = addMl('u1', '2026-07-29', WATER_CUP_ML, 2000)
    expect(first.mlConsumed).toBe(200)
    const second = addMl('u1', '2026-07-29', WATER_CUP_ML, 2000)
    expect(second.mlConsumed).toBe(400)
    expect(getWaterIntake('u1', '2026-07-29').mlConsumed).toBe(400)
  })

  it('addMl은 targetMl을 넘지 않도록 clamp한다', () => {
    expect(addMl('u1', '2026-07-29', 5000, 1000).mlConsumed).toBe(1000)
  })

  it('addMl은 음수 방향으로도 0 미만으로 내려가지 않는다', () => {
    addMl('u1', '2026-07-29', 100, 2000)
    expect(addMl('u1', '2026-07-29', -1000, 2000).mlConsumed).toBe(0)
  })

  it('toggleSupplement은 매 호출마다 뒤집는다', () => {
    expect(toggleSupplement('u1', '2026-07-29').supplementTaken).toBe(true)
    expect(toggleSupplement('u1', '2026-07-29').supplementTaken).toBe(false)
  })

  it('서로 다른 dateKey/userId는 독립적으로 저장된다', () => {
    addMl('u1', '2026-07-28', 500, 2000)
    addMl('u1', '2026-07-29', 100, 2000)
    addMl('user-abc', '2026-07-29', 700, 2000)
    expect(getWaterIntake('u1', '2026-07-28').mlConsumed).toBe(500)
    expect(getWaterIntake('u1', '2026-07-29').mlConsumed).toBe(100)
    expect(getWaterIntake('user-abc', '2026-07-29').mlConsumed).toBe(700)
  })

  it('레거시 {glasses} 레코드는 읽을 때 mL로 환산된다(소급 변환 없이 read-time만)', () => {
    set('waterIntake:u1:2026-07-20', { glasses: 3, supplementTaken: true })
    expect(getWaterIntake('u1', '2026-07-20')).toEqual({ mlConsumed: 600, supplementTaken: true, entries: [] })
  })

  it('레거시 레코드에 addMl을 하면 이후로는 mL 필드로 정상 누적된다', () => {
    set('waterIntake:u1:2026-07-20', { glasses: 2 })
    const result = addMl('u1', '2026-07-20', WATER_CUP_ML, 2000)
    expect(result.mlConsumed).toBe(400 + WATER_CUP_ML)
    expect(get('waterIntake:u1:2026-07-20', null).mlConsumed).toBe(600)
  })

  it('addMl은 실제로 반영된 양만큼 entries에 기록을 남긴다(MY 탭 물 기록 화면용)', () => {
    const result = addMl('u1', '2026-07-29', WATER_CUP_ML, 2000)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].ml).toBe(WATER_CUP_ML)
    expect(typeof result.entries[0].at).toBe('number')
    expect(typeof result.entries[0].id).toBe('string')
  })

  it('목표 상한에 걸려 일부만 반영되면 entries에도 실제 반영량만 남는다', () => {
    addMl('u1', '2026-07-29', 900, 1000)
    const result = addMl('u1', '2026-07-29', 500, 1000) // 900+500=1400 -> 1000으로 clamp, 실제 반영은 100
    expect(result.mlConsumed).toBe(1000)
    expect(result.entries.map((e) => e.ml)).toEqual([900, 100])
  })

  it('이미 목표를 채운 상태에서 addMl을 또 호출하면 entries가 늘지 않는다', () => {
    addMl('u1', '2026-07-29', 1000, 1000)
    const result = addMl('u1', '2026-07-29', 200, 1000)
    expect(result.entries).toHaveLength(1)
  })

  it('removeEntry는 해당 기록을 지우고 mlConsumed에서 그만큼 차감한다', () => {
    addMl('u1', '2026-07-29', 200, 2000)
    const withTwo = addMl('u1', '2026-07-29', 300, 2000)
    const firstEntryId = withTwo.entries[0].id
    const result = removeEntry('u1', '2026-07-29', firstEntryId)
    expect(result.mlConsumed).toBe(300)
    expect(result.entries.map((e) => e.ml)).toEqual([300])
  })

  it('removeEntry는 존재하지 않는 id면 아무 것도 바꾸지 않는다', () => {
    addMl('u1', '2026-07-29', 200, 2000)
    const result = removeEntry('u1', '2026-07-29', 'nonexistent')
    expect(result.mlConsumed).toBe(200)
    expect(result.entries).toHaveLength(1)
  })
})
