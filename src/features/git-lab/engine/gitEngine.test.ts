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
    expect(parseGitCommand('git diff')).toEqual({ type: 'diff', staged: false })
    expect(parseGitCommand('git diff --staged')).toEqual({ type: 'diff', staged: true })
    expect(parseGitCommand('git add README.md')).toEqual({ type: 'add', path: 'README.md' })
    expect(parseGitCommand('git restore README.md')).toEqual({
      type: 'restore',
      path: 'README.md',
      staged: false,
    })
    expect(parseGitCommand('git restore --staged README.md')).toEqual({
      type: 'restore',
      path: 'README.md',
      staged: true,
    })
    expect(parseGitCommand('git reset HEAD README.md')).toEqual({
      type: 'resetPath',
      path: 'README.md',
    })
    expect(parseGitCommand('git reset HEAD^')).toEqual({
      type: 'reset',
      mode: 'mixed',
      target: 'HEAD^',
    })
    expect(parseGitCommand('git reset --soft HEAD~1')).toEqual({
      type: 'reset',
      mode: 'soft',
      target: 'HEAD~1',
    })
    expect(parseGitCommand('git reset --hard C3')).toEqual({
      type: 'reset',
      mode: 'hard',
      target: 'C3',
    })
    expect(parseGitCommand('git commit')).toEqual({ type: 'commit' })
    expect(parseGitCommand('git commit -m "initial commit"')).toEqual({
      type: 'commit',
      message: 'initial commit',
    })
    expect(parseGitCommand('git commit --amend')).toEqual({ type: 'amendCommit' })
    expect(parseGitCommand('git commit --amend -m "updated commit"')).toEqual({
      type: 'amendCommit',
      message: 'updated commit',
    })
    expect(parseGitCommand('git branch feature')).toEqual({ type: 'branch', name: 'feature' })
    expect(parseGitCommand('git branch -d feature')).toEqual({
      type: 'deleteBranch',
      name: 'feature',
    })
    expect(parseGitCommand('git checkout feature')).toEqual({
      type: 'checkout',
      name: 'feature',
    })
    expect(parseGitCommand('git checkout -b feature')).toEqual({
      type: 'checkoutNewBranch',
      name: 'feature',
    })
    expect(parseGitCommand('git switch feature')).toEqual({
      type: 'checkout',
      name: 'feature',
    })
    expect(parseGitCommand('git switch -c feature')).toEqual({
      type: 'checkoutNewBranch',
      name: 'feature',
    })
    expect(parseGitCommand('git merge feature')).toEqual({ type: 'merge', name: 'feature' })
    expect(parseGitCommand('git log')).toEqual({ type: 'log', oneline: false })
    expect(parseGitCommand('git log --oneline')).toEqual({ type: 'log', oneline: true })
    expect(parseGitCommand('git remote add origin https://example.com/repo.git')).toEqual({
      type: 'remoteAdd',
      name: 'origin',
      url: 'https://example.com/repo.git',
    })
    expect(parseGitCommand('git remote -v')).toEqual({ type: 'remoteList' })
    expect(parseGitCommand('git push -u origin master')).toEqual({
      type: 'push',
      remote: 'origin',
      branch: 'master',
      setUpstream: true,
    })
    expect(parseGitCommand('git push origin iss53')).toEqual({
      type: 'push',
      remote: 'origin',
      branch: 'iss53',
      setUpstream: false,
    })
    expect(parseGitCommand('git fetch')).toEqual({ type: 'fetch', remote: 'origin' })
    expect(parseGitCommand('git fetch origin')).toEqual({ type: 'fetch', remote: 'origin' })
    expect(parseGitCommand('git branch -r')).toEqual({ type: 'branchRemoteList' })
    expect(parseGitCommand('git tag v1.0')).toEqual({
      type: 'tag',
      name: 'v1.0',
      annotated: false,
    })
    expect(parseGitCommand('git tag -a v1.0 -m "Release 1.0"')).toEqual({
      type: 'tag',
      name: 'v1.0',
      annotated: true,
      message: 'Release 1.0',
    })
    expect(parseGitCommand('git log --tags')).toEqual({ type: 'logTags' })
    expect(parseGitCommand('git show HEAD~2')).toEqual({ type: 'show', ref: 'HEAD~2' })
    expect(parseGitCommand('git log master..experiment')).toEqual({
      type: 'logRange',
      from: 'master',
      to: 'experiment',
    })
    expect(parseGitCommand('git stash')).toEqual({ type: 'stashPush' })
    expect(parseGitCommand('git stash push')).toEqual({ type: 'stashPush' })
    expect(parseGitCommand('git stash pop')).toEqual({ type: 'stashPop' })
    expect(parseGitCommand('git stash apply')).toEqual({ type: 'stashApply' })
    expect(parseGitCommand('git stash list')).toEqual({ type: 'stashList' })
  })

  it('handles boundary cases and normalizes input', () => {
    // CLI 프롬프트 접두어($) 무시
    expect(parseGitCommand('$ git status')).toEqual({ type: 'status' })
    expect(parseGitCommand('  $   git status ')).toEqual({ type: 'status' })

    // 불필요한 공백 무시
    expect(parseGitCommand('  git    init  ')).toEqual({ type: 'init' })

    // reset 옵션 생략 시 mixed 적용
    expect(parseGitCommand('git reset HEAD')).toEqual({
      type: 'reset',
      mode: 'mixed',
      target: 'HEAD',
    })
  })

  it('throws an error for non-git or missing commands', () => {
    expect(() => parseGitCommand('')).toThrow('Command must start with git.')
    expect(() => parseGitCommand('   ')).toThrow('Command must start with git.')
    expect(() => parseGitCommand('npm install')).toThrow('Command must start with git.')
    expect(() => parseGitCommand('ls -al')).toThrow('Command must start with git.')
  })

  it('throws an error for unsupported git commands or missing arguments', () => {
    // 지원하지 않는 명령어
    expect(() => parseGitCommand('git push')).toThrow('Unsupported git command')
    expect(() => parseGitCommand('git clone https://example.com')).toThrow('Unsupported git command')

    // 필수 인자 누락 (구조상 길이 부족으로 unsupported 예외 발생)
    expect(() => parseGitCommand('git add')).toThrow('Unsupported git command')
    expect(() => parseGitCommand('git commit -m')).toThrow('Unsupported git command')

    // 설정값 누락 (명시적인 커스텀 에러)
    expect(() => parseGitCommand('git config --global user.name')).toThrow('Missing value for user.name.')
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

  it('reports working tree and staged changes with git diff without changing state', () => {
    const state: GitEngineState = {
      ...createInitialGitState('master'),
      files: {
        'README.md': {
          content: '# My Project\n',
          status: 'modified',
        },
        'index.ts': {
          content: 'console.log("hello")\n',
          status: 'staged',
        },
      },
    }

    const workingTreeResult = runGitCommand(state, 'git diff')
    const stagedResult = runGitCommand(state, 'git diff --staged')

    expect(workingTreeResult.state).toBe(state)
    expect(workingTreeResult.logs).toEqual(['working tree changes:', 'modified: README.md'])
    expect(stagedResult.state).toBe(state)
    expect(stagedResult.logs).toEqual(['staged changes:', 'staged: index.ts'])
  })

  it('unstages files with git restore --staged', () => {
    const state: GitEngineState = {
      ...createInitialGitState('master'),
      files: {
        'README.md': {
          content: '# My Project\n',
          status: 'staged',
        },
      },
    }

    const result = runGitCommand(state, 'git restore --staged README.md')

    expect(result.ok).toBe(true)
    expect(result.state.files['README.md'].status).toBe('modified')
  })

  it('restores modified files and removes untracked files from the working tree', () => {
    let state: GitEngineState = {
      ...createInitialGitState('master'),
      files: {
        'README.md': {
          content: '# My Project\n',
          status: 'modified',
        },
        'draft.md': {
          content: 'draft\n',
          status: 'untracked',
        },
      },
    }

    state = runGitCommand(state, 'git restore README.md').state
    expect(state.files['README.md'].status).toBe('committed')

    state = runGitCommand(state, 'git restore draft.md').state
    expect(state.files['draft.md']).toBeUndefined()
  })

  it('moves HEAD, index, and working tree according to reset mode', () => {
    const commits = [
      { id: 'C0', parents: [] },
      { id: 'C1', parents: ['C0'] },
    ]

    const soft = runGitCommand(createInitialGitState('master', commits), 'git reset --soft HEAD^')
    expect(soft.state.branches).toEqual([{ name: 'master', commitId: 'C0' }])
    expect(soft.state.indexCommitId).toBe('C1')
    expect(soft.state.workingTreeCommitId).toBe('C1')

    const mixed = runGitCommand(createInitialGitState('master', commits), 'git reset HEAD^')
    expect(mixed.state.branches).toEqual([{ name: 'master', commitId: 'C0' }])
    expect(mixed.state.indexCommitId).toBe('C0')
    expect(mixed.state.workingTreeCommitId).toBe('C1')

    const hard = runGitCommand(createInitialGitState('master', commits), 'git reset --hard HEAD~1')
    expect(hard.state.branches).toEqual([{ name: 'master', commitId: 'C0' }])
    expect(hard.state.indexCommitId).toBe('C0')
    expect(hard.state.workingTreeCommitId).toBe('C0')
  })

  it('fast-forwards merge when the current branch is an ancestor of the source branch', () => {
    const state: GitEngineState = {
      ...createInitialGitState('master'),
      commits: [
        { id: 'C0', parents: [] },
        { id: 'C1', parents: ['C0'] },
      ],
      branches: [
        { name: 'master', commitId: 'C0' },
        { name: 'feature', commitId: 'C1' },
      ],
      head: { type: 'branch', branchName: 'master' },
      indexCommitId: 'C0',
      workingTreeCommitId: 'C0',
      nextCommitIndex: 2,
    }

    const result = runGitCommand(state, 'git merge feature')

    expect(result.state.commits).toHaveLength(2)
    expect(result.state.branches).toEqual([
      { name: 'master', commitId: 'C1' },
      { name: 'feature', commitId: 'C1' },
    ])
    expect(result.state.indexCommitId).toBe('C1')
    expect(result.state.workingTreeCommitId).toBe('C1')
    expect(result.logs[0]).toBe('fast-forward master to feature')
  })
  it('amends the current commit with a replacement commit id', () => {
    let state = createInitialGitState('master', [
      { id: 'C0', parents: [] },
      { id: 'C1', parents: ['C0'], message: 'old message' },
    ])

    state = runGitCommand(state, 'git commit --amend -m "updated message"').state

    expect(state.commits).toEqual([
      { id: 'C0', parents: [] },
      { id: "C1'", parents: ['C0'], message: 'updated message' },
    ])
    expect(state.branches).toEqual([{ name: 'master', commitId: "C1'" }])
    expect(state.indexCommitId).toBe("C1'")
    expect(state.workingTreeCommitId).toBe("C1'")
  })

  it('deletes a fully merged branch and reports missing branch names', () => {
    const state: GitEngineState = {
      ...createInitialGitState('master'),
      commits: [
        { id: 'C0', parents: [] },
        { id: 'C1', parents: ['C0'] },
        { id: 'C2', parents: ['C1'] },
      ],
      branches: [
        { name: 'master', commitId: 'C2' },
        { name: 'hotfix', commitId: 'C2' },
        { name: 'experiment', commitId: 'C1' },
      ],
      head: { type: 'branch', branchName: 'master' },
      indexCommitId: 'C2',
      workingTreeCommitId: 'C2',
      nextCommitIndex: 3,
    }

    const deleted = runGitCommand(state, 'git branch -d hotfix')
    const missing = runGitCommand(deleted.state, 'git branch -d unknown')

    expect(deleted.ok).toBe(true)
    expect(deleted.state.branches).toEqual([
      { name: 'master', commitId: 'C2' },
      { name: 'experiment', commitId: 'C1' },
    ])
    expect(missing.ok).toBe(false)
    expect(missing.logs[0]).toBe("branch 'unknown' does not exist")
  })

  it('formats compact history with git log --oneline', () => {
    const state = createInitialGitState('master', [
      { id: 'C0', parents: [], message: 'initial commit' },
      { id: 'C1', parents: ['C0'], message: 'add readme' },
    ])

    const result = runGitCommand(state, 'git log --oneline')

    expect(result.state).toBe(state)
    expect(result.logs).toEqual(['C0 initial commit', 'C1 add readme'])
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
    state = runGitCommand(state, 'git switch -c feature').state
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
    state = runGitCommand(state, 'git switch -c feature').state
    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git switch main').state
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
    state = runGitCommand(state, 'git switch -c feature').state
    state = runGitCommand(state, 'git commit').state
    state = runGitCommand(state, 'git switch main').state
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

  it('initializes new engine state fields for remote/tag/stash/bisect', () => {
    const state = createInitialGitState()

    expect(state.remotes).toEqual([])
    expect(state.remoteBranches).toEqual({})
    expect(state.tags).toEqual([])
    expect(state.stash).toEqual([])
    expect(state.bisect).toBeNull()
    expect(state.conflict).toBeNull()
    expect(state.pendingMerge).toBeNull()
    expect(state.lastResolvedRef).toBeNull()
    expect(state.lastLogRangeResult).toBeNull()
  })
})
