import { addMistakeNote } from '../../mistake-notes/application/mistakeNoteService.mjs'
import { createGitLabAttempt } from '../domain/gitLabAttempt.mjs'

export function listGitLabAttempts({ repository }) {
  return { attempts: repository.list() }
}

export function recordGitLabAttempt({ input, repository, mistakeNoteRepository }) {
  const attempt = repository.save(createGitLabAttempt(input))
  let mistakeNote = null

  if (attempt.result === 'failed' && input.mistakeNote && mistakeNoteRepository) {
    mistakeNote = addMistakeNote({
      input: { ...input.mistakeNote, source: 'git-lab', lessonId: attempt.lessonId, command: attempt.command },
      repository: mistakeNoteRepository,
    })
  }

  return { attempt, mistakeNote }
}

export function resetGitLabAttempts({ repository }) {
  repository.reset()
}