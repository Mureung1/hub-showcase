import { describe, expect, it } from 'vitest'
import { recommendTimetable } from './recommendTimetable'

function subject(overrides) {
  return {
    id: 1,
    name: '과목',
    credit: 3,
    category: '전공선택',
    department: '컴퓨터학부',
    required: false,
    prerequisite: [],
    pair_group: null,
    tier: 3,
    grade: '*',
    times: [],
    ...overrides,
  }
}

describe('recommendTimetable', () => {
  it('전공필수는 조건과 무관하게 항상 포함한다', () => {
    const required = subject({
      id: 1,
      name: '자료구조',
      required: true,
      credit: 3,
      times: [{ day: '월', start: '09:00', end: '10:30' }],
    })
    const elective = subject({
      id: 2,
      name: '교양A',
      credit: 3,
      times: [{ day: '화', start: '13:00', end: '14:30' }],
    })

    const results = recommendTimetable(
      { targetCredit: 3, freeDays: [], avoidMorning: false, completedIds: [] },
      [required, elective]
    )

    expect(results[0].lectures.map((l) => l.name)).toContain('자료구조')
  })

  it('선수과목을 이수하지 않았으면 후보에서 제외한다', () => {
    const prereq = subject({ id: 1, name: '프로그래밍기초', credit: 3 })
    const advanced = subject({
      id: 2,
      name: '자료구조',
      credit: 3,
      prerequisite: [1],
      times: [{ day: '월', start: '13:00', end: '14:30' }],
    })

    const withoutPrereq = recommendTimetable(
      { targetCredit: 3, freeDays: [], avoidMorning: false, completedIds: [] },
      [prereq, advanced]
    )
    expect(
      withoutPrereq.some((r) => r.lectures.some((l) => l.name === '자료구조'))
    ).toBe(false)

    const withPrereq = recommendTimetable(
      { targetCredit: 3, freeDays: [], avoidMorning: false, completedIds: [1] },
      [prereq, advanced]
    )
    expect(
      withPrereq.some((r) => r.lectures.some((l) => l.name === '자료구조'))
    ).toBe(true)
  })

  it('공강 요일에 있는 과목은 제외한다', () => {
    const monday = subject({
      id: 1,
      name: '월요과목',
      times: [{ day: '월', start: '13:00', end: '14:30' }],
    })
    const tuesday = subject({
      id: 2,
      name: '화요과목',
      times: [{ day: '화', start: '13:00', end: '14:30' }],
    })

    const results = recommendTimetable(
      { targetCredit: 3, freeDays: ['월'], avoidMorning: false, completedIds: [] },
      [monday, tuesday]
    )

    const names = results.flatMap((r) => r.lectures.map((l) => l.name))
    expect(names).not.toContain('월요과목')
  })

  it('목표 학점에 가장 가까운 조합을 우선 정렬한다', () => {
    const a = subject({ id: 1, name: 'A', credit: 3, times: [{ day: '월', start: '13:00', end: '14:30' }] })
    const b = subject({ id: 2, name: 'B', credit: 6, times: [{ day: '화', start: '13:00', end: '14:30' }] })

    const results = recommendTimetable(
      { targetCredit: 6, freeDays: [], avoidMorning: false, completedIds: [] },
      [a, b]
    )

    expect(results[0].totalCredit).toBe(6)
  })
})
