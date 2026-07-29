import type { WorkspaceEditorFile } from './workspaceMission'

type WorkspaceDraft = {
  files: WorkspaceEditorFile[]
  activeFilePath: string
  updatedAt: string
}

type StoredWorkspaceDrafts = Record<string, WorkspaceDraft>

const storageKey = 'icu.workspaceDrafts'

function createDraftKey(missionId: string, activeStepOffset: number) {
  return `${missionId}:${activeStepOffset}`
}

function readDrafts(): StoredWorkspaceDrafts {
  if (typeof window === 'undefined') return {}

  try {
    const rawDrafts = window.localStorage.getItem(storageKey)
    if (!rawDrafts) return {}

    const parsed = JSON.parse(rawDrafts) as StoredWorkspaceDrafts
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function loadWorkspaceDraft(
  missionId: string,
  activeStepOffset: number,
): WorkspaceDraft | null {
  const draft = readDrafts()[createDraftKey(missionId, activeStepOffset)]
  if (!draft || !Array.isArray(draft.files)) return null

  const files = draft.files.filter(
    (file) =>
      file &&
      typeof file.path === 'string' &&
      typeof file.name === 'string' &&
      typeof file.language === 'string' &&
      typeof file.value === 'string',
  )

  if (files.length === 0) return null

  return {
    files,
    activeFilePath:
      files.some((file) => file.path === draft.activeFilePath)
        ? draft.activeFilePath
        : files[0].path,
    updatedAt: typeof draft.updatedAt === 'string' ? draft.updatedAt : '',
  }
}

export function saveWorkspaceDraft(
  missionId: string,
  activeStepOffset: number,
  files: WorkspaceEditorFile[],
  activeFilePath: string,
) {
  if (typeof window === 'undefined' || files.length === 0) return

  const drafts = readDrafts()
  drafts[createDraftKey(missionId, activeStepOffset)] = {
    files,
    activeFilePath,
    updatedAt: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(drafts))
  } catch {
    // Draft persistence must not interrupt the learning session.
  }
}

export function hasWorkspaceCodeChange(
  files: WorkspaceEditorFile[],
  initialFiles: WorkspaceEditorFile[],
) {
  return files.some((file) => {
    const initialFile = initialFiles.find((candidate) => candidate.path === file.path)
    return !initialFile || initialFile.value !== file.value
  })
}
