import { describe, expect, it } from 'vitest'
import {
  createInitialGitState,
  parseGitCommand,
  runGitCommand,
  type GitEngineState,
} from './gitEngine'

describe('gitEngine', () => {
  it('parses supported git commands', () => {
    expect(parseGitCommand('git config --global user.name "Ada Lovelace"')).toEqual({
      type: 'configSet',
      key: 'user.name',
      value: 'Ada Lovelace',
    })
    expect(parseGitCommand('git config --global user.email ada@example.com')).toEqual({
      type: 'configSet',
      key: 'user.email',
      value: 'ada@example.com',
    })
    expect(parseGitCommand('git config --list')).toEqual({ type: 'configList' })
    expect(parseGitCommand('git init')).toEqual({ type: 'init' })
    expect(parseGitCommand('git status')).toEqual({ type: 'status' })
    expect(parseGitCommand('git add README.md')).toEqual({ type: 'add', path: 'README.md' })
    expect(parseGitCommand('git commit')).toEqual({ type: 'commit' })
    expect(parseGitCommand('git commit -m "initial commit"')).toEqual({
      type: 'commit',
      message: 'initial commit',
    })
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

  it('sets global config values and lists configured keys', () => {
    let state = createInitialGitState()

    state = runGitCommand(state, 'git config --global user.name "Ada Lovelace"').state
    state = runGitCommand(state, 'git config --global user.email ada@example.com').state
    const result = runGitCommand(state, 'git config --list')

    expect(state.config).toEqual({
      'user.name': 'Ada Lovelace',
      'user.email': 'ada@example.com',
    })
    expect(result.logs).toEqual(['user.name=Ada Lovelace', 'user.email=ada@example.com'])
  })

  it('initializes a repository from an empty curriculum state', () => {
    const state = {
      ...createInitialGitState(),
      repoExists: false,
      branches: [],
      head: { type: 'detached' as const, commitId: null },
    }
    const result = runGitCommand(state, 'git init')

    expect(result.state.repoExists).toBe(true)
    expect(result.state.branches).toEqual([{ name: 'master', commitId: null }])
    expect(result.state.head).toEqual({ type: 'branch', branchName: 'master' })
  })

  it('stages files with git add and commits staged files with git commit -m', () => {
    let state: GitEngineState = {
      ...createInitialGitState('master'),
      files: {
        'README.md': {
          content: '# My Project\n',
          status: 'untracked' as const,
        },
      },
    }

    state = runGitCommand(state, 'git add README.md').state
    expect(state.files['README.md'].status).toBe('staged')

    state = runGitCommand(state, 'git commit -m "initial commit"').state
    expect(state.files['README.md'].status).toBe('committed')
    expect(state.commits.at(-1)).toEqual({ id: 'C0', parents: [], message: 'initial commit' })
    expect(state.branches).toEqual([{ name: 'master', commitId: 'C0' }])
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