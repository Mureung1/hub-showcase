import { describe, expect, it, vi } from 'vitest'
import { saveWorkspaceProgress } from './saveWorkspaceProgress'

const request = {
  runState: 'passed' as const,
  runAttemptCount: 1,
  activeStepOffset: 0,
  activityLog: [],
}

describe('saveWorkspaceProgress', () => {
  it('upserts only the server-confirmed progress', async () => {
    const progress = { missionId: 'mission-1', ...request, completedAt: null, lastTestResult: null }
    const upsert = vi.fn()

    await expect(saveWorkspaceProgress('mission-1', request, {
      save: async () => ({ progress }),
      upsert,
    })).resolves.toEqual(progress)

    expect(upsert).toHaveBeenCalledWith(progress)
  })

  it('surfaces saving failures without upserting a local substitute', async () => {
    const upsert = vi.fn()

    await expect(saveWorkspaceProgress('mission-1', request, {
      save: async () => { throw new Error('save failed') },
      upsert,
    })).rejects.toThrow('save failed')

    expect(upsert).not.toHaveBeenCalled()
  })
})
