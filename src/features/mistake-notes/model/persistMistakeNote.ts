import type { MistakeNote, MistakeNoteInput } from './useMistakeNoteStore'

type PersistMistakeNoteDependencies = {
  serverMode: boolean
  createServer: (input: MistakeNoteInput) => Promise<{ note: MistakeNote }>
  addLocal: (input: MistakeNoteInput) => MistakeNote
  upsert: (note: MistakeNote) => MistakeNote | null | void
}

export async function persistMistakeNote(
  input: MistakeNoteInput,
  dependencies: PersistMistakeNoteDependencies,
) {
  if (!dependencies.serverMode) {
    return dependencies.addLocal(input)
  }

  const { note } = await dependencies.createServer(input)
  dependencies.upsert(note)

  return note
}
