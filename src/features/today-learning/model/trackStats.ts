import levelsData from '../../git-lab/levels/gitLabLevels.json'
import { createPlayableLevels } from '../../git-lab/levels/gitLabCurriculumAdapter'
import type { MistakeNote } from '../../mistake-notes/model/useMistakeNoteStore'
import type { LearningTestResult } from '../../learning-progress/model/useLearningProgressStore'

export type TrackStatus = 'in_progress' | 'completed' | 'not_started' | 'unavailable'

const gitLabClearedLevelsStorageKey = 'icu:git-lab-cleared-levels'

export function getTrackStatus(percent: number | null): TrackStatus {
  if (percent === null) return 'unavailable'
  if (percent <= 0) return 'not_started'
  if (percent >= 100) return 'completed'

  return 'in_progress'
}

export function formatTestResultLabel(result: LearningTestResult | null | undefined): string {
  if (!result) return '아직 실행 안함'

  return `${result.passed} / ${result.total}`
}

export function getGitLabTrackProgress(): { clearedCount: number; totalCount: number; percent: number } {
  const playableLevelIds = new Set(createPlayableLevels(levelsData).map((level) => level.id))
  const totalCount = playableLevelIds.size
  const clearedCount = readClearedGitLabLevelIds().filter((id) => playableLevelIds.has(id)).length
  const percent = totalCount > 0 ? Math.round((clearedCount / totalCount) * 100) : 0

  return { clearedCount, totalCount, percent }
}

export function findTopWeakConcept(notes: MistakeNote[]): string | null {
  const counts = new Map<string, number>()

  for (const note of notes) {
    if (note.status !== 'open') continue
    counts.set(note.lessonTitle, (counts.get(note.lessonTitle) ?? 0) + 1)
  }

  let topTitle: string | null = null
  let topCount = 0

  for (const [title, count] of counts) {
    if (count > topCount) {
      topTitle = title
      topCount = count
    }
  }

  return topTitle
}

function readClearedGitLabLevelIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(gitLabClearedLevelsStorageKey)

    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}
