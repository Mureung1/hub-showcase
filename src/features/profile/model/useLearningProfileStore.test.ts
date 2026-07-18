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

async function importStore(localStorage: Storage) {
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
  })

  it('restores a saved profile from localStorage', async () => {
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(savedProfile) })
    const useLearningProfileStore = await importStore(localStorage)

    expect(useLearningProfileStore.getState().profile).toEqual(savedProfile)
  })

  it('persists a profile when saving', async () => {
    const localStorage = createLocalStorage()
    const useLearningProfileStore = await importStore(localStorage)

    useLearningProfileStore.getState().saveProfile(savedProfile)

    expect(localStorage.setItem).toHaveBeenCalledWith(storageKey, JSON.stringify(savedProfile))
    expect(useLearningProfileStore.getState().profile).toEqual(savedProfile)
  })

  it('clears the persisted profile when resetting', async () => {
    const localStorage = createLocalStorage({ [storageKey]: JSON.stringify(savedProfile) })
    const useLearningProfileStore = await importStore(localStorage)

    useLearningProfileStore.getState().resetProfile()

    expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey)
    expect(useLearningProfileStore.getState().profile).toBeNull()
  })
})
