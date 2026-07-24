import { create } from 'zustand'
import type {
  CurriculumSource,
  GeneratedCurriculumPlan,
  GeneratedCurriculumStep,
  WorkspaceMode,
} from './curriculumGenerator'

export type GeneratedCurriculumSnapshot = {
  id?: string
  goal: string
  plan: GeneratedCurriculumPlan
  generatedAt: string
  updatedAt?: string
}

type PersistedGeneratedCurriculum = Partial<GeneratedCurriculumSnapshot>

type GeneratedCurriculumStore = {
  generatedCurriculum: GeneratedCurriculumSnapshot | null
  history: GeneratedCurriculumSnapshot[]
  hydrateGeneratedCurriculum: (snapshot: GeneratedCurriculumSnapshot | null) => void
  hydrateHistory: (history: GeneratedCurriculumSnapshot[]) => void
  saveGeneratedCurriculum: (goal: string, plan: GeneratedCurriculumPlan) => void
  activateCurriculumSnapshot: (snapshotId: string) => void
  deleteCurriculumSnapshot: (snapshotId: string) => void
  resetGeneratedCurriculum: () => void
}

const storageKey = 'icu.generatedCurriculum'
const historyStorageKey = 'icu.generatedCurriculumHistory'
const defaultMissionMinutes = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeWorkspaceMode(value: unknown): WorkspaceMode | undefined {
  return value === 'react' || value === 'linux' || value === 'docker' || value === 'python' ? value : undefined
}

function normalizeDurationMinutes(value: unknown) {
  const duration = Number(value)

  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : defaultMissionMinutes
}

function normalizeStep(step: unknown): GeneratedCurriculumStep | null {
  if (!isRecord(step)) {
    return null
  }

  const id = normalizeString(step.id)
  const title = normalizeString(step.title)

  if (!id || !title) {
    return null
  }

  return {
    id,
    title,
    detail: normalizeString(step.detail),
    outcome: normalizeString(step.outcome),
    durationLabel: normalizeString(step.durationLabel),
  }
}

function normalizeSource(source: unknown): CurriculumSource | null {
  if (!isRecord(source)) {
    return null
  }

  const title = normalizeString(source.title)
  const urlLabel = normalizeString(source.urlLabel)

  if (!title || !urlLabel) {
    return null
  }

  return {
    title,
    type: source.type === 'practice_guide' ? 'practice_guide' : 'official_docs',
    urlLabel,
  }
}

function normalizePlan(plan: unknown): GeneratedCurriculumPlan | null {
  if (!isRecord(plan) || !isRecord(plan.todayMission)) {
    return null
  }

  const id = normalizeString(plan.id)
  const goal = normalizeString(plan.goal)
  const title = normalizeString(plan.title)
  const steps = Array.isArray(plan.steps) ? plan.steps.flatMap((step) => {
    const normalizedStep = normalizeStep(step)

    return normalizedStep ? [normalizedStep] : []
  }) : []
  const sources = Array.isArray(plan.sources) ? plan.sources.flatMap((source) => {
    const normalizedSource = normalizeSource(source)

    return normalizedSource ? [normalizedSource] : []
  }) : []

  if (!id || !goal || !title || steps.length === 0) {
    return null
  }

  return {
    id,
    goal,
    title,
    summary: normalizeString(plan.summary),
    estimatedDuration: normalizeString(plan.estimatedDuration),
    focusRole: normalizeString(plan.focusRole),
    todayMission: {
      title: normalizeString(plan.todayMission.title),
      detail: normalizeString(plan.todayMission.detail),
      durationMinutes: normalizeDurationMinutes(plan.todayMission.durationMinutes),
      fileName: normalizeString(plan.todayMission.fileName),
      mode: normalizeWorkspaceMode(plan.todayMission.mode),
    },
    steps,
    sources,
  }
}

