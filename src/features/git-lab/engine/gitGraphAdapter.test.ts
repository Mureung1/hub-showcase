import { describe, expect, it } from 'vitest'
import { createGraphSnapshotFromEngineState } from './gitGraphAdapter'
import type { GitEngineState } from './gitEngine'

describe('gitGraphAdapter', () => {
  it('excludes empty branches from graph labels', () => {
    const state: GitEngineState = {
      commits: [{ id: 'C0', parents: [] }],
      branches: [
        { name: 'main', commitId: 'C0' },
        { name: 'feature', commitId: null },
      ],
      head: { type: 'branch', branchName: 'feature' },
      nextCommitIndex: 1,
    }

    expect(createGraphSnapshotFromEngineState(state).branches).toEqual([
      { name: 'main', head: 'C0' },
    ])
  })

  it('uses branch HEAD as the current branch label source', () => {
    const state: GitEngineState = {
      commits: [{ id: 'C0', parents: [] }],
      branches: [{ name: 'main', commitId: 'C0' }],
      head: { type: 'branch', branchName: 'main' },
      nextCommitIndex: 1,
    }

    expect(createGraphSnapshotFromEngineState(state).currentBranch).toBe('main')
  })
})
