import { create } from 'zustand'
import { shouldUseServerApi } from '../../../app/icuApiMode'

export type LearningRunState = 'idle' | 'failed' | 'passed'

export type LearningActivityItem = {
  id: string
  time: string
  title: string
  detail: string
}

export type LearningTestResult = {
  passed: number
  total: number
  ranAt: string
}

export type LearningMissionProgress = {
  missionId: string
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt: string | null
  activityLog: LearningActivityItem[]
  lastTestResult: LearningTestResult | null
}

type PersistedLearningProgress = {
  missions?: Record<string, Partial<LearningMissionProgress>>
}

type MissionProgressInput = {
  missionId: string
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt?: string | null
  activityLog: LearningActivityItem[]
  lastTestResult?: LearningTestResult | null
}

type MissionActivityInput = {
  missionId: string
  activeStepOffset: number
  activityLog: LearningActivityItem[]
}

type MissionAdvanceInput = {
  missionId: string
  activeStepOffset: number
  activityLog: LearningActivityItem[]
}

type LearningProgressState = {
  missions: Record<string, LearningMissionProgress>
  getMissionProgress: (missionId: string) => LearningMissionProgress | undefined
  hydrateMissionProgress: (missions: Record<string, Partial<LearningMissionProgress>>) => void
  upsertMissionProgress: (progress: Partial<LearningMissionProgress> & { missionId: string }) => void
  recordRunResult: (input: MissionProgressInput) => void
  recordMissionActivity: (input: MissionActivityInput) => void
  advanceMissionStep: (input: MissionAdvanceInput) => void
  resetMissionProgress: (missionId: string) => void
  resetAllProgress: () => void
}

const storageKey = 'icu.learningProgress'
const serverMode = shouldUseServerApi()

function createMissionProgress(
  missionId: string,
  input: Partial<LearningMissionProgress> = {},
): LearningMissionProgress {
  return {
    missionId,
    runState: input.runState === 'failed' || input.runState === 'passed' ? input.runState : 'idle',
    runAttemptCount: Number.isFinite(input.runAttemptCount) ? input.runAttemptCount ?? 0 : 0,
    activeStepOffset: Number.isFinite(input.activeStepOffset) ? input.activeStepOffset ?? 0 : 0,
    completedAt: typeof input.completedAt === 'string' ? input.completedAt : null,
    activityLog: Array.isArray(input.activityLog) ? input.activityLog.slice(0, 5) : [],
    lastTestResult: normalizeTestResult(input.lastTestResult),
  }
}

function normalizeTestResult(value: unknown): LearningTestResult | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Partial<LearningTestResult>
  const passed = typeof record.passed === 'number' && Number.isFinite(record.passed)
    ? Math.round(record.passed)
    : null
  const total = typeof record.total === 'number' && Number.isFinite(record.total)
    ? Math.round(record.total)
    : null
  const ranAt = typeof record.ranAt === 'string' ? record.ranAt : null

  if (passed === null || total === null || !ranAt) return null

  return { passed, total, ranAt }
}

function normalizeMissions(
  missions: Record<string, Partial<LearningMissionProgress>>,
): Record<string, LearningMissionProgress> {
  return Object.fromEntries(
    Object.entries(missions).map(([missionId, progress]) => [
      missionId,
      createMissionProgress(progress.missionId ?? missionId, progress),
    ]),
  )
}

function readStoredProgress(): Record<string, LearningMissionProgress> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawProgress = window.localStorage.getItem(storageKey)

    if (!rawProgress) {
      return {}
    }

    const parsed = JSON.parse(rawProgress) as PersistedLearningProgress

    return normalizeMissions(parsed.missions ?? {})
  } catch {
    return {}
  }
}

function persistProgress(missions: Record<string, LearningMissionProgress>) {
  if (serverMode || typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify({ missions }))
}

export const useLearningProgressStore = create<LearningProgressState>((set, get) => ({
  missions: serverMode ? {} : readStoredProgress(),
  getMissionProgress: (missionId) => get().missions[missionId],
  hydrateMissionProgress: (missions) => {
    const nextMissions = normalizeMissions(missions)
    persistProgress(nextMissions)
    set({ missions: nextMissions })
  },
  upsertMissionProgress: (progress) => {
    set((state) => {
      const nextMissions = {
        ...state.missions,
        [progress.missionId]: createMissionProgress(progress.missionId, progress),
      }
      persistProgress(nextMissions)

      return { missions: nextMissions }
    })
  },
  recordRunResult: ({
    missionId,
    runState,
    runAttemptCount,
    activeStepOffset,
    completedAt,
    activityLog,
    lastTestResult,
  }) => {
    set((state) => {
      const current = state.missions[missionId]
      const nextCompletedAt =
        completedAt !== undefined ? completedAt : current?.completedAt ?? null
      const nextLastTestResult =
        lastTestResult !== undefined ? lastTestResult : current?.lastTestResult ?? null
      const nextMissions = {
        ...state.missions,
        [missionId]: createMissionProgress(missionId, {
          ...current,
          runState,
          runAttemptCount,
          activeStepOffset,
          completedAt: nextCompletedAt,
          activityLog,
          lastTestResult: nextLastTestResult,
        }),
      }

      persistProgress(nextMissions)

      return { missions: nextMissions }
    })
  },
  recordMissionActivity: ({ missionId, activeStepOffset, activityLog }) => {
    set((state) => {
      const current = state.missions[missionId]
      const nextMissions = {
        ...state.missions,
        [missionId]: createMissionProgress(missionId, {
          ...current,
          activeStepOffset,
          activityLog,
        }),
      }

      persistProgress(nextMissions)

      return { missions: nextMissions }
    })
  },
  advanceMissionStep: ({ missionId, activeStepOffset, activityLog }) => {
    set((state) => {
      const current = state.missions[missionId]
      const nextMissions = {
        ...state.missions,
        [missionId]: createMissionProgress(missionId, {
          ...current,
          runState: 'idle',
          runAttemptCount: 0,
          activeStepOffset,
          completedAt: null,
          activityLog,
          lastTestResult: null,
        }),
      }

      persistProgress(nextMissions)

      return { missions: nextMissions }
    })
  },
  resetMissionProgress: (missionId) => {
    set((state) => {
      const nextMissions = { ...state.missions }
      delete nextMissions[missionId]
      persistProgress(nextMissions)

      return { missions: nextMissions }
    })
  },
  resetAllProgress: () => {
    if (!serverMode && typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ missions: {} })
  },
}))
