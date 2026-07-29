import { failure, formatGitStateForConsole } from './gitEngine'
import type { GitCommandResult, GitEngineState, GitFileStatus } from './gitEngine'

export function stashPush(state: GitEngineState): GitCommandResult {
  const dirtyEntries = Object.entries(state.files).filter(
    ([, file]) => file.status === 'modified' || file.status === 'staged',
  )

  if (dirtyEntries.length === 0) {
    return {
      state,
      ok: true,
      logs: ['No local changes to save', ...formatGitStateForConsole(state)],
    }
  }

  const stashedFiles = Object.fromEntries(
    dirtyEntries.map(([fileName, file]) => [fileName, file.content]),
  )
  const nextFiles = { ...state.files }
  dirtyEntries.forEach(([fileName, file]) => {
    nextFiles[fileName] = { ...file, status: 'committed' as GitFileStatus }
  })

  const stashId = `stash@{${state.stash.length}}`
  const nextState: GitEngineState = {
    ...state,
    files: nextFiles,
    stash: [{ id: stashId, files: stashedFiles }, ...state.stash],
  }

  return {
    state: nextState,
    ok: true,
    logs: [`Saved working directory state ${stashId}`, ...formatGitStateForConsole(nextState)],
  }
}

export function stashList(state: GitEngineState): GitCommandResult {
  const logs = state.stash.map(
    (entry, index) => `stash@{${index}}: WIP (${Object.keys(entry.files).join(', ')})`,
  )

  return {
    state,
    ok: true,
    logs: logs.length > 0 ? logs : ['no stash entries'],
  }
}

export function stashPop(state: GitEngineState): GitCommandResult {
  return applyStash(state, true)
}

export function stashApply(state: GitEngineState): GitCommandResult {
  return applyStash(state, false)
}

function applyStash(state: GitEngineState, popEntry: boolean): GitCommandResult {
  const [latest, ...rest] = state.stash

  if (!latest) {
    return failure(state, 'no stash entries found')
  }

  const nextFiles = { ...state.files }
  Object.entries(latest.files).forEach(([fileName, content]) => {
    nextFiles[fileName] = { content, status: 'modified' as GitFileStatus }
  })

  const nextState: GitEngineState = {
    ...state,
    files: nextFiles,
    stash: popEntry ? rest : state.stash,
  }

  return {
    state: nextState,
    ok: true,
    logs: [
      popEntry ? `Dropped ${latest.id}` : `Applied ${latest.id}`,
      ...formatGitStateForConsole(nextState),
    ],
  }
}
