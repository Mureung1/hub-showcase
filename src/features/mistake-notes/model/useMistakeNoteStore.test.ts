import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MistakeNote } from './useMistakeNoteStore'

const storageKey = 'icu.mistakeNotes'

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
  const module = await import('./useMistakeNoteStore')

  return module.useMistakeNoteStore
}

const savedMistake: MistakeNote = {
  id: 'mistake-1',
  source: 'git-lab',
  lessonId: '1-2',
  lessonTitle: 'Staging area 이해하기',
  command: 'git add missing.md',
  reason: "pathspec 'missing.md' did not match any files",
  correction: 'README.md를 먼저 add 해보세요.',
  createdAt: '2026-07-16T09:00:00.000Z',
  reviewedAt: null,
  status: 'open',
}

describe('useMistakeNoteStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('restores mistake notes from localStorage', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ notes: [savedMistake] }),
    })
    const useMistakeNoteStore = await importStore(localStorage)

    expect(useMistakeNoteStore.getState().notes).toEqual([savedMistake])
  })

  it('falls back to an empty list when localStorage is invalid', async () => {
    const localStorage = createLocalStorage({ [storageKey]: '{invalid' })
    const useMistakeNoteStore = await importStore(localStorage)

    expect(useMistakeNoteStore.getState().notes).toEqual([])
  })
  it('restores future learning module sources from localStorage', async () => {
    const workspaceMistake: MistakeNote = {
      ...savedMistake,
      id: 'mistake-workspace-1',
      source: 'workspace',
      lessonId: 'generated-first-mission',
      lessonTitle: 'React state 실습',
      command: '테스트 실행',
    }
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ notes: [workspaceMistake] }),
    })
    const useMistakeNoteStore = await importStore(localStorage)

    expect(useMistakeNoteStore.getState().notes).toEqual([workspaceMistake])
  })


  it('hydrates mistake notes from a server response', async () => {
    const localStorage = createLocalStorage()
    const useMistakeNoteStore = await importStore(localStorage)

    useMistakeNoteStore.getState().hydrateMistakeNotes([savedMistake])

    expect(useMistakeNoteStore.getState().notes).toEqual([savedMistake])
    expect(localStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify({ notes: [savedMistake] }),
    )
  })

  it('ignores and does not persist local mistake notes in server mode', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ notes: [savedMistake] }),
    })
    const useMistakeNoteStore = await importStore(localStorage, 'server')

    expect(useMistakeNoteStore.getState().notes).toEqual([])
    expect(localStorage.getItem).not.toHaveBeenCalled()

    useMistakeNoteStore.getState().hydrateMistakeNotes([savedMistake])
    expect(useMistakeNoteStore.getState().notes).toEqual([savedMistake])
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('upserts a mistake note from a server response', async () => {
    const localStorage = createLocalStorage()
    const useMistakeNoteStore = await importStore(localStorage)

    expect(useMistakeNoteStore.getState().upsertMistakeNote(savedMistake)).toEqual(savedMistake)
    expect(useMistakeNoteStore.getState().notes).toEqual([savedMistake])
  })
  it('adds and persists a new mistake note', async () => {
    const localStorage = createLocalStorage()
    const useMistakeNoteStore = await importStore(localStorage)

    const note = useMistakeNoteStore.getState().addMistakeNote({
      source: 'git-lab',
      lessonId: '1-0',
      lessonTitle: 'Git 설정',
      command: 'git config --list',
      reason: 'no global config set',
      correction: 'user.name과 user.email을 먼저 설정하세요.',
    })

    expect(note.status).toBe('open')
    expect(useMistakeNoteStore.getState().notes).toHaveLength(1)
    expect(localStorage.setItem).toHaveBeenCalledWith(
      storageKey,
      JSON.stringify({ notes: [note] }),
    )
  })

  it('does not add duplicate open mistakes', async () => {
    const localStorage = createLocalStorage()
    const useMistakeNoteStore = await importStore(localStorage)
    const input = {
      source: 'git-lab' as const,
      lessonId: '1-2',
      lessonTitle: 'Staging area 이해하기',
      command: 'git add missing.md',
      reason: "pathspec 'missing.md' did not match any files",
      correction: 'README.md를 먼저 add 해보세요.',
    }

    const firstNote = useMistakeNoteStore.getState().addMistakeNote(input)
    const secondNote = useMistakeNoteStore.getState().addMistakeNote(input)
    const workspaceNote = useMistakeNoteStore.getState().addMistakeNote({
      ...input,
      source: 'workspace',
    })

    expect(secondNote).toBe(firstNote)
    expect(workspaceNote).not.toBe(firstNote)
    expect(useMistakeNoteStore.getState().notes).toHaveLength(2)
  })

  it('marks a mistake resolved and reopens it', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-16T10:00:00.000Z'))
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ notes: [savedMistake] }),
    })
    const useMistakeNoteStore = await importStore(localStorage)

    useMistakeNoteStore.getState().markResolved(savedMistake.id)

    expect(useMistakeNoteStore.getState().notes[0]).toMatchObject({
      status: 'resolved',
      reviewedAt: '2026-07-16T10:00:00.000Z',
    })

    useMistakeNoteStore.getState().reopenMistake(savedMistake.id)

    expect(useMistakeNoteStore.getState().notes[0]).toMatchObject({
      status: 'open',
      reviewedAt: null,
    })
    vi.useRealTimers()
  })

  it('removes and resets mistake notes', async () => {
    const localStorage = createLocalStorage({
      [storageKey]: JSON.stringify({ notes: [savedMistake] }),
    })
    const useMistakeNoteStore = await importStore(localStorage)

    useMistakeNoteStore.getState().removeMistake(savedMistake.id)

    expect(useMistakeNoteStore.getState().notes).toEqual([])

    useMistakeNoteStore.getState().addMistakeNote({
      source: 'git-lab',
      lessonId: '1-1',
      lessonTitle: 'git init',
      command: 'git status',
      reason: 'not a git repository',
      correction: 'git init을 먼저 실행하세요.',
    })
    useMistakeNoteStore.getState().resetMistakeNotes()

    expect(localStorage.removeItem).toHaveBeenCalledWith(storageKey)
    expect(useMistakeNoteStore.getState().notes).toEqual([])
  })
})
