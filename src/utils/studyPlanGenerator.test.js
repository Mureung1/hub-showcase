import { describe, expect, test } from 'vitest'
import { WEAK_AREAS_BY_EXAM } from '../constants/examAreas'
import { createAdaptiveDailyStudyPlan, createDailyStudyPlan, getPriorityAreaFromNote } from './studyPlanGenerator'

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

  test('priorityArea가 있으면 40/40/20 규칙으로 시간을 배분한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 130,
      weakAreas: ['Reading', 'Speaking', 'Writing'],
      priorityArea: 'Speaking',
    })

    expect(plan).toEqual([
      { area: 'Reading', minutes: 26, isWeak: true },
      { area: 'Listening', minutes: 26, isWeak: false },
      { area: 'Speaking', minutes: 52, isWeak: true, isPriority: true },
      { area: 'Writing', minutes: 26, isWeak: true },
    ])
    expect(sumMinutes(plan)).toBe(130)
  })

  test('priorityArea가 선택한 취약 영역이 아니면 기존 70대 30 규칙을 유지한다', () => {
    const plan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 130,
      weakAreas: ['Reading', 'Writing'],
      priorityArea: 'Speaking',
    })

    const weakMinutes = plan
      .filter((item) => item.isWeak)
      .reduce((totalMinutes, item) => totalMinutes + item.minutes, 0)
    const normalMinutes = plan
      .filter((item) => !item.isWeak)
      .reduce((totalMinutes, item) => totalMinutes + item.minutes, 0)

    expect(weakMinutes).toBe(91)
    expect(normalMinutes).toBe(39)
    expect(plan.some((item) => item.isPriority)).toBe(false)
    expect(sumMinutes(plan)).toBe(130)
  })
})

describe('getPriorityAreaFromNote', () => {
  test('선택한 취약 영역 중 메모에 명시된 영역을 우선 영역으로 반환한다', () => {
    const priorityArea = getPriorityAreaFromNote({
      areas: WEAK_AREAS_BY_EXAM.TOEFL,
      weakAreas: ['Reading', 'Speaking', 'Writing'],
      weakAreaNote: '특히 speaking이 어려움',
    })

    expect(priorityArea).toBe('Speaking')
  })

  test('메모에 있어도 선택한 취약 영역이 아니면 우선 영역으로 반환하지 않는다', () => {
    const priorityArea = getPriorityAreaFromNote({
      areas: WEAK_AREAS_BY_EXAM.TOEFL,
      weakAreas: ['Reading', 'Writing'],
      weakAreaNote: 'speaking이 어려움',
    })

    expect(priorityArea).toBe('')
  })
})

describe('createAdaptiveDailyStudyPlan', () => {
  const previousRecord = {
    studyDate: '2026-07-26',
    generatedTasks: [
      { id: 'reading-1', area: 'Reading', title: 'Reading 1', minutes: 20 },
      { id: 'reading-2', area: 'Reading', title: 'Reading 2', minutes: 20 },
      { id: 'speaking-1', area: 'Speaking', title: 'Speaking 1', minutes: 20 },
      { id: 'writing-1', area: 'Writing', title: 'Writing 1', minutes: 20 },
    ],
    completedTaskIds: ['speaking-1', 'writing-1'],
    actualStudyEntries: [],
    difficultArea: 'Speaking',
    nextPriorityArea: 'Reading',
    reflectionNote: '',
  }

  test('previousRecord가 없으면 기존 기본 계획과 같은 plan을 반환한다', () => {
    const result = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: ['Speaking'],
      previousRecord: null,
    })

    expect(result.plan).toEqual(createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: ['Speaking'],
    }))
    expect(result.reason).toBe('이전 기록이 없어 처음 선택한 취약 영역을 기준으로 계획을 만들었습니다.')
  })

  test('nextPriorityArea와 미완료 항목을 가장 크게 반영한다', () => {
    const result = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: ['Speaking'],
      previousRecord,
    })

    const reading = result.plan.find((item) => item.area === 'Reading')
    const speaking = result.plan.find((item) => item.area === 'Speaking')

    expect(result.priorityArea).toBe('Reading')
    expect(reading.adaptiveScore).toBeGreaterThan(speaking.adaptiveScore)
    expect(reading.minutes).toBeGreaterThan(speaking.minutes)
    expect(sumMinutes(result.plan)).toBe(120)
  })

  test('difficultArea와 기존 취약 영역 점수를 반영한다', () => {
    const result = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 100,
      weakAreas: ['Writing'],
      previousRecord: {
        ...previousRecord,
        generatedTasks: [],
        completedTaskIds: [],
        difficultArea: 'Writing',
        nextPriorityArea: '',
      },
    })

    expect(result.priorityArea).toBe('Writing')
    expect(result.plan.find((item) => item.area === 'Writing').adaptiveScore).toBe(4)
  })

  test('각 영역 최소 5분을 보장하고 총합을 정확히 맞춘다', () => {
    const result = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 23,
      weakAreas: ['Reading'],
      previousRecord,
    })

    expect(result.plan.every((item) => item.minutes >= 5)).toBe(true)
    expect(sumMinutes(result.plan)).toBe(23)
  })

  test('동점이면 nextPriorityArea, difficultArea, 기존 weakAreas, 시험 영역 순서로 우선한다', () => {
    const nextTie = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: [],
      previousRecord: { generatedTasks: [], completedTaskIds: [], difficultArea: 'Speaking', nextPriorityArea: 'Writing' },
    })
    const weakTie = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: ['Listening'],
      previousRecord: { generatedTasks: [], completedTaskIds: [], difficultArea: '', nextPriorityArea: '' },
    })

    expect(nextTie.priorityArea).toBe('Writing')
    expect(weakTie.priorityArea).toBe('Listening')
  })

  test('이전 task가 모두 완료된 영역은 감점한다', () => {
    const result = createAdaptiveDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 120,
      weakAreas: [],
      previousRecord: {
        generatedTasks: [{ id: 'listening-1', area: 'Listening', title: 'Listening', minutes: 20 }],
        completedTaskIds: ['listening-1'],
        difficultArea: '',
        nextPriorityArea: '',
      },
    })

    expect(result.plan.find((item) => item.area === 'Listening').adaptiveScore).toBe(-1)
  })
})
