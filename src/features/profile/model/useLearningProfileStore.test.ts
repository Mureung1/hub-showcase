import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningProfile } from './profileTypes'

const storageKey = 'icu.learningProfile'

function createLocalStorage(initialEntries: Record<string, string> = {}) {
  const storage = new Map(Object.entries(initialEntries))

  return {
    get length() {
      return storage.size
    },
    clear: vi.fn(() => storage.clear()),
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
    removeItem: vi.fn((key: string) => storage.delete(key)),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  } as Storage
}

async function importStore(localStorage: Storage, mode: 'mock' | 'server' = 'mock') {
  vi.stubEnv('VITE_ICU_API_MODE', mode)
  vi.stubGlobal('window', { localStorage })
  const module = await import('./useLearningProfileStore')

  return module.useLearningProfileStore
}

const savedProfile: LearningProfile = {
  displayName: '예린',
  learningGoal: 'DEVOPS 엔지니어가 되고 싶어',
  preferredTracks: ['React', 'FastAPI'],
  dailyStudyMinutes: 30,
  level: 'beginner',
}

describe('useLearningProfileStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('restores a saved profile from localStorage', async () => {
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(savedProfile) })
    const useLearningProfileStore = await importStore(localStorage)

    expect(useLearningProfileStore.getState().profile).toEqual(savedProfile)
  })

  it('persists a profile when saving', async () => {
    const localStorage = createLocalStorage()
    const useLearningProfileStore = await importStore(localStorage)

    await useLearningProfileStore.getState().saveProfile(savedProfile)

    expect(localStorage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify(savedProfile))
    expect(useLearningProfileStore.getState().profile).toEqual(savedProfile)
  })

  it('clears the persisted profile when resetting', async () => {
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(savedProfile) })
    const useLearningProfileStore = await importStore(localStorage)

    await useLearningProfileStore.getState().resetProfile()

    expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey)
    expect(useLearningProfileStore.getState().profile).toBeNull()
  })

  it('does not hydrate user data from localStorage in server mode', async () => {
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(savedProfile) })
    const useLearningProfileStore = await importStore(localStorage, 'server')

    expect(useLearningProfileStore.getState().profile).toBeNull()
    expect(localStorage.getItem).not.toHaveBeenCalled()
  })

  it('loads and saves only server-confirmed profiles in server mode', async () => {
    const localStorage = createLocalStorage()
    const useLearningProfileStore = await importStore(localStorage, 'server')
    const loadedProfile = { ...savedProfile, displayName: '서버 사용자' }
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ profile: loadedProfile }))
      .mockResolvedValueOnce(response({ profile: savedProfile })) as unknown as typeof fetch

    await useLearningProfileStore.getState().loadProfile(fetchImpl)
    expect(useLearningProfileStore.getState()).toMatchObject({
      profile: loadedProfile,
      status: 'ready',
      error: null,
    })

    await useLearningProfileStore.getState().saveProfile(savedProfile, fetchImpl)
    expect(useLearningProfileStore.getState()).toMatchObject({
      profile: savedProfile,
      status: 'ready',
      error: null,
    })
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('keeps the current profile and exposes an error when server saving fails', async () => {
    const localStorage = createLocalStorage()
    const useLearningProfileStore = await importStore(localStorage, 'server')
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response({ profile: savedProfile }))
      .mockResolvedValueOnce(response({}, false, 503)) as unknown as typeof fetch

    await useLearningProfileStore.getState().loadProfile(fetchImpl)
    await expect(
      useLearningProfileStore.getState().saveProfile({ ...savedProfile, displayName: '변경' }, fetchImpl),
    ).rejects.toThrow('Profile request failed (503)')

    expect(useLearningProfileStore.getState()).toMatchObject({
      profile: savedProfile,
      status: 'error',
    })
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })
})

function response(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body }
}
