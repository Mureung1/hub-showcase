import { describe, it, expect } from 'vitest'
import { getDayArrangement } from './onboarding.js'
import { findArrangementViolation } from '../scheduleConstraints.js'

describe('getDayArrangement', () => {
  it('경계값: PPL 7일은 목요일을 강제 휴식으로 넣어 월-일 순환 충돌을 피한다', () => {
    const result = getDayArrangement('PPL', 7)
    expect(result).toEqual({
      MON: 'Push',
      TUE: 'Pull',
      WED: 'Legs',
      FRI: 'Push',
      SAT: 'Pull',
      SUN: 'Legs',
    })
  })

  it('실패 방지: PPL 7일 배치는 findArrangementViolation을 통과한다(인접 충돌 없음)', () => {
    const dayArrangement = getDayArrangement('PPL', 7)
    const result = findArrangementViolation({
      dayArrangement,
      splitType: 'PPL',
    })
    expect(result).toBe(null)
  })

  it('정상: PPL 5일·6일은 기존 순환 방식 그대로 동작한다', () => {
    expect(getDayArrangement('PPL', 5)).toEqual({
      MON: 'Push',
      TUE: 'Pull',
      WED: 'Legs',
      THU: 'Push',
      FRI: 'Pull',
    })
    expect(getDayArrangement('PPL', 6)).toEqual({
      MON: 'Push',
      TUE: 'Pull',
      WED: 'Legs',
      THU: 'Push',
      FRI: 'Pull',
      SAT: 'Legs',
    })
  })
})
