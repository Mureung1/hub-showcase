import type { MistakeNote, MistakeNoteStatus } from './model/useMistakeNoteStore'

type UpdateOptions = {
  update: (id: string, status: MistakeNoteStatus) => Promise<{ note: MistakeNote }>
  upsert: (note: MistakeNote) => unknown
}

type DeleteOptions = {
  delete: (id: string) => Promise<unknown>
  remove: (id: string) => void
}

export async function updateServerMistakeNoteStatus(
  id: string,
  status: MistakeNoteStatus,
  options: UpdateOptions,
) {
  const { note } = await options.update(id, status)
  options.upsert(note)
  return note
}

export async function deleteServerMistakeNote(id: string, options: DeleteOptions) {
  await options.delete(id)
  options.remove(id)
}
