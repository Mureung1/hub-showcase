import { describe, expect, it } from 'vitest'
import { createInMemoryLearningProgressRepository } from '../modules/learning-progress/adapters/inMemoryLearningProgressRepository.mjs'
import { handleLearningProgressApiRequest } from './learningProgressRoutes.mjs'

describe('learning progress routes', () => {
  it('saves and returns mission progress', async () => {
    const progressRepository = createInMemoryLearningProgressRepository()

    await expect(
      handleLearningProgressApiRequest({
        method: 'POST',
        url: '/api/progress/missions/generated-first-mission',
        bodyText: JSON.stringify({
          runState: 'passed',
          runAttemptCount: 2,
          activeStepOffset: 1,
          activityLog: [{ id: 'a1', time: '09:00', title: '실행 성공', detail: '테스트 통과' }],
        }),
        progressRepository,
      }),
    ).resolves.toMatchObject({
      status: 200,
      body: {
        progress: {
          missionId: 'generated-first-mission',
          runState: 'passed',
          runAttemptCount: 2,
        },
      },
    })

    await expect(
      handleLearningProgressApiRequest({
        method: 'GET',
        url: '/api/progress/today',
        bodyText: '',
        progressRepository,
      }),
    ).resolves.toMatchObject({
      status: 200,
      body: { missions: { 'generated-first-mission': { runState: 'passed' } } },
    })
  })

  it('returns null for unrelated routes', async () => {
    await expect(
      handleLearningProgressApiRequest({
        method: 'GET',
        url: '/api/curriculum/recommend',
        bodyText: '',
        progressRepository: createInMemoryLearningProgressRepository(),
      }),
    ).resolves.toBeNull()
  })
})