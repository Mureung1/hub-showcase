import { describe, expect, it } from 'vitest'
import { commit, createInitialGitState } from './gitEngine'
import type { GitEngineState } from './gitEngine'
import { logRange, resolveRelativeRef, show } from './revisionCommands'

describe('revisionCommands', () => {
  it('resolves HEAD~2 to the grandparent commit (Pro Git 7장 예시와 동일한 5커밋 체인)', () => {
    let state = createInitialGitState()
    for (let i = 0; i < 5; i += 1) {
      state = commit(state, `commit ${i}`).state
    }

    const [, c1, c2] = state.commits

    const result = show(state, 'HEAD~2')

    expect(result.ok).toBe(true)
    expect(result.state.lastResolvedRef).toBe(c2.id)
    expect(c2.parents[0]).toBe(c1.id)
  })

  it('resolves HEAD^ the same as HEAD~1', () => {
    let state = createInitialGitState()
    state = commit(state, 'first').state
    state = commit(state, 'second').state

    const caretResult = resolveRelativeRef(state, 'HEAD^')
    const tildeResult = resolveRelativeRef(state, 'HEAD~1')

    expect(caretResult).toBe(tildeResult)
    expect(caretResult).toBe(state.commits[0].id)
  })

  it('returns commits reachable from experiment but not from master (double-dot range)', () => {
    let state = createInitialGitState('master')
    state = commit(state, 'C0').state
    state = commit(state, 'C1').state
    const branched = { ...state, branches: [...state.branches, { name: 'experiment', commitId: state.branches[0].commitId }] }
    let experimentState: GitEngineState = {
      ...branched,
      head: { type: 'branch', branchName: 'experiment' },
    }
    experimentState = commit(experimentState, 'C2').state
    experimentState = commit(experimentState, 'C3').state

    const result = logRange(experimentState, 'master', 'experiment')

    expect(result.ok).toBe(true)
    expect(result.state.lastLogRangeResult?.length).toBe(2)
  })
})
