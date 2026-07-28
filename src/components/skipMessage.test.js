import { describe, it, expect } from 'vitest'
import { buildSkipMessage } from './skipMessage'

describe('buildSkipMessage', () => {
  it('정상: 재배치 성공 시 출발/도착 요일이 들어간 문구를 만든다', () => {
    const result = buildSkipMessage({
      reassigned: true,
      fromDayOfWeek: 'TUE',
      toDayOfWeek: 'SUN',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 화요일 루틴을 일요일로 옮겼습니다.',
    )
  })

  it('정상: 기록만 남긴 경우 다른 값과 무관하게 고정 문구를 반환한다', () => {
    const result = buildSkipMessage({
      reassigned: false,
      fromDayOfWeek: 'TUE',
      toDayOfWeek: undefined,
    })
    expect(result).toBe(
      '쉬어가는 것도 계획의 일부예요. 내일 루틴은 그대로 유지됩니다.',
    )
  })

  it('빈 값: fromDayOfWeek가 없으면 undefined가 문구에 그대로 섞여 나온다', () => {
    const result = buildSkipMessage({
      reassigned: true,
      fromDayOfWeek: undefined,
      toDayOfWeek: 'SUN',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 undefined요일 루틴을 일요일로 옮겼습니다.',
    )
  })

  it('빈 값: toDayOfWeek가 빈 문자열이면 undefined가 섞여 나온다', () => {
    const result = buildSkipMessage({
      reassigned: true,
      fromDayOfWeek: 'TUE',
      toDayOfWeek: '',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 화요일 루틴을 undefined요일로 옮겼습니다.',
    )
  })

  it('경계값: 요일표의 첫 값(MON)과 마지막 값(SUN)도 정상 매핑된다', () => {
    const result = buildSkipMessage({
      reassigned: true,
      fromDayOfWeek: 'MON',
      toDayOfWeek: 'SUN',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 월요일 루틴을 일요일로 옮겼습니다.',
    )
  })

  it('경계값: 출발과 도착 요일이 같아도 함수는 그대로 문구를 만든다', () => {
    const result = buildSkipMessage({
      reassigned: true,
      fromDayOfWeek: 'TUE',
      toDayOfWeek: 'TUE',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 화요일 루틴을 화요일로 옮겼습니다.',
    )
  })

  it('실패: 매핑에 없는 요일 코드를 주면 에러 없이 undefined가 섞인다', () => {
    const result = buildSkipMessage({
      reassigned: true,
      fromDayOfWeek: 'MONDAY',
      toDayOfWeek: 'SUN',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 undefined요일 루틴을 일요일로 옮겼습니다.',
    )
  })

  it('실패: reassigned가 boolean이 아닌 truthy 값이어도 재배치 분기를 탄다', () => {
    const result = buildSkipMessage({
      reassigned: 'yes',
      fromDayOfWeek: 'MON',
      toDayOfWeek: 'FRI',
    })
    expect(result).toBe(
      '이번 주 세션이 밀려서 월요일 루틴을 금요일로 옮겼습니다.',
    )
  })
})
