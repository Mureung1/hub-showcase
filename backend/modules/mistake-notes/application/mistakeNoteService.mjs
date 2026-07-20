import { createMistakeNote, normalizeMistakeNoteInput, updateMistakeNoteStatus } from '../domain/mistakeNote.mjs'

export function listMistakeNotes({ repository }) {
  return { notes: repository.list() }
}

export function addMistakeNote({ input, repository }) {
  const normalizedInput = normalizeMistakeNoteInput(input)
  const duplicate = repository.findOpenDuplicate(normalizedInput)

  if (duplicate) return duplicate

  return repository.save(createMistakeNote(normalizedInput))
}

export function changeMistakeNoteStatus({ id, status, repository }) {
  const note = repository.findById(id)
  if (!note) throw new Error('Mistake note not found')

  return repository.save(updateMistakeNoteStatus(note, status))
}

export function removeMistakeNote({ id, repository }) {
  if (!repository.delete(id)) throw new Error('Mistake note not found')
}

export function resetMistakeNotes({ repository }) {
  repository.reset()
}