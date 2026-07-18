import { create } from 'zustand'
import type {
  CurriculumSource,
  GeneratedCurriculumPlan,
  GeneratedCurriculumStep,
} from '../data/curriculumGenerator'

export type GeneratedCurriculumSnapshot = {
  goal: string
  plan: GeneratedCurriculumPlan
  generatedAt: string
}

type PersistedGeneratedCurriculum = Partial<GeneratedCurriculumSnapshot>

type GeneratedCurriculumStore = {
  generatedCurriculum: GeneratedCurriculumSnapshot | null
  saveGeneratedCurriculum: (goal: string, plan: GeneratedCurriculumPlan) => void
  resetGeneratedCurriculum: () => void
}

const storageKey = 'icu.generatedCurriculum'
const defaultMissionMinutes = 30

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : ''
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
    },
    steps,
    sources,
  }
}

function normalizeSnapshot(snapshot: PersistedGeneratedCurriculum): GeneratedCurriculumSnapshot | null {
  const goal = normalizeString(snapshot.goal)
  const generatedAt = normalizeString(snapshot.generatedAt)
  const plan = normalizePlan(snapshot.plan)

  if (!goal || !generatedAt || !plan) {
    return null
  }

  return { goal, plan, generatedAt }
}

function createSnapshot(goal: string, plan: GeneratedCurriculumPlan): GeneratedCurriculumSnapshot {
  return {
    goal,
    plan,
    generatedAt: new Date().toISOString(),
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

function persistGeneratedCurriculum(snapshot: GeneratedCurriculumSnapshot) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(snapshot))
}

export function resolveGeneratedCurriculumPlan(
  snapshot: GeneratedCurriculumSnapshot | null,
  fallbackPlan: GeneratedCurriculumPlan,
) {
  return snapshot?.plan ?? fallbackPlan
}

export const useGeneratedCurriculumStore = create<GeneratedCurriculumStore>((set) => ({
  generatedCurriculum: readStoredGeneratedCurriculum(),
  saveGeneratedCurriculum: (goal, plan) => {
    const snapshot = createSnapshot(goal, plan)
    persistGeneratedCurriculum(snapshot)
    set({ generatedCurriculum: snapshot })
  },
  resetGeneratedCurriculum: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ generatedCurriculum: null })
  },
}))
