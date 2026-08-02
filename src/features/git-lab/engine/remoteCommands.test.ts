import { describe, expect, it } from 'vitest'
import { createInitialGitState, commit } from './gitEngine'
import { branchRemoteList, fetch, push, remoteAdd, remoteList } from './remoteCommands'

describe('remoteCommands', () => {
  it('adds a remote and lists it', () => {
    const state = createInitialGitState()
    const added = remoteAdd(state, 'origin', 'https://example.com/repo.git')

    expect(added.ok).toBe(true)
    expect(added.state.remotes).toEqual([{ name: 'origin', url: 'https://example.com/repo.git' }])

    const listed = remoteList(added.state)
    expect(listed.logs).toContain('origin\thttps://example.com/repo.git (fetch)')
  })

  it('rejects adding a duplicate remote name', () => {
    const state = createInitialGitState()
    const added = remoteAdd(state, 'origin', 'https://example.com/repo.git')
    const duplicate = remoteAdd(added.state, 'origin', 'https://other.example.com/repo.git')

    expect(duplicate.ok).toBe(false)
  })

  it('pushes a branch to a remote and records the remote branch', () => {
    let state = createInitialGitState()
    state = commit(state, 'first commit').state
    state = remoteAdd(state, 'origin', 'https://example.com/repo.git').state

    const pushed = push(state, 'origin', 'main', true)

    expect(pushed.ok).toBe(true)
    expect(pushed.state.remoteBranches['origin/main']).toBe(state.branches[0].commitId)
  })

  it('fails to push to an unknown remote', () => {
    let state = createInitialGitState()
    state = commit(state, 'first commit').state

    const pushed = push(state, 'origin', 'main', false)

    expect(pushed.ok).toBe(false)
  })

  it('fetches from a known remote without error', () => {
    const state = remoteAdd(createInitialGitState(), 'origin', 'https://example.com/repo.git').state
    const fetched = fetch(state, 'origin')

    expect(fetched.ok).toBe(true)
  })

  it('lists remote branches', () => {
    let state = createInitialGitState()
    state = commit(state, 'first commit').state
    state = remoteAdd(state, 'origin', 'https://example.com/repo.git').state
    state = push(state, 'origin', 'main', false).state

    const listed = branchRemoteList(state)

    expect(listed.logs).toEqual(['origin/main'])
  })
})
