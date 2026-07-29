import { failure, formatGitStateForConsole, getHeadCommitId } from './gitEngine'
import type { GitCommandResult, GitEngineState } from './gitEngine'

export function tag(
  state: GitEngineState,
  name: string,
  annotated: boolean,
  message: string | undefined,
): GitCommandResult {
  if (state.tags.some((existingTag) => existingTag.name === name)) {
    return failure(state, `tag ${name} already exists`)
  }

  const commitId = getHeadCommitId(state)

  if (!commitId) {
    return failure(state, 'cannot tag: no commit at HEAD')
  }

  const nextState: GitEngineState = {
    ...state,
    tags: [...state.tags, { name, commitId, ...(annotated && message ? { message } : {}) }],
  }

  return {
    state: nextState,
    ok: true,
    logs: [`created tag ${name} at ${commitId}`, ...formatGitStateForConsole(nextState)],
  }
}

export function logTags(state: GitEngineState): GitCommandResult {
  const logs = state.tags.map((tagItem) =>
    tagItem.message
      ? `${tagItem.commitId} (tag: ${tagItem.name}) ${tagItem.message}`
      : `${tagItem.commitId} (tag: ${tagItem.name})`,
  )

  return {
    state,
    ok: true,
    logs: logs.length > 0 ? logs : ['no tags yet'],
  }
}
