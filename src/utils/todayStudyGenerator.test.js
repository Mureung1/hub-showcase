import { describe, expect, test } from 'vitest'
import { createDailyStudyPlan } from './studyPlanGenerator'
import { createTodayStudyTasks } from './todayStudyGenerator'

function sumMinutes(tasks) {
  return tasks.reduce((totalMinutes, task) => totalMinutes + task.minutes, 0)
}

describe('createTodayStudyTasks', () => {
  test('TOEIC LC와 RC는 서로 다른 학습 항목을 생성한다', () => {
    const dailyStudyPlan = createDailyStudyPlan({
      examType: 'TOEIC',
      dailyStudyMinutes: 120,
      weakAreas: ['RC'],
    })

    const tasks = createTodayStudyTasks({ examType: 'TOEIC', dailyStudyPlan })
    const lcTitles = tasks.filter((task) => task.area === 'LC').map((task) => task.title)
    const rcTitles = tasks.filter((task) => task.area === 'RC').map((task) => task.title)

    expect(lcTitles.length).toBeGreaterThan(0)
    expect(rcTitles.length).toBeGreaterThan(0)
    expect(lcTitles).not.toEqual(rcTitles)
  })

  test('TOEFL Speaking 전용 학습 항목을 생성한다', () => {
    const dailyStudyPlan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 80,
      weakAreas: ['Speaking'],
    })

    const tasks = createTodayStudyTasks({ examType: 'TOEFL', dailyStudyPlan })
    const speakingTitles = tasks.filter((task) => task.area === 'Speaking').map((task) => task.title)

    expect(speakingTitles).toContain('Speaking 답변 구조 1개 설계')
  })

  test('생성된 모든 항목의 minutes 합은 dailyStudyPlan 전체 시간과 정확히 같다', () => {
    const dailyStudyPlan = createDailyStudyPlan({
      examType: 'TOEFL',
      dailyStudyMinutes: 101,
      weakAreas: ['Speaking', 'Writing'],
    })

    const tasks = createTodayStudyTasks({ examType: 'TOEFL', dailyStudyPlan })

    expect(sumMinutes(tasks)).toBe(101)
  })
})
