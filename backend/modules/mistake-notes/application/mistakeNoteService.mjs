import { createMistakeNote, normalizeMistakeNoteInput, updateMistakeNoteStatus } from '../domain/mistakeNote.mjs'

export async function listMistakeNotes({ repository }) {
  return { notes: await repository.list() }
}

export async function addMistakeNote({ input, repository }) {
  const normalizedInput = normalizeMistakeNoteInput(input)
  const duplicate = await repository.findOpenDuplicate(normalizedInput)

  if (duplicate) return duplicate

  return await repository.save(createMistakeNote(normalizedInput))
}

export async function changeMistakeNoteStatus({ id, status, repository }) {
  const note = await repository.findById(id)
  if (!note) throw new Error('Mistake note not found')

  return await repository.save(updateMistakeNoteStatus(note, status))
}

export async function removeMistakeNote({ id, repository }) {
  if (!await repository.delete(id)) throw new Error('Mistake note not found')
}

export async function resetMistakeNotes({ repository }) {
  await repository.reset()
}
