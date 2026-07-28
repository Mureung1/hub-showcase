import type { GitLabAttempt } from './api/gitLabAttemptClient'

export function getPassedGitLabLevelIds(attempts: GitLabAttempt[]) {
  return [...new Set(
    attempts
      .filter((attempt) => attempt.result === 'passed')
      .map((attempt) => attempt.lessonId),
  )]
}
