import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  hasWorkspaceCodeChange,
  loadWorkspaceDraft,
  saveWorkspaceDraft,
} from './workspaceDraft'
import type { WorkspaceEditorFile } from './workspaceMission'

function createLocalStorage() {
  const values = new Map<string, string>()

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

const initialFiles: WorkspaceEditorFile[] = [
  {
    path: 'file:///mission/App.jsx',
    name: 'App.jsx',
    language: 'javascript',
    value: 'export default function App() { return null }',
  },
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('workspaceDraft', () => {
  it('restores editor files for the same mission step', () => {
    vi.stubGlobal('window', { localStorage: createLocalStorage() })
    const changedFiles = [{ ...initialFiles[0], value: 'export default function App() { return 1 }' }]

    saveWorkspaceDraft('mission-1', 1, changedFiles, changedFiles[0].path)

    expect(loadWorkspaceDraft('mission-1', 1)?.files).toEqual(changedFiles)
    expect(loadWorkspaceDraft('mission-1', 0)).toBeNull()
  })

  it('detects whether the learner changed the starter files', () => {
    expect(hasWorkspaceCodeChange(initialFiles, initialFiles)).toBe(false)
    expect(
      hasWorkspaceCodeChange(
        [{ ...initialFiles[0], value: 'export default function App() { return 1 }' }],
        initialFiles,
      ),
    ).toBe(true)
  })
})
