import { executeSupabaseOperation } from '../../../shared/repositoryError.mjs'

const resource = 'mistake_notes'

export function createSupabaseMistakeNoteRepository(client) {
  return {
    async list() {
      const rows = await executeSupabaseOperation({
        resource,
        operation: 'list',
        run: () => client.from(resource).select('*').order('created_at', { ascending: false }),
      })

      return rows.map(mapMistakeNote)
    },
    async findById(id) {
      const row = await executeSupabaseOperation({
        resource,
        operation: 'findById',
        run: () => client.from(resource).select('*').eq('id', id).maybeSingle(),
      })

      return row ? mapMistakeNote(row) : null
    },
    async findOpenDuplicate(input) {
      const row = await executeSupabaseOperation({
        resource,
        operation: 'findOpenDuplicate',
        run: () => client
          .from(resource)
          .select('*')
          .eq('status', 'open')
          .eq('source', input.source)
          .eq('lesson_id', input.lessonId)
          .eq('command', input.command)
          .eq('reason', input.reason)
          .limit(1)
          .maybeSingle(),
      })

      return row ? mapMistakeNote(row) : null
    },
    async save(note) {
      await executeSupabaseOperation({
        resource,
        operation: 'save',
        run: () => client.from(resource).upsert(mapMistakeNoteRow(note), { onConflict: 'id' }),
      })

      return note
    },
    async delete(id) {
      const rows = await executeSupabaseOperation({
        resource,
        operation: 'delete',
        run: () => client.from(resource).delete().eq('id', id).select('id'),
      })

      return rows.length > 0
    },
    async reset() {
      await executeSupabaseOperation({
        resource,
        operation: 'reset',
        run: () => client.from(resource).delete().neq('id', ''),
      })
    },
  }
}

export function mapMistakeNote(row) {
  return {
    id: row.id,
    source: row.source,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson_title,
    command: row.command,
    reason: row.reason,
    correction: row.correction,
    createdAt: normalizeTimestamp(row.created_at),
    reviewedAt: row.reviewed_at ? normalizeTimestamp(row.reviewed_at) : null,
    status: row.status,
  }
}

function normalizeTimestamp(value) {
  return new Date(value).toISOString()
}

export function mapMistakeNoteRow(note) {
  return {
    id: note.id,
    source: note.source,
    lesson_id: note.lessonId,
    lesson_title: note.lessonTitle,
    command: note.command,
    reason: note.reason,
    correction: note.correction,
    created_at: note.createdAt,
    reviewed_at: note.reviewedAt,
    status: note.status,
  }
}
