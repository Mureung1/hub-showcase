import type { MistakeNote, MistakeNoteSource } from './model/useMistakeNoteStore'

type MistakeSourceConfig = {
  label: string
  createReviewPath: (lessonId: string) => string
}

const sourceConfigs: Record<MistakeNoteSource, MistakeSourceConfig> = {
  'git-lab': {
    label: 'Git Lab',
    createReviewPath: (lessonId) => `/git-lab?lesson=${encodeURIComponent(lessonId)}`,
  },
  workspace: {
    label: 'Workspace',
    createReviewPath: (lessonId) => `/workspace?mission=${encodeURIComponent(lessonId)}`,
  },
  algorithm: {
    label: '알고리즘 실습',
    createReviewPath: (lessonId) => `/workspace?mission=${encodeURIComponent(lessonId)}`,
  },
  'api-practice': {
    label: 'API 실습',
    createReviewPath: (lessonId) => `/workspace?mission=${encodeURIComponent(lessonId)}`,
  },
}

export function getMistakeNoteSourceLabel(source: MistakeNoteSource) {
  return sourceConfigs[source].label
}

export function createMistakeReviewPath(note: Pick<MistakeNote, 'source' | 'lessonId'>) {
  return sourceConfigs[note.source].createReviewPath(note.lessonId)
}