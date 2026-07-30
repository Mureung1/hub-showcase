import { describe, it, expect } from 'vitest'
import { checkPlateTotal, plateKcalBand, schoolMealStandardKcal } from './mealStandards.js'

describe('schoolMealStandardKcal', () => {
  it('NEIS 학교종류 문자열을 학교급식 영양관리기준으로 옮긴다', () => {
    expect(schoolMealStandardKcal('초등학교')).toBe(634)
    expect(schoolMealStandardKcal('중학교')).toBe(800)
    expect(schoolMealStandardKcal('고등학교')).toBe(900)
  })

  it('precisionEngine의 schoolType 키도 받는다', () => {
    expect(schoolMealStandardKcal('middle')).toBe(800)
  })

  it('급식이 아니거나 모르면 null', () => {
    expect(schoolMealStandardKcal('univ')).toBeNull()
    expect(schoolMealStandardKcal(null)).toBeNull()
  })
})

describe('plateKcalBand', () => {
  it('학교급식이면 법정 기준 ±35%', () => {
    expect(plateKcalBand({ schoolKind: '중학교' })).toEqual({ min: 520, max: 1080, standard: 800 })
  })

  it('급식이 아니면 장면별 범용 범위', () => {
    expect(plateKcalBand({ sceneType: 'single' }).standard).toBeNull()
    expect(plateKcalBand({ sceneType: 'single' }).max).toBeLessThan(plateKcalBand({ sceneType: 'multi_dish' }).max)
  })
})

describe('checkPlateTotal', () => {
  // 이 저장소의 NEIS 실제 샘플 12끼 — 하나도 경고가 뜨면 안 된다(정상 급식을 이례적이라 하면
  // 경고가 무의미해진다). 밴드를 좁히려면 이 목록부터 다시 확인할 것.
  it('실제 NEIS 급식 샘플은 전부 정상으로 통과한다', () => {
    const samples = [
      ['초등학교', [663.4, 516.7, 842.8]],
      ['중학교', [855.7, 761.5, 887.4, 712]],
      ['고등학교', [754.9, 839, 714.7, 847.6, 861.3]],
    ]
    for (const [kind, totals] of samples) {
      for (const total of totals) {
        expect(checkPlateTotal(total, { sceneType: 'cafeteria_tray', schoolKind: kind })).toBeNull()
      }
    }
  })

  it('급식 한 끼로 볼 수 없는 값은 방향과 함께 알린다', () => {
    const high = checkPlateTotal(1800, { sceneType: 'cafeteria_tray', schoolKind: '중학교' })
    expect(high.direction).toBe('high')
    expect(high.standard).toBe(800)
    expect(high.message).toContain('800kcal')

    expect(checkPlateTotal(200, { sceneType: 'cafeteria_tray', schoolKind: '중학교' }).direction).toBe('low')
  })

  it('학교를 모르면 장면별 범용 범위로 판정한다', () => {
    expect(checkPlateTotal(700, { sceneType: 'multi_dish' })).toBeNull()
    expect(checkPlateTotal(3000, { sceneType: 'multi_dish' }).direction).toBe('high')
  })

  it('합계가 없거나 0이면 판정하지 않는다', () => {
    expect(checkPlateTotal(0, {})).toBeNull()
    expect(checkPlateTotal(null, {})).toBeNull()
  })
})
