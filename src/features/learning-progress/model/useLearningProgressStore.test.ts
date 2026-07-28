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

async function importStore(localStorage: Storage, mode: 'mock' | 'server' = 'mock') {
  vi.stubEnv('VITE_ICU_API_MODE', mode)
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
  lastTestResult: { passed: 2, total: 3, ranAt: '2026-07-14T11:59:00.000Z' },
}

describe('useLearningProgressStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
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


  it('hydrates mission progress from a server response', async () => {
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().hydrateMissionProgress({
      [savedMission.missionId]: savedMission,
    })

    expect(useLearningProgressStore.getState().missions).toEqual({
      [savedMission.missionId]: savedMission,
    })
    expect(localStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify({ missions: { [savedMission.missionId]: savedMission } }),
    )
  })

  it('ignores and does not persist local progress in server mode', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ missions: { [savedMission.missionId]: savedMission } }),
    })
    const useLearningProgressStore = await importStore(localStorage, 'server')

    expect(useLearningProgressStore.getState().missions).toEqual({})
    expect(localStorage.getItem).not.toHaveBeenCalled()

    useLearningProgressStore.getState().hydrateMissionProgress({ [savedMission.missionId]: savedMission })
    expect(useLearningProgressStore.getState().missions).toEqual({ [savedMission.missionId]: savedMission })
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('upserts one mission progress item from a server response', async () => {
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().upsertMissionProgress(savedMission)

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

  it('stores lastTestResult from a run and keeps it on a later step advance without a new result', async () => {
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().recordRunResult({
      missionId: 'counter-mission',
      runState: 'passed',
      runAttemptCount: 1,
      activeStepOffset: 1,
      activityLog,
      lastTestResult: { passed: 4, total: 4, ranAt: '2026-07-14T12:00:00.000Z' },
    })

    expect(
      useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
    ).toEqual({ passed: 4, total: 4, ranAt: '2026-07-14T12:00:00.000Z' })

    useLearningProgressStore.getState().recordRunResult({
      missionId: 'counter-mission',
      runState: 'passed',
      runAttemptCount: 1,
      activeStepOffset: 2,
      activityLog,
    })

    expect(
      useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
    ).toEqual({ passed: 4, total: 4, ranAt: '2026-07-14T12:00:00.000Z' })
  })

  it('collapses a malformed lastTestResult with a non-number passed value to null', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({
        missions: {
          'counter-mission': {
            missionId: 'counter-mission',
            runState: 'passed',
            runAttemptCount: 1,
            activeStepOffset: 1,
            completedAt: null,
            activityLog,
            lastTestResult: { passed: 'not-a-number', total: 3, ranAt: '2026-07-14T12:00:00.000Z' },
          },
        },
      }),
    })
    const useLearningProgressStore = await importStore(localStorage)

    expect(
      useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
    ).toBeNull()
  })

  it('collapses a malformed lastTestResult missing ranAt to null', async () => {
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().upsertMissionProgress({
      missionId: 'counter-mission',
      runState: 'passed',
      runAttemptCount: 1,
      activeStepOffset: 1,
      completedAt: null,
      activityLog,
      lastTestResult: { passed: 2, total: 3 } as unknown as LearningMissionProgress['lastTestResult'],
    })

    expect(
      useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
    ).toBeNull()
  })

  it('collapses a non-object lastTestResult value to null', async () => {
    const localStorage = createLocalStorage()
    const useLearningProgressStore = await importStore(localStorage)

    useLearningProgressStore.getState().upsertMissionProgress({
      missionId: 'counter-mission',
      runState: 'passed',
      runAttemptCount: 1,
      activeStepOffset: 1,
      completedAt: null,
      activityLog,
      lastTestResult: 'not-an-object' as unknown as LearningMissionProgress['lastTestResult'],
    })

    expect(
      useLearningProgressStore.getState().getMissionProgress('counter-mission')?.lastTestResult,
    ).toBeNull()
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
