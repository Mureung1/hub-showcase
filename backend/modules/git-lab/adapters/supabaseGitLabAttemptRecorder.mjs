import { executeSupabaseOperation } from '../../../shared/repositoryError.mjs'
import { mapMistakeNote, mapMistakeNoteRow } from '../../mistake-notes/adapters/supabaseMistakeNoteRepository.mjs'
import { mapGitLabAttempt, mapGitLabAttemptRow } from './supabaseGitLabAttemptRepository.mjs'

const functionName = 'record_git_lab_attempt_with_mistake_note'

export function createSupabaseGitLabAttemptRecorder(client) {
  return {
    async record({ attempt, mistakeNote }) {
      const result = await executeSupabaseOperation({
        resource: functionName,
        operation: 'record',
        run: () => client.rpc(functionName, {
          p_attempt: mapGitLabAttemptRow(attempt),
          p_mistake_note: mistakeNote ? mapMistakeNoteRow(mistakeNote) : null,
        }),
      })

      return {
        attempt: mapGitLabAttempt(result.attempt),
        mistakeNote: result.mistake_note ? mapMistakeNote(result.mistake_note) : null,
      }
    },
  }
}
