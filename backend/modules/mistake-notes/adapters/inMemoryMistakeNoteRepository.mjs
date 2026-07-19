export function createInMemoryMistakeNoteRepository(initialNotes = []) {
  let notes = [...initialNotes]

  return {
    list() {
      return [...notes]
    },
    findById(id) {
      return notes.find((note) => note.id === id) ?? null
    },
    findOpenDuplicate(input) {
      return notes.find(
        (note) =>
          note.status === 'open' &&
          note.source === input.source &&
          note.lessonId === input.lessonId &&
          note.command === input.command &&
          note.reason === input.reason,
      ) ?? null
    },
    save(note) {
      notes = [note, ...notes.filter((item) => item.id !== note.id)]

      return note
    },
    delete(id) {
      const exists = notes.some((note) => note.id === id)
      notes = notes.filter((note) => note.id !== id)

      return exists
    },
    reset() {
      notes = []
    },
  }
}