import { describe, expect, test } from 'vitest'
import { WEAK_AREAS_BY_EXAM } from '../constants/examAreas'
import { createDailyStudyPlan } from './studyPlanGenerator'

function sumMinutes(plan) {
  return plan.reduce((totalMinutes, item) => totalMinutes + item.minutes, 0)
}

describe('createDailyStudyPlan', () => {
  test('취약 영역이 없으면 전체 영역에 균등 배분한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: [],
    })

    expect(plan).toEqual([
      { area: 'Reading', minutes: 30, isWeak: false },
      { area: 'Listening', minutes: 30, isWeak: false },
      { area: 'Speaking', minutes: 30, isWeak: false },
      { area: 'Writing', minutes: 30, isWeak: false },
    ])
  })

  test('취약 영역과 일반 영역에 70대 30으로 배분한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 100,
      weakAreas: ['Listening', 'Speaking'],
    })

    const weakMinutes = plan
      .filter((item) => item.isWeak)
      .reduce((totalMinutes, item) => totalMinutes + item.minutes, 0)
    const normalMinutes = plan
      .filter((item) => !item.isWeak)
      .reduce((totalMinutes, item) => totalMinutes + item.minutes, 0)

    expect(weakMinutes).toBe(70)
    expect(normalMinutes).toBe(30)
    expect(sumMinutes(plan)).toBe(100)
  })

  test('한 영역만 취약한 경우 70대 30 비율을 적용한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEIC',
      dailyStudyMinutes: 120,
      weakAreas: ['LC'],
    })

    expect(plan).toEqual([
      { area: 'LC', minutes: 84, isWeak: true },
      { area: 'RC', minutes: 36, isWeak: false },
    ])
  })

  test('시간이 나누어떨어지지 않아도 전체 합계가 정확하다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 101,
      weakAreas: ['Speaking', 'Writing'],
    })

    expect(sumMinutes(plan)).toBe(101)
  })

  test('잘못된 취약 영역은 무시한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 100,
      weakAreas: ['Listening', 'Grammar'],
    })

    expect(plan.map((item) => item.area)).not.toContain('Grammar')
    expect(plan.filter((item) => item.isWeak)).toEqual([{ area: 'Listening', minutes: 70, isWeak: true }])
    expect(sumMinutes(plan)).toBe(100)
  })

  test('모든 취약 영역이 잘못된 값이면 균등 배분한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: ['Grammar'],
    })

    expect(plan).toEqual([
      { area: 'Reading', minutes: 30, isWeak: false },
      { area: 'Listening', minutes: 30, isWeak: false },
      { area: 'Speaking', minutes: 30, isWeak: false },
      { area: 'Writing', minutes: 30, isWeak: false },
    ])
  })

  test('모든 영역이 취약하면 균등 배분한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: ['Reading', 'Listening', 'Speaking', 'Writing'],
    })

    expect(plan).toEqual([
      { area: 'Reading', minutes: 30, isWeak: true },
      { area: 'Listening', minutes: 30, isWeak: true },
      { area: 'Speaking', minutes: 30, isWeak: true },
      { area: 'Writing', minutes: 30, isWeak: true },
    ])
  })

  test('dailyStudyMinutes가 0이면 빈 배열을 반환한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 0,
      weakAreas: ['Reading'],
    })

    expect(plan).toEqual([])
  })

  test('dailyStudyMinutes가 음수이면 빈 배열을 반환한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: -1,
      weakAreas: ['Reading'],
    })

    expect(plan).toEqual([])
  })

  test('지원하지 않는 examType이면 빈 배열을 반환한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'IELTS',
      dailyStudyMinutes: 120,
      weakAreas: ['Listening'],
    })

    expect(plan).toEqual([])
  })

  test('OPIc의 영역 목록이 공통 스펙에 맞게 반환된다', () => {
    const plan = createDailyStudyPlan({
      examType: 'OPIc',
      dailyStudyMinutes: 100,
      weakAreas: [],
    })

    expect(plan.map((item) => item.area)).toEqual(WEAK_AREAS_BY_EXAM.OPIc)
  })

  test('TOEIC Speaking의 영역 목록이 공통 스펙에 맞게 반환된다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEIC Speaking',
      dailyStudyMinutes: 100,
      weakAreas: [],
    })

    expect(plan.map((item) => item.area)).toEqual(WEAK_AREAS_BY_EXAM['TOEIC Speaking'])
  })
})
