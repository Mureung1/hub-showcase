export function createSqliteMistakeNoteRepository(database) {
  const listStatement = database.prepare('SELECT * FROM mistake_notes ORDER BY created_at DESC')
  const findByIdStatement = database.prepare('SELECT * FROM mistake_notes WHERE id = ?')
  const findDuplicateStatement = database.prepare(`
    SELECT * FROM mistake_notes
    WHERE status = 'open'
      AND source = ?
      AND lesson_id = ?
      AND command = ?
      AND reason = ?
    LIMIT 1
  `)
  const saveStatement = database.prepare(`
    INSERT INTO mistake_notes (
      id,
      source,
      lesson_id,
      lesson_title,
      command,
      reason,
      correction,
      created_at,
      reviewed_at,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      source = excluded.source,
      lesson_id = excluded.lesson_id,
      lesson_title = excluded.lesson_title,
      command = excluded.command,
      reason = excluded.reason,
      correction = excluded.correction,
      created_at = excluded.created_at,
      reviewed_at = excluded.reviewed_at,
      status = excluded.status
  `)
  const deleteStatement = database.prepare('DELETE FROM mistake_notes WHERE id = ?')
  const resetStatement = database.prepare('DELETE FROM mistake_notes')

  return {
    list() {
      return listStatement.all().map(mapMistakeNote)
    },
    findById(id) {
      const row = findByIdStatement.get(id)

      return row ? mapMistakeNote(row) : null
    },
    findOpenDuplicate(input) {
      const row = findDuplicateStatement.get(input.source, input.lessonId, input.command, input.reason)

      return row ? mapMistakeNote(row) : null
    },
    save(note) {
      saveStatement.run(
        note.id,
        note.source,
        note.lessonId,
        note.lessonTitle,
        note.command,
        note.reason,
        note.correction,
        note.createdAt,
        note.reviewedAt,
        note.status,
      )

      return note
    },
    delete(id) {
      const result = deleteStatement.run(id)

      return result.changes > 0
    },
    reset() {
      resetStatement.run()
    },
  }
}

function mapMistakeNote(row) {
  return {
    id: row.id,
    source: row.source,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    command: row.command,
    reason: row.reason,
    correction: row.correction,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    status: row.status,
  }
}
