import { describe, expect, it, vi } from 'vitest'
import { generateMockCurriculum } from './curriculumGenerator'
import { persistGeneratedCurriculum } from './persistGeneratedCurriculum'

const plan = generateMockCurriculum('React 배우기')

describe('persistGeneratedCurriculum', () => {
  it('hydrates only the server-confirmed snapshot in server mode', async () => {
    const snapshot = { id: plan.id, goal: plan.goal, plan, generatedAt: '2026-07-28T00:00:00.000Z' }
    const saveLocal = vi.fn()
    const hydrate = vi.fn()

    await expect(persistGeneratedCurriculum({
      goal: plan.goal,
      plan,
      serverMode: true,
      saveServer: async () => ({ generatedCurriculum: snapshot }),
      saveLocal,
      hydrate,
    })).resolves.toEqual(snapshot)

    expect(saveLocal).not.toHaveBeenCalled()
    expect(hydrate).toHaveBeenCalledWith(snapshot)
  })

  it('does not create a local plan when server saving fails', async () => {
    const saveLocal = vi.fn()

    await expect(persistGeneratedCurriculum({
      goal: plan.goal,
      plan,
      serverMode: true,
      saveServer: async () => { throw new Error('save failed') },
      saveLocal,
      hydrate: vi.fn(),
    })).rejects.toThrow('save failed')

    expect(saveLocal).not.toHaveBeenCalled()
  })

  it('uses the existing local store only in explicit mock mode', async () => {
    const saveLocal = vi.fn()
    const saveServer = vi.fn()

    await persistGeneratedCurriculum({
      goal: plan.goal,
      plan,
      serverMode: false,
      saveServer,
      saveLocal,
      hydrate: vi.fn(),
    })

    expect(saveLocal).toHaveBeenCalledWith(plan.goal, plan)
    expect(saveServer).not.toHaveBeenCalled()
  })
})
