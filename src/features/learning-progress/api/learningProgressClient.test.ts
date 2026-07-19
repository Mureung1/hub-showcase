import { describe, expect, it, vi } from 'vitest'
import {
  deleteMissionProgress,
  getTodayProgress,
  missionProgressEndpoint,
  resetAllLearningProgress,
  saveMissionProgress,
} from './learningProgressClient'

describe('learningProgressClient', () => {
  it('fetches today progress', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ missions: {} }) })) as unknown as typeof fetch

    await expect(getTodayProgress(fetchImpl)).resolves.toEqual({ missions: {} })
    expect(fetchImpl).toHaveBeenCalledWith('/api/progress/today')
  })

  it('saves mission progress', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ progress: { missionId: 'm1', runState: 'passed', runAttemptCount: 1, activeStepOffset: 0, completedAt: null, activityLog: [] } }),
    })) as unknown as typeof fetch

    await saveMissionProgress('m1', { runState: 'passed', runAttemptCount: 1, activeStepOffset: 0, activityLog: [] }, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(missionProgressEndpoint('m1'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runState: 'passed', runAttemptCount: 1, activeStepOffset: 0, activityLog: [] }),
    })
  })

  it('deletes mission progress and resets all progress', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch

    await deleteMissionProgress('m1', fetchImpl)
    await resetAllLearningProgress(fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(missionProgressEndpoint('m1'), { method: 'DELETE' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/progress', { method: 'DELETE' })
  })
})