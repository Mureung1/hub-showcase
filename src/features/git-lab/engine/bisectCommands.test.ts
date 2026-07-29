import { describe, expect, it } from 'vitest'
import { createInitialGitState, type GitCommit, type GitEngineState } from './gitEngine'
import { bisectBad, bisectGood, bisectReset, bisectStart } from './bisectCommands'

function buildBisectFixtureState(): GitEngineState {
  const bugStates: Array<'good' | 'bad'> = ['good', 'good', 'good', 'good', 'bad', 'bad', 'bad', 'bad']
  const commits: GitCommit[] = bugStates.map((bugState, index) => ({
    id: `C${index}`,
    parents: index === 0 ? [] : [`C${index - 1}`],
    bugState,
  }))
  const base = createInitialGitState('master', commits)

  return base
}

describe('bisectCommands', () => {
  it('converges on the first bad commit (C4) by repeatedly testing the midpoint', () => {
    let state = buildBisectFixtureState()
    state = bisectStart(state).state
    state = bisectBad(state, 'C7').state
    state = bisectGood(state, 'C0').state

    expect(state.bisect?.currentCommitId).toBe('C4')

    // C4 is bad -> narrow to [C1..C4]
    state = bisectBad(state, null).state
    expect(state.bisect?.currentCommitId).toBe('C2')

    // C2 is good -> narrow to [C3..C4]
    state = bisectGood(state, null).state
    expect(state.bisect?.currentCommitId).toBe('C3')

    // C3 is good -> narrows to a single candidate, C4
    const finalResult = bisectGood(state, null)
    expect(finalResult.state.bisect?.foundCommitId).toBe('C4')

    const resetResult = bisectReset(finalResult.state)
    expect(resetResult.state.bisect).toBeNull()
  })

  it('reports it is waiting when only one boundary is known', () => {
    let state = buildBisectFixtureState()
    state = bisectStart(state).state

    const result = bisectBad(state, 'C7')

    expect(result.state.bisect?.candidateCommitIds).toEqual([])
    expect(result.logs.join(' ')).toContain('waiting')
  })

  it('fails when bisect has not been started', () => {
    const state = buildBisectFixtureState()

    const result = bisectBad(state, 'C7')

    expect(result.ok).toBe(false)
  })
})
