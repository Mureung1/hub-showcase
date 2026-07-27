export function createSqliteGitLabAttemptRecorder({
  database,
  attemptRepository,
  mistakeNoteRepository,
}) {
  return {
    async record({ attempt, mistakeNote }) {
      database.exec('BEGIN IMMEDIATE')

      try {
        const savedAttempt = attemptRepository.save(attempt)
        let savedMistakeNote = null

        if (mistakeNote) {
          savedMistakeNote =
            mistakeNoteRepository.findOpenDuplicate(mistakeNote) ??
            mistakeNoteRepository.save(mistakeNote)
        }

        database.exec('COMMIT')
        return { attempt: savedAttempt, mistakeNote: savedMistakeNote }
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
  }
}
