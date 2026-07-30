import type { GitLabAttemptRequest } from './api/gitLabAttemptClient'

type PersistGitLabAttemptOptions = {
  serverMode: boolean
  record: (request: GitLabAttemptRequest) => Promise<unknown>
  onConfirmed?: () => void
}

export async function persistGitLabAttempt(
  request: GitLabAttemptRequest,
  options: PersistGitLabAttemptOptions,
) {
  if (options.serverMode) {
    await options.record(request)
  }

  options.onConfirmed?.()
}
