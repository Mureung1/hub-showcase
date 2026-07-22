export function createSqliteGitLabAttemptRepository(database) {
  const listStatement = database.prepare('SELECT * FROM git_lab_attempts ORDER BY created_at DESC')
  const saveStatement = database.prepare(`
    INSERT INTO git_lab_attempts (id, lesson_id, command, result, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  const resetStatement = database.prepare('DELETE FROM git_lab_attempts')

  return {
    list() {
      return listStatement.all().map(mapGitLabAttempt)
    },
    save(attempt) {
      saveStatement.run(
        attempt.id,
        attempt.lessonId,
        attempt.command,
        attempt.result,
        attempt.reason,
        attempt.createdAt,
      )

      return attempt
    },
    reset() {
      resetStatement.run()
    },
  }
}

function mapGitLabAttempt(row) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    command: row.command,
    result: row.result,
    reason: row.reason,
    createdAt: row.created_at,
  }
}
