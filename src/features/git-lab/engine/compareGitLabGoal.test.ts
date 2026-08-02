import { describe, expect, it } from 'vitest'
import { createGraphSnapshotFromEngineState } from './gitGraphAdapter'
import { commit, createInitialGitState, runGitCommand } from './gitEngine'
import { push, remoteAdd } from './remoteCommands'
import { compareGitLabGoal } from './compareGitLabGoal'
import levelsData from '../levels/gitLabLevels.json'
import { createPlayableLevels } from '../levels/gitLabCurriculumAdapter'
import type { PlayableGitLabLevel } from '../levels/gitLabCurriculumAdapter'

const levels = createPlayableLevels(levelsData)

describe('compareGitLabGoal', () => {
  it('clears the config goal when user name and email are set', () => {
    const level = getLevel('1-0')
    let state = level.initialEngineState!

    state = runGitCommand(state, 'git config --global user.name "Ada Lovelace"').state
    state = runGitCommand(state, 'git config --global user.email ada@example.com').state

    expect(compareGitLabGoal(level, state, createGraphSnapshotFromEngineState(state))).toEqual({
      cleared: true,
      message: '사용자 이름과 이메일 설정이 완료됐습니다.',
    })
  })

  it('clears the repo goal after git init', () => {
    const level = getLevel('1-1')
    const state = runGitCommand(level.initialEngineState!, 'git init').state

    expect(compareGitLabGoal(level, state, createGraphSnapshotFromEngineState(state)).cleared).toBe(
      true,
    )
  })

  it('clears the file status goal after git add', () => {
    const level = getLevel('1-2')
    const state = runGitCommand(level.initialEngineState!, 'git add README.md').state

    expect(compareGitLabGoal(level, state, createGraphSnapshotFromEngineState(state))).toEqual({
      cleared: true,
      message: 'README.md 파일이 staged 상태입니다.',
    })
  })
  it('clears the reset goal when HEAD, index, and working tree match the target state', () => {
    const level = getLevel('3-9')
    const state = runGitCommand(level.initialEngineState!, 'git reset --soft HEAD^').state

    expect(compareGitLabGoal(level, state, createGraphSnapshotFromEngineState(state))).toEqual({
      cleared: true,
      message: 'HEAD, Index, Working Directory가 목표 reset 상태와 일치합니다.',
    })
  })
  it('clears the amend lesson after replacing the current commit', () => {
    const level = getLevel('1-5')
    const state = runGitCommand(level.initialEngineState!, 'git commit --amend -m "updated"').state

    expect(compareGitLabGoal(level, state, createGraphSnapshotFromEngineState(state)).cleared).toBe(
      true,
    )
  })

  it('clears the merged branch deletion lesson after git branch -d', () => {
    const level = getLevel('2-4')
    const state = runGitCommand(level.initialEngineState!, 'git branch -d hotfix').state

    expect(compareGitLabGoal(level, state, createGraphSnapshotFromEngineState(state)).cleared).toBe(
      true,
    )
  })

  it('clears a remoteState goal once origin is registered and pushed', () => {
    const level = {
      id: 'remote-origin',
      goalKind: 'remoteState' as const,
      goalCheck: {
        type: 'remoteState' as const,
        requiredRemoteName: 'origin',
        requiredRemoteBranch: 'origin/master',
        description: 'origin이 등록되고 master가 push된 상태',
      },
      goal: { commits: [], branches: [], currentBranch: null },
    } as unknown as PlayableGitLabLevel

    let state = createInitialGitState('master')
    state = commit(state, 'first commit').state
    state = remoteAdd(state, 'origin', 'https://example.com/repo.git').state

    const beforePush = compareGitLabGoal(level, state, { commits: [], branches: [], currentBranch: null })
    expect(beforePush.cleared).toBe(false)

    state = push(state, 'origin', 'master', true).state

    const afterPush = compareGitLabGoal(level, state, { commits: [], branches: [], currentBranch: null })
    expect(afterPush.cleared).toBe(true)
  })
})

function getLevel(id: string) {
  const level = levels.find((candidate) => candidate.id === id)

  if (!level) {
    throw new Error(`Missing test level: ${id}`)
  }

  return level
}
