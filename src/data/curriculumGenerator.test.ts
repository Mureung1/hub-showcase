import { describe, expect, it } from 'vitest'
import { generateMockCurriculum } from './curriculumGenerator'

describe('generateMockCurriculum', () => {
  it('creates a DevOps roadmap from a career goal', () => {
    const plan = generateMockCurriculum('DEVOPS 엔지니어가 되고 싶어')

    expect(plan.title).toContain('DevOps')
    expect(plan.todayMission.fileName).toBe('ops-checklist.sh')
    expect(plan.steps.map((step) => step.title)).toContain('컨테이너와 배포')
    expect(plan.sources.length).toBeGreaterThanOrEqual(2)
  })

  it('keeps the entered goal in the generated plan', () => {
    const plan = generateMockCurriculum('FastAPI로 API 서버 만들고 싶어')

    expect(plan.goal).toBe('FastAPI로 API 서버 만들고 싶어')
    expect(plan.title).toContain('FastAPI')
    expect(plan.todayMission.fileName).toBe('main.py')
  })

  it('falls back to an actionable curriculum for an empty goal', () => {
    const plan = generateMockCurriculum('   ')

    expect(plan.goal).toBeTruthy()
    expect(plan.steps.length).toBeGreaterThanOrEqual(3)
    expect(plan.todayMission.durationMinutes).toBeGreaterThan(0)
  })
})
