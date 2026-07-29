import { describe, expect, it } from 'vitest'
import { createInitialGitState } from './gitEngine'
import { stashApply, stashList, stashPop, stashPush } from './stashCommands'

describe('stashCommands', () => {
  it('stashes a modified file and cleans the working tree', () => {
    const base = createInitialGitState()
    const state = {
      ...base,
      files: { 'index.html': { content: '<!-- 작업 중인 변경사항 -->', status: 'modified' as const } },
    }

    const pushed = stashPush(state)

    expect(pushed.ok).toBe(true)
    expect(pushed.state.stash).toHaveLength(1)
    expect(pushed.state.files['index.html'].status).toBe('committed')
  })

  it('reports no local changes when nothing is dirty', () => {
    const state = createInitialGitState()

    const pushed = stashPush(state)

    expect(pushed.state.stash).toHaveLength(0)
  })

  it('pops the most recent stash entry back into the working tree', () => {
    const base = createInitialGitState()
    const state = {
      ...base,
      files: { 'index.html': { content: 'committed content', status: 'committed' as const } },
      stash: [{ id: 'stash@{0}', files: { 'index.html': '<!-- 작업 중인 변경사항 -->' } }],
    }

    const popped = stashPop(state)

    expect(popped.ok).toBe(true)
    expect(popped.state.stash).toHaveLength(0)
    expect(popped.state.files['index.html']).toEqual({
      content: '<!-- 작업 중인 변경사항 -->',
      status: 'modified',
    })
  })

  it('applies without removing the stash entry', () => {
    const base = createInitialGitState()
    const state = {
      ...base,
      files: { 'index.html': { content: 'committed content', status: 'committed' as const } },
      stash: [{ id: 'stash@{0}', files: { 'index.html': '<!-- wip -->' } }],
    }

    const applied = stashApply(state)

    expect(applied.state.stash).toHaveLength(1)
  })

  it('fails to pop when the stash is empty', () => {
    const state = createInitialGitState()

    const popped = stashPop(state)

    expect(popped.ok).toBe(false)
  })

  it('lists stash entries', () => {
    const base = createInitialGitState()
    const state = {
      ...base,
      stash: [{ id: 'stash@{0}', files: { 'index.html': 'wip' } }],
    }

    const listed = stashList(state)

    expect(listed.logs[0]).toContain('stash@{0}')
  })
})
