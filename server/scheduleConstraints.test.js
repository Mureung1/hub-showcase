import { describe, it, expect } from 'vitest'
import {
  violatesAdjacentAreaRule,
  findArrangementViolation,
} from './scheduleConstraints.js'

describe('violatesAdjacentAreaRule', () => {
  it('정상: 진짜 인접한 요일(화-수)이 같은 부위를 쓰면 위반이다', () => {
    const days = [
      { dayOfWeek: 'TUE', targetAreas: ['하체'] },
      { dayOfWeek: 'WED', targetAreas: [] },
    ]
    const result = violatesAdjacentAreaRule({
      days,
      candidateDayOfWeek: 'WED',
      areasToPlace: ['하체'],
    })
    expect(result).toBe(true)
  })

  it('정상: 인접하지 않은 요일(월-수)은 같은 부위를 써도 위반이 아니다', () => {
    const days = [
      { dayOfWeek: 'MON', targetAreas: ['하체'] },
      { dayOfWeek: 'WED', targetAreas: [] },
    ]
    const result = violatesAdjacentAreaRule({
      days,
      candidateDayOfWeek: 'WED',
      areasToPlace: ['하체'],
    })
    expect(result).toBe(false)
  })

  it('경계값: 배열 순환 적용 후 월요일과 일요일도 인접으로 취급해 위반을 잡는다', () => {
    const days = [
      { dayOfWeek: 'SUN', targetAreas: ['상체'] },
      { dayOfWeek: 'TUE', targetAreas: [] },
    ]
    const result = violatesAdjacentAreaRule({
      days,
      candidateDayOfWeek: 'MON',
      areasToPlace: ['상체'],
    })
    expect(result).toBe(true)
  })
})

describe('findArrangementViolation', () => {
  it('정상: 상하체 4일 배치는 위반이 없다', () => {
    const result = findArrangementViolation({
      dayArrangement: { MON: '상체', TUE: '하체', THU: '상체', FRI: '하체' },
      splitType: '상하체',
    })
    expect(result).toBe(null)
  })

  it('정상: PPL 5일 배치는 위반이 없다', () => {
    const result = findArrangementViolation({
      dayArrangement: {
        MON: 'Push',
        TUE: 'Pull',
        WED: 'Legs',
        THU: 'Push',
        FRI: 'Pull',
      },
      splitType: 'PPL',
    })
    expect(result).toBe(null)
  })

  it('빈 값: 전부 휴식(빈 배치)이면 위반이 없다', () => {
    const result = findArrangementViolation({
      dayArrangement: {},
      splitType: '상하체',
    })
    expect(result).toBe(null)
  })

  it('경계값: 월-화처럼 진짜 인접한 요일이 같은 부위면 위반 요일을 반환한다', () => {
    // 요일 순서(월→화→...)대로 검사하므로, 화요일이 아니라 먼저 검사되는 월요일이
    // "이웃(화요일)과 겹친다"는 걸로 먼저 걸린다.
    const result = findArrangementViolation({
      dayArrangement: { MON: '상체', TUE: '상체' },
      splitType: '상하체',
    })
    expect(result).toBe('MON')
  })

  it('경계값: 월-일처럼 순환으로 인접한 요일이 같은 부위면 위반 요일을 반환한다', () => {
    const result = findArrangementViolation({
      dayArrangement: { MON: '상체', SUN: '상체' },
      splitType: '상하체',
    })
    expect(result).toBe('MON')
  })

  it('실패: SPLIT_DAY_TYPES에 없는 잘못된 dayType이 있어도 크래시하지 않는다', () => {
    const result = findArrangementViolation({
      dayArrangement: { MON: '없는분할', TUE: '하체' },
      splitType: '상하체',
    })
    expect(result).toBe(null)
  })
})
