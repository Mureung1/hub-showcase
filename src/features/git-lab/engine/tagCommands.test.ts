import { describe, expect, it } from 'vitest'
import { commit, createInitialGitState } from './gitEngine'
import { logTags, tag } from './tagCommands'

describe('tagCommands', () => {
  it('creates an annotated tag at HEAD and lists it', () => {
    let state = createInitialGitState()
    state = commit(state, 'first commit').state

    const tagged = tag(state, 'v1.0', true, 'Release 1.0')

    expect(tagged.ok).toBe(true)
    expect(tagged.state.tags).toEqual([
      { name: 'v1.0', commitId: state.commits.at(-1)?.id ?? tagged.state.commits[0].id, message: 'Release 1.0' },
    ])

    const listed = logTags(tagged.state)
    expect(listed.logs[0]).toContain('v1.0')
  })

  it('rejects a duplicate tag name', () => {
    let state = createInitialGitState()
    state = commit(state, 'first commit').state
    state = tag(state, 'v1.0', false, undefined).state

    const duplicate = tag(state, 'v1.0', false, undefined)

    expect(duplicate.ok).toBe(false)
  })

  it('fails to tag when there is no commit yet', () => {
    const state = createInitialGitState()

    const tagged = tag(state, 'v1.0', false, undefined)

    expect(tagged.ok).toBe(false)
  })
})
