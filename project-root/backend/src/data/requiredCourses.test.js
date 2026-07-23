import { describe, expect, it } from 'vitest'
import requiredCourses from './requiredCourses.js'

const { requiredCoursesByDepartment } = requiredCourses

describe('requiredCoursesByDepartment', () => {
  it('컴퓨터학부 목록을 포함한다', () => {
    expect(requiredCoursesByDepartment).toHaveProperty('컴퓨터학부')
    expect(requiredCoursesByDepartment['컴퓨터학부']).toContain('자료구조')
  })

  it('중복 과목명이 없다', () => {
    for (const courses of Object.values(requiredCoursesByDepartment)) {
      expect(new Set(courses).size).toBe(courses.length)
    }
  })
})