function normalizeSnapshot(snapshot: PersistedGeneratedCurriculum): GeneratedCurriculumSnapshot | null {
  const goal = normalizeString(snapshot.goal)
  const generatedAt = normalizeString(snapshot.generatedAt)
  const plan = normalizePlan(snapshot.plan)
  const id = normalizeString(snapshot.id) || plan?.id || `${goal}-curriculum-plan`

  if (!goal || !generatedAt || !plan) {
    return null
  }

  return { id, goal, plan, generatedAt, updatedAt: normalizeString(snapshot.updatedAt) }
}

function createSnapshot(goal: string, plan: GeneratedCurriculumPlan): GeneratedCurriculumSnapshot {
  const now = new Date().toISOString()
  return {
    id: plan.id || `${goal}-curriculum-plan`,
    goal,
    plan,
    generatedAt: now,
    updatedAt: now,
  }
}

function readStoredGeneratedCurriculum(): GeneratedCurriculumSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const rawSnapshot = window.localStorage.getItem(storageKey)

    if (!rawSnapshot) {
      return null
    }

    return normalizeSnapshot(JSON.parse(rawSnapshot) as PersistedGeneratedCurriculum)
  } catch {
    return null
  }
}

function readStoredHistory(): GeneratedCurriculumSnapshot[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawHistory = window.localStorage.getItem(historyStorageKey)
    if (!rawHistory) {
      return []
    }

    const parsed = JSON.parse(rawHistory) as unknown[]
    if (!Array.isArray(parsed)) return []

    return parsed.flatMap((item) => {
      const norm = normalizeSnapshot(item as PersistedGeneratedCurriculum)
      return norm ? [norm] : []
    })
  } catch {
    return []
  }
}

function persistGeneratedCurriculum(snapshot: GeneratedCurriculumSnapshot) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
}

function persistHistory(history: GeneratedCurriculumSnapshot[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(historyStorageKey, JSON.stringify(history))
}

export function resolveGeneratedCurriculumPlan(
  snapshot: GeneratedCurriculumSnapshot | null,
  fallbackPlan: GeneratedCurriculumPlan,
) {
  return snapshot?.plan ?? fallbackPlan
}

const initialHistory = readStoredHistory()

export const useGeneratedCurriculumStore = create<GeneratedCurriculumStore>((set, get) => ({
  generatedCurriculum: readStoredGeneratedCurriculum(),
  history: initialHistory,
  hydrateGeneratedCurriculum: (snapshot) => {
    if (snapshot) {
      persistGeneratedCurriculum(snapshot)
    } else if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ generatedCurriculum: snapshot })
  },
  hydrateHistory: (history) => {
    persistHistory(history)
    set({ history })
  },
  saveGeneratedCurriculum: (goal, plan) => {
    const snapshot = createSnapshot(goal, plan)
    const currentHistory = get().history
    const nextHistory = [snapshot, ...currentHistory.filter((item) => (item.id || `${item.goal}-curriculum-plan`) !== snapshot.id)]

    persistGeneratedCurriculum(snapshot)
    persistHistory(nextHistory)

    set({ generatedCurriculum: snapshot, history: nextHistory })
  },
  activateCurriculumSnapshot: (snapshotId) => {
    const target = get().history.find((item) => (item.id || `${item.goal}-curriculum-plan`) === snapshotId)
    if (target) {
      persistGeneratedCurriculum(target)
      set({ generatedCurriculum: target })
    }
  },
  deleteCurriculumSnapshot: (snapshotId) => {
    const nextHistory = get().history.filter((item) => (item.id || `${item.goal}-curriculum-plan`) !== snapshotId)
    persistHistory(nextHistory)

    const activeId = get().generatedCurriculum?.id || `${get().generatedCurriculum?.goal}-curriculum-plan`
    let nextActive = get().generatedCurriculum
    if (activeId === snapshotId) {
      nextActive = nextHistory[0] ?? null
      if (nextActive) {
        persistGeneratedCurriculum(nextActive)
      } else if (typeof window !== 'undefined') {
        window.localStorage.removeItem(storageKey)
      }
    }

    set({ history: nextHistory, generatedCurriculum: nextActive })
  },
  resetGeneratedCurriculum: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
      window.localStorage.removeItem(historyStorageKey)
    }

    set({ generatedCurriculum: null, history: [] })
  },
}))
