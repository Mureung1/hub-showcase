import { describe, expect, it, vi } from 'vitest'
import { createFallbackCurriculumPlan } from '../curriculum/api/curriculumClient'
import type { GeneratedCurriculumSnapshot } from '../curriculum/model/useGeneratedCurriculumStore'
import type { LearningMissionProgress } from '../learning-progress/model/useLearningProgressStore'
import { loadWorkspaceServerState } from './loadWorkspaceServerState'

describe('loadWorkspaceServerState', () => {
  it('hydrates curriculum and progress only after every server read succeeds', async () => {
    const curriculum: GeneratedCurriculumSnapshot = {
      id: 'curriculum-1',
      goal: '프론트엔드 개발자',
      plan: createFallbackCurriculumPlan('프론트엔드 개발자'),
      generatedAt: '2026-07-28T08:00:00.000Z',
    }
    const progress: Record<string, LearningMissionProgress> = {
      'generated-today-mission': {
        missionId: 'generated-today-mission',
        runState: 'passed',
        runAttemptCount: 1,
        activeStepOffset: 1,
        completedAt: null,
        activityLog: [],
        lastTestResult: null,
      },
    }
    const hydrateCurriculum = vi.fn()
    const hydrateProgress = vi.fn()

    await loadWorkspaceServerState({
      loadProfile: vi.fn().mockResolvedValue(null),
      loadCurriculum: vi.fn().mockResolvedValue({ generatedCurriculum: curriculum }),
      loadProgress: vi.fn().mockResolvedValue({ missions: progress }),
      hydrateCurriculum,
      hydrateProgress,
    })

    expect(hydrateCurriculum).toHaveBeenCalledWith(curriculum)
    expect(hydrateProgress).toHaveBeenCalledWith(progress)
  })

  it('does not hydrate partial responses when a server read fails', async () => {
    const hydrateCurriculum = vi.fn()
    const hydrateProgress = vi.fn()

    await expect(loadWorkspaceServerState({
      loadProfile: vi.fn().mockResolvedValue(null),
      loadCurriculum: vi.fn().mockResolvedValue({ generatedCurriculum: null }),
      loadProgress: vi.fn().mockRejectedValue(new Error('progress unavailable')),
      hydrateCurriculum,
      hydrateProgress,
    })).rejects.toThrow('progress unavailable')

    expect(hydrateCurriculum).not.toHaveBeenCalled()
    expect(hydrateProgress).not.toHaveBeenCalled()
  })
})
