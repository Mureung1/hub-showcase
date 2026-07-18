import { create } from 'zustand'

export type LearningRunState = 'idle' | 'failed' | 'passed'

export type LearningActivityItem = {
  id: string
  time: string
  title: string
  detail: string
}

export type LearningMissionProgress = {
  missionId: string
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  completedAt: string | null
  activityLog: LearningActivityItem[]
}

type PersistedLearningProgress = {
  missions?: Record<string, Partial<LearningMissionProgress>>
}

type MissionProgressInput = {
  missionId: string
  runState: LearningRunState
  runAttemptCount: number
  activeStepOffset: number
  activityLog: LearningActivityItem[]
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
  recordRunResult: (input: MissionProgressInput) => void
  recordMissionActivity: (input: MissionActivityInput) => void
  advanceMissionStep: (input: MissionAdvanceInput) => void
  resetMissionProgress: (missionId: string) => void
  resetAllProgress: () => void
}

const storageKey = 'icu.learningProgress'

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
  }
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
    const missions = parsed.missions ?? {}

    return Object.fromEntries(
      Object.entries(missions).map(([missionId, progress]) => [
        missionId,
        createMissionProgress(missionId, progress),
      ]),
    )
  } catch {
    return {}
  }
}

function persistProgress(missions: Record<string, LearningMissionProgress>) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify({ missions }))
}

export const useLearningProgressStore = create<LearningProgressState>((set, get) => ({
  missions: readStoredProgress(),
  getMissionProgress: (missionId) => get().missions[missionId],
  recordRunResult: ({ missionId, runState, runAttemptCount, activeStepOffset, activityLog }) => {
    set((state) => {
      const current = state.missions[missionId]
      const nextMissions = {
        ...state.missions,
        [missionId]: createMissionProgress(missionId, {
          ...current,
          runState,
          runAttemptCount,
          activeStepOffset,
          activityLog,
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
          completedAt: new Date().toISOString(),
          activityLog,
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
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ missions: {} })
  },
}))