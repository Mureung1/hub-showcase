import { failure, getCommitById, getHeadCommitId } from './gitEngine'
import type { GitBisectState, GitCommandResult, GitEngineState } from './gitEngine'

export function bisectStart(state: GitEngineState): GitCommandResult {
  const nextState: GitEngineState = {
    ...state,
    bisect: {
      goodCommitId: null,
      badCommitId: null,
      candidateCommitIds: [],
      currentCommitId: null,
      foundCommitId: null,
    },
  }

  return {
    state: nextState,
    ok: true,
    logs: ['started bisect session'],
  }
}

export function bisectBad(state: GitEngineState, ref: string | null): GitCommandResult {
  if (!state.bisect) {
    return failure(state, 'bisect session not started (run git bisect start first)')
  }

  const commitId = ref ?? state.bisect.currentCommitId ?? getHeadCommitId(state)

  if (!commitId) {
    return failure(state, 'no commit to mark as bad')
  }

  return markAndNarrow(state, { ...state.bisect, badCommitId: commitId })
}

export function bisectGood(state: GitEngineState, ref: string | null): GitCommandResult {
  if (!state.bisect) {
    return failure(state, 'bisect session not started (run git bisect start first)')
  }

  const commitId = ref ?? state.bisect.currentCommitId ?? getHeadCommitId(state)

  if (!commitId) {
    return failure(state, 'no commit to mark as good')
  }

  return markAndNarrow(state, { ...state.bisect, goodCommitId: commitId })
}

export function bisectReset(state: GitEngineState): GitCommandResult {
  const nextState: GitEngineState = { ...state, bisect: null }

  return {
    state: nextState,
    ok: true,
    logs: ['bisect session ended'],
  }
}

function markAndNarrow(state: GitEngineState, bisect: GitBisectState): GitCommandResult {
  if (!bisect.goodCommitId || !bisect.badCommitId) {
    const nextState: GitEngineState = { ...state, bisect }

    return {
      state: nextState,
      ok: true,
      logs: [
        bisect.goodCommitId ? `good: ${bisect.goodCommitId}` : `bad: ${bisect.badCommitId}`,
        'waiting for both a good and a bad commit before bisecting',
      ],
    }
  }

  const candidates = collectRange(state, bisect.goodCommitId, bisect.badCommitId)

  if (candidates.length <= 1) {
    const foundCommitId = candidates[0] ?? bisect.badCommitId
    const nextState: GitEngineState = {
      ...state,
      bisect: { ...bisect, candidateCommitIds: [], currentCommitId: null, foundCommitId },
    }

    return {
      state: nextState,
      ok: true,
      logs: [`${foundCommitId} is the first bad commit`],
    }
  }

  const midpoint = candidates[Math.floor((candidates.length - 1) / 2)]
  const midpointCommit = getCommitById(state, midpoint)
  const bugHint = midpointCommit?.bugState
    ? ` (이 커밋 상태: ${midpointCommit.bugState === 'bad' ? '버그 있음' : '버그 없음'})`
    : ''
  const nextState: GitEngineState = {
    ...state,
    bisect: { ...bisect, candidateCommitIds: candidates, currentCommitId: midpoint, foundCommitId: null },
  }

  return {
    state: nextState,
    ok: true,
    logs: [
      `Bisecting: ${candidates.length - 1} revisions left to test, testing commit ${midpoint}${bugHint}`,
    ],
  }
}

function collectRange(state: GitEngineState, goodCommitId: string, badCommitId: string): string[] {
  const result: string[] = []
  let cursor: string | null = badCommitId

  while (cursor && cursor !== goodCommitId) {
    result.push(cursor)
    cursor = getCommitById(state, cursor)?.parents[0] ?? null
  }

  return result.reverse()
}
