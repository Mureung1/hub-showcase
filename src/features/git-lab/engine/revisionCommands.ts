import { failure, getCommitById, getHeadCommitId } from './gitEngine'
import type { GitCommandResult, GitEngineState } from './gitEngine'

export function resolveRelativeRef(state: GitEngineState, ref: string): string | null {
  if (ref === 'HEAD') {
    return getHeadCommitId(state)
  }

  const caretMatch = /^HEAD(\^+)$/.exec(ref)
  if (caretMatch) {
    return walkParents(state, getHeadCommitId(state), caretMatch[1].length)
  }

  const tildeMatch = /^HEAD~(\d+)$/.exec(ref)
  if (tildeMatch) {
    return walkParents(state, getHeadCommitId(state), Number(tildeMatch[1]))
  }

  const branch = state.branches.find((candidate) => candidate.name === ref)
  if (branch) {
    return branch.commitId
  }

  return state.commits.some((commit) => commit.id === ref) ? ref : null
}

function walkParents(state: GitEngineState, commitId: string | null, steps: number): string | null {
  let current = commitId

  for (let step = 0; step < steps; step += 1) {
    const commit = getCommitById(state, current)
    current = commit?.parents[0] ?? null
  }

  return current
}

export function show(state: GitEngineState, ref: string): GitCommandResult {
  const resolvedId = resolveRelativeRef(state, ref)
  const commitData = resolvedId ? getCommitById(state, resolvedId) : undefined

  if (!resolvedId || !commitData) {
    return failure(state, `unknown revision '${ref}'`)
  }

  const nextState: GitEngineState = {
    ...state,
    lastResolvedRef: resolvedId,
  }

  return {
    state: nextState,
    ok: true,
    logs: [`commit ${resolvedId}`, commitData.message ? commitData.message : '(no commit message)'],
  }
}

export function logRange(state: GitEngineState, from: string, to: string): GitCommandResult {
  const fromId = resolveRelativeRef(state, from)
  const toId = resolveRelativeRef(state, to)

  if (!toId) {
    return failure(state, `unknown revision '${to}'`)
  }

  const ancestorsOfFrom = collectAncestors(state, fromId)
  const result: string[] = []
  let cursor: string | null = toId

  while (cursor && !ancestorsOfFrom.has(cursor)) {
    result.push(cursor)
    cursor = getCommitById(state, cursor)?.parents[0] ?? null
  }

  const nextState: GitEngineState = {
    ...state,
    lastLogRangeResult: result,
  }

  return {
    state: nextState,
    ok: true,
    logs: result.length > 0 ? result : ['no commits in range'],
  }
}

function collectAncestors(state: GitEngineState, commitId: string | null): Set<string> {
  const seen = new Set<string>()
  const queue: string[] = commitId ? [commitId] : []

  while (queue.length > 0) {
    const current = queue.shift()

    if (!current || seen.has(current)) {
      continue
    }

    seen.add(current)
    const commitData = getCommitById(state, current)
    if (commitData) {
      queue.push(...commitData.parents)
    }
  }

  return seen
}
