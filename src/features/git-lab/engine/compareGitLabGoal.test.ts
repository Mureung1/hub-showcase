import { describe, expect, it } from 'vitest'
import { createGraphSnapshotFromEngineState } from './gitGraphAdapter'
import { runGitCommand } from './gitEngine'
import { compareGitLabGoal } from './compareGitLabGoal'
import levelsData from '../levels/gitLabLevels.json'
import { createPlayableLevels } from '../levels/gitLabCurriculumAdapter'

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
})

function getLevel(id: string) {
  const level = levels.find((candidate) => candidate.id === id)

  if (!level) {
    throw new Error(`Missing test level: ${id}`)
  }

  return level
}