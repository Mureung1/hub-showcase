import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LearningActivityItem, LearningMissionProgress } from './useLearningProgressStore'

const storageKey = 'icu.learningProgress'

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
  const module = await import('./useLearningProgressStore')

  return module.useLearningProgressStore
}

const activityLog: LearningActivityItem[] = [
  { id: 'run', time: '10:20', title: '코드 실행', detail: '테스트를 실행했습니다.' },
]

const savedMission: LearningMissionProgress = {
  missionId: 'generated-first-mission',
  runState: 'passed',
  runAttemptCount: 2,
  activeStepOffset: 1,
  completedAt: '2026-07-14T12:00:00.000Z',
  activityLog,
}

describe('useLearningProgressStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
  })

  it('restores mission progress from localStorage', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ missions: { [savedMission.missionId]: savedMission } }),
    })
    const useLearningProgressStore = await importStore(localStorage)

    expect(useLearningProgressStore.getState().getMissionProgress(savedMission.missionId)).toEqual(
      savedMission,
    )
  })

  it('persists run results for a mission', async () => {
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().recordRunResult({
      missionId: 'counter-mission',
      runState: 'failed',
      runAttemptCount: 1,
      activeStepOffset: 1,
      activityLog,
    })

    const progress = useLearningProgressStore.getState().getMissionProgress('counter-mission')
    expect(progress?.runState).toBe('failed')
    expect(progress?.runAttemptCount).toBe(1)
    expect(localStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify({ missions: { 'counter-mission': progress } }),
    )
  })

  it('records step advancement and resets run state for the next step', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T12:30:00.000Z'))
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().advanceMissionStep({
      missionId: 'generated-first-mission',
      activeStepOffset: 2,
      activityLog,
    })

    const progress = useLearningProgressStore
      .getState()
      .getMissionProgress('generated-first-mission')
    expect(progress?.runState).toBe('idle')
    expect(progress?.runAttemptCount).toBe(0)
    expect(progress?.activeStepOffset).toBe(2)
    expect(progress?.completedAt).toBe('2026-07-14T12:30:00.000Z')
    vi.useRealTimers()
  })

  it('clears persisted progress when resetting all progress', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ missions: { [savedMission.missionId]: savedMission } }),
    })
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().resetAllProgress()

    expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey)
    expect(useLearningProgressStore.getState().missions).toEqual({})
  })
})