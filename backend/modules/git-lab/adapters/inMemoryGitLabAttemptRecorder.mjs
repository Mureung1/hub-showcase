export function createInMemoryGitLabAttemptRecorder({ attemptRepository, mistakeNoteRepository }) {
  return {
    async record({ attempt, mistakeNote }) {
      let savedMistakeNote = null
      let createdMistakeNote = false

      if (mistakeNote && mistakeNoteRepository) {
        savedMistakeNote = await mistakeNoteRepository.findOpenDuplicate(mistakeNote)
        if (!savedMistakeNote) {
          savedMistakeNote = await mistakeNoteRepository.save(mistakeNote)
          createdMistakeNote = true
        }
      }

      try {
        const savedAttempt = await attemptRepository.save(attempt)
        return { attempt: savedAttempt, mistakeNote: savedMistakeNote }
      } catch (error) {
        if (createdMistakeNote) {
          await mistakeNoteRepository.delete(savedMistakeNote.id)
        }
        throw error
      }
    },
  }
}
