import { failure, formatGitStateForConsole } from './gitEngine'
import type { GitCommandResult, GitEngineState } from './gitEngine'

export function remoteAdd(state: GitEngineState, name: string, url: string): GitCommandResult {
  if (state.remotes.some((remote) => remote.name === name)) {
    return failure(state, `remote ${name} already exists`)
  }

  const nextState: GitEngineState = {
    ...state,
    remotes: [...state.remotes, { name, url }],
  }

  return {
    state: nextState,
    ok: true,
    logs: [`added remote ${name} -> ${url}`, ...formatGitStateForConsole(nextState)],
  }
}

export function remoteList(state: GitEngineState): GitCommandResult {
  const logs = state.remotes.flatMap((remote) => [
    `${remote.name}\t${remote.url} (fetch)`,
    `${remote.name}\t${remote.url} (push)`,
  ])

  return {
    state,
    ok: true,
    logs: logs.length > 0 ? logs : ['no remotes configured'],
  }
}

export function push(
  state: GitEngineState,
  remoteName: string,
  branchName: string,
  setUpstream: boolean,
): GitCommandResult {
  const remote = state.remotes.find((candidate) => candidate.name === remoteName)

  if (!remote) {
    return failure(state, `remote ${remoteName} does not exist`)
  }

  const localBranch = state.branches.find((branch) => branch.name === branchName)

  if (!localBranch?.commitId) {
    return failure(state, `branch ${branchName} has no commits to push`)
  }

  const remoteBranchKey = `${remoteName}/${branchName}`
  const nextState: GitEngineState = {
    ...state,
    remoteBranches: {
      ...state.remoteBranches,
      [remoteBranchKey]: localBranch.commitId,
    },
  }

  return {
    state: nextState,
    ok: true,
    logs: [
      setUpstream
        ? `pushed ${branchName} to ${remoteBranchKey} and set upstream`
        : `pushed ${branchName} to ${remoteBranchKey}`,
      ...formatGitStateForConsole(nextState),
    ],
  }
}

export function fetch(state: GitEngineState, remoteName: string): GitCommandResult {
  const remote = state.remotes.find((candidate) => candidate.name === remoteName)

  if (!remote) {
    return failure(state, `remote ${remoteName} does not exist`)
  }

  return {
    state,
    ok: true,
    logs: [`fetched from ${remoteName} (이 레슨에서는 새로 받아올 원격 히스토리가 없습니다)`],
  }
}

export function branchRemoteList(state: GitEngineState): GitCommandResult {
  const logs = Object.keys(state.remoteBranches)

  return {
    state,
    ok: true,
    logs: logs.length > 0 ? logs : ['no remote branches'],
  }
}
