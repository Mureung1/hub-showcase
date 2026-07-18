import { create } from 'zustand'

export const mistakeNoteSources = ['git-lab', 'workspace', 'algorithm', 'api-practice'] as const

export type MistakeNoteSource = (typeof mistakeNoteSources)[number]
export type MistakeNoteStatus = 'open' | 'resolved'

export type MistakeNote = {
  id: string
  source: MistakeNoteSource
  lessonId: string
  lessonTitle: string
  command: string
  reason: string
  correction: string
  createdAt: string
  reviewedAt: string | null
  status: MistakeNoteStatus
}

export type MistakeNoteInput = {
  source: MistakeNoteSource
  lessonId: string
  lessonTitle: string
  command: string
  reason: string
  correction: string
}

type PersistedMistakeNotes = {
  notes?: Partial<MistakeNote>[]
}

type MistakeNoteStore = {
  notes: MistakeNote[]
  addMistakeNote: (input: MistakeNoteInput) => MistakeNote
  hasOpenDuplicate: (
    input: Pick<MistakeNoteInput, 'source' | 'lessonId' | 'command' | 'reason'>,
  ) => boolean
  markResolved: (id: string) => void
  reopenMistake: (id: string) => void
  removeMistake: (id: string) => void
  resetMistakeNotes: () => void
}

const storageKey = 'icu.mistakeNotes'

function createMistakeNote(input: MistakeNoteInput): MistakeNote {
  const now = new Date().toISOString()

  return {
    id: createId(),
    source: input.source,
    lessonId: input.lessonId,
    lessonTitle: input.lessonTitle,
    command: input.command,
    reason: input.reason,
    correction: input.correction,
    createdAt: now,
    reviewedAt: null,
    status: 'open',
  }
}

function normalizeMistakeNote(note: Partial<MistakeNote>): MistakeNote | null {
  if (
    !isMistakeNoteSource(note.source) ||
    typeof note.id !== 'string' ||
    typeof note.lessonId !== 'string' ||
    typeof note.lessonTitle !== 'string' ||
    typeof note.command !== 'string' ||
    typeof note.reason !== 'string' ||
    typeof note.correction !== 'string' ||
    typeof note.createdAt !== 'string'
  ) {
    return null
  }

  return {
    id: note.id,
    source: note.source,
    lessonId: note.lessonId,
    lessonTitle: note.lessonTitle,
    command: note.command,
    reason: note.reason,
    correction: note.correction,
    createdAt: note.createdAt,
    reviewedAt: typeof note.reviewedAt === 'string' ? note.reviewedAt : null,
    status: note.status === 'resolved' ? 'resolved' : 'open',
  }
}

function readStoredMistakeNotes(): MistakeNote[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const rawNotes = window.localStorage.getItem(storageKey)

    if (!rawNotes) {
      return []
    }

    const parsed = JSON.parse(rawNotes) as PersistedMistakeNotes

    return (parsed.notes ?? []).flatMap((note) => {
      const normalizedNote = normalizeMistakeNote(note)

      return normalizedNote ? [normalizedNote] : []
    })
  } catch {
    return []
  }
}

function persistMistakeNotes(notes: MistakeNote[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify({ notes }))
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `mistake-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function isMistakeNoteSource(value: unknown): value is MistakeNoteSource {
  return mistakeNoteSources.includes(value as MistakeNoteSource)
}

function isOpenDuplicate(
  note: MistakeNote,
  input: Pick<MistakeNoteInput, 'source' | 'lessonId' | 'command' | 'reason'>,
) {
  return (
    note.status === 'open' &&
    note.source === input.source &&
    note.lessonId === input.lessonId &&
    note.command === input.command &&
    note.reason === input.reason
  )
}

export const useMistakeNoteStore = create<MistakeNoteStore>((set, get) => ({
  notes: readStoredMistakeNotes(),
  addMistakeNote: (input) => {
    const duplicateNote = get().notes.find((note) => isOpenDuplicate(note, input))

    if (duplicateNote) {
      return duplicateNote
    }

    const nextNote = createMistakeNote(input)

    set((state) => {
      const nextNotes = [nextNote, ...state.notes]
      persistMistakeNotes(nextNotes)

      return { notes: nextNotes }
    })

    return nextNote
  },
  hasOpenDuplicate: (input) => get().notes.some((note) => isOpenDuplicate(note, input)),
  markResolved: (id) => {
    set((state) => {
      const nextNotes = state.notes.map((note) =>
        note.id === id
          ? { ...note, status: 'resolved' as const, reviewedAt: new Date().toISOString() }
          : note,
      )
      persistMistakeNotes(nextNotes)

      return { notes: nextNotes }
    })
  },
  reopenMistake: (id) => {
    set((state) => {
      const nextNotes = state.notes.map((note) =>
        note.id === id ? { ...note, status: 'open' as const, reviewedAt: null } : note,
      )
      persistMistakeNotes(nextNotes)

      return { notes: nextNotes }
    })
  },
  removeMistake: (id) => {
    set((state) => {
      const nextNotes = state.notes.filter((note) => note.id !== id)
      persistMistakeNotes(nextNotes)

      return { notes: nextNotes }
    })
  },
  resetMistakeNotes: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey)
    }

    set({ notes: [] })
  },
}))