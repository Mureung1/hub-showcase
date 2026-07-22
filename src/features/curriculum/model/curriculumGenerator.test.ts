import { describe, expect, it } from 'vitest'
import { generateMockCurriculum } from './curriculumGenerator'

describe('generateMockCurriculum', () => {
  it('creates a frontend curriculum from a React goal', () => {
    const plan = generateMockCurriculum('React로 프론트엔드 개발자가 되고 싶어')

    expect(plan.title).toBe('프론트엔드 개발자 커리큘럼')
    expect(plan.todayMission.fileName).toBe('App.jsx')
    expect(plan.steps.map((step) => step.title)).toContain('HTML 구조와 시맨틱')
    expect(plan.todayMission.detail).toBe('자기소개 페이지를 시맨틱 태그로만 구성해보기')
  })

  it('creates a backend curriculum from an API goal', () => {
    const plan = generateMockCurriculum('FastAPI로 API 서버 만들고 싶어')

    expect(plan.goal).toBe('FastAPI로 API 서버 만들고 싶어')
    expect(plan.title).toBe('백엔드 개발자 커리큘럼')
    expect(plan.todayMission.fileName).toBe('main.py')
  })

  it('creates curriculums for fullstack, DevOps, and software engineering goals', () => {
    expect(generateMockCurriculum('풀스택 개발자가 되고 싶어').title).toBe('풀스택 개발자 커리큘럼')
    expect(generateMockCurriculum('DEVOPS 엔지니어가 되고 싶어').title).toBe(
      'DevOps 엔지니어 커리큘럼',
    )
    expect(generateMockCurriculum('자료구조와 알고리즘을 공부하고 싶어').title).toBe(
      '소프트웨어 엔지니어 (CS/설계 기초) 커리큘럼',
    )
  })

  it('falls back to the frontend curriculum for an empty goal', () => {
    const plan = generateMockCurriculum('   ')

    expect(plan.goal).toBeTruthy()
    expect(plan.title).toBe('프론트엔드 개발자 커리큘럼')
    expect(plan.steps.length).toBe(3)
    expect(plan.todayMission.durationMinutes).toBeGreaterThan(0)
  })

  it('fills the generated plan fields from curriculum data', () => {
    const plan = generateMockCurriculum('백엔드 개발자')

    expect(plan.id).toBe('backend-curriculum-plan')
    expect(plan.summary).toContain('HTTP 요청-응답 흐름')
    expect(plan.estimatedDuration).toBe('15주 로드맵')
    expect(plan.focusRole).toBe('백엔드 개발자')
    expect(plan.sources.length).toBeGreaterThanOrEqual(3)
    expect(plan.sources.every((source) => source.urlLabel.length > 0)).toBe(true)
  })

  it('maps reference resources to practice guide sources', () => {
    const plan = generateMockCurriculum('CS 설계 기초를 배우고 싶어')

    expect(plan.sources.some((source) => source.type === 'practice_guide')).toBe(true)
  })
})