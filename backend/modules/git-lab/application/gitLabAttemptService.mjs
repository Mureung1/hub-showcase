import { createMistakeNote } from '../../mistake-notes/domain/mistakeNote.mjs'
import { createGitLabAttempt } from '../domain/gitLabAttempt.mjs'

export async function listGitLabAttempts({ repository }) {
  return { attempts: await repository.list() }
}

export async function recordGitLabAttempt({ input, recorder }) {
  const attempt = createGitLabAttempt(input)
  const mistakeNote = attempt.result === 'failed' && input.mistakeNote
    ? createMistakeNote({
        ...input.mistakeNote,
        source: 'git-lab',
        lessonId: attempt.lessonId,
        command: attempt.command,
      })
    : null

  return await recorder.record({ attempt, mistakeNote })
}

export async function resetGitLabAttempts({ repository }) {
  await repository.reset()
}
