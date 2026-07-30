import { describe, expect, it } from 'vitest'
import { createFallbackCurriculumPlan } from '../api/curriculumClient'
import { createGeneratedMissionId } from '../../learning-workspace/workspaceInteraction'
import { createCurriculumProgressContext } from './curriculumProgressContext'

describe('createCurriculumProgressContext', () => {
  it('maps the active generated mission progress to completed curriculum steps', () => {
    const plan = createFallbackCurriculumPlan('React 배우기')
    const missionId = createGeneratedMissionId(plan.id)

    expect(
      createCurriculumProgressContext(plan, {
        missionId,
        runState: 'passed',
        runAttemptCount: 2,
        activeStepOffset: 2,
        completedAt: null,
        activityLog: [],
        lastTestResult: {
          passed: 3,
          total: 3,
          ranAt: '2026-07-29T12:00:00.000Z',
        },
      }),
    ).toEqual({
      missionId,
      activeStepOffset: 2,
      completedStepIds: plan.steps.slice(0, 2).map((step) => step.id),
      completedAt: null,
      lastTestResult: {
        passed: 3,
        total: 3,
        ranAt: '2026-07-29T12:00:00.000Z',
      },
    })
  })

  it('returns an empty first-step context when the mission has no saved progress', () => {
    const plan = createFallbackCurriculumPlan('React 배우기')

    expect(createCurriculumProgressContext(plan)).toEqual({
      missionId: createGeneratedMissionId(plan.id),
      activeStepOffset: 0,
      completedStepIds: [],
      completedAt: null,
      lastTestResult: null,
    })
  })
})
