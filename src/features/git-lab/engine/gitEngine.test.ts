import { describe, expect, it } from 'vitest'
import { createInitialGitState, parseGitCommand, runGitCommand } from './gitEngine'

describe('gitEngine', () => {
  it('parses supported git commands', () => {
    expect(parseGitCommand('git commit')).toEqual({ type: 'commit' })
    expect(parseGitCommand('git branch feature')).toEqual({ type: 'branch', name: 'feature' })
    expect(parseGitCommand('git checkout feature')).toEqual({
      type: 'checkout',
      name: 'feature',
    })
    expect(parseGitCommand('git checkout -b feature')).toEqual({
      type: 'checkoutNewBranch',
      name: 'feature',
    })
    expect(parseGitCommand('git merge feature')).toEqual({ type: 'merge', name: 'feature' })
    expect(parseGitCommand('git log')).toEqual({ type: 'log' })
  })

  it('creates linear commits on the current branch', () => {
    let state = createInitialGitState()

    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git commit').state

    expect(state.commits).toEqual([
      { id: 'C0', parents: [] },
      { id: 'C1', parents: ['C0'] },
    ])
    expect(state.branches).toEqual([{ name: 'main', commitId: 'C1' }])
    expect(state.head).toEqual({ type: 'branch', branchName: 'main' })
  })

  it('updates only the checked out branch after checkout -b and commit', () => {
    let state = createInitialGitState()

    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git checkout -b feature').state
    state = runGitCommand(state, 'git commit').state

    expect(state.branches).toEqual([
      { name: 'main', commitId: 'C0' },
      { name: 'feature', commitId: 'C1' },
    ])
    expect(state.commits.at(-1)).toEqual({ id: 'C1', parents: ['C0'] })
    expect(state.head).toEqual({ type: 'branch', branchName: 'feature' })
  })

  it('switches branches and commits on the selected branch', () => {
    let state = createInitialGitState()

    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git checkout -b feature').state
    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git checkout main').state
    state = runGitCommand(state, 'git commit').state

    expect(state.branches).toEqual([
      { name: 'main', commitId: 'C2' },
      { name: 'feature', commitId: 'C1' },
    ])
    expect(state.commits.at(-1)).toEqual({ id: 'C2', parents: ['C0'] })
  })

  it('creates a merge commit with two parents', () => {
    let state = createInitialGitState()

    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git checkout -b feature').state
    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git checkout main').state
    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git merge feature').state

    expect(state.commits.at(-1)).toEqual({ id: 'C3', parents: ['C2', 'C1'] })
    expect(state.branches).toEqual([
      { name: 'main', commitId: 'C3' },
      { name: 'feature', commitId: 'C1' },
    ])
  })

  it('returns logs without changing state for git log', () => {
    let state = createInitialGitState()

    state = runGitCommand(state, 'git commit').state
    const result = runGitCommand(state, 'git log')

    expect(result.state).toBe(state)
    expect(result.logs).toEqual(['C0 <- root'])
  })
})
