import { executeSupabaseOperation } from '../../../shared/repositoryError.mjs'

const resource = 'git_lab_attempts'

export function createSupabaseGitLabAttemptRepository(client) {
  return {
    async list() {
      const rows = await executeSupabaseOperation({
        resource,
        operation: 'list',
        run: () => client.from(resource).select('*').order('created_at', { ascending: false }),
      })

      return rows.map(mapGitLabAttempt)
    },
    async save(attempt) {
      await executeSupabaseOperation({
        resource,
        operation: 'save',
        run: () => client.from(resource).insert(mapGitLabAttemptRow(attempt)),
      })

      return attempt
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

export function mapGitLabAttempt(row) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    command: row.command,
    result: row.result,
    reason: row.reason,
    createdAt: row.created_at,
  }
}

export function mapGitLabAttemptRow(attempt) {
  return {
    id: attempt.id,
    lesson_id: attempt.lessonId,
    command: attempt.command,
    result: attempt.result,
    reason: attempt.reason,
    created_at: attempt.createdAt,
  }
}
