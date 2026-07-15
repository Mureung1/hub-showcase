import { describe, expect, it } from 'vitest'
import levelsData from './gitLabLevels.json'
import { createCurriculumNavigation, createPlayableLevels } from './gitLabCurriculumAdapter'

describe('gitLabCurriculumAdapter', () => {
  it('keeps base levels and exposes supported curriculum levels as playable candidates', () => {
    const levels = createPlayableLevels(levelsData)
    const curriculumLevels = levels.filter((level) => /^\d+-\d+$/.test(level.id))

    expect(levels).toHaveLength(20)
    expect(curriculumLevels).toHaveLength(16)
  })

  it('groups all imported curriculum levels by module with locked reasons for unsupported goals', () => {
    const modules = createCurriculumNavigation(levelsData)
    const items = modules.flatMap((module) => module.items)

    expect(modules).toHaveLength(3)
    expect(items).toHaveLength(28)
    expect(items.filter((item) => item.status === 'playable')).toHaveLength(16)
    expect(items.find((item) => item.id === '1-2')?.playableLevel?.goalKind).toBe('fileStatus')
    expect(items.find((item) => item.id === '1-6')?.reason).toContain('remoteState')
  })

  it('converts curriculum branch commitId values into graph snapshot head values', () => {
    const levels = createPlayableLevels(levelsData)
    const level = levels.find((candidate) => candidate.id === '2-1')

    expect(level?.initial.branches).toEqual([{ name: 'master', head: 'C0' }])
    expect(level?.goal.branches).toEqual([
      { name: 'master', head: 'C0' },
      { name: 'testing', head: 'C0' },
    ])
  })

  it('derives the target current branch from the changed branch when possible', () => {
    const levels = createPlayableLevels(levelsData)

    expect(levels.find((level) => level.id === '2-2')?.goal.currentBranch).toBe('testing')
    expect(levels.find((level) => level.id === '2-3')?.goal.currentBranch).toBe('master')
  })

  it('converts early curriculum initialState into engine state', () => {
    const levels = createPlayableLevels(levelsData)
    const configLevel = levels.find((level) => level.id === '1-0')
    const addLevel = levels.find((level) => level.id === '1-2')

    expect(configLevel?.initialEngineState?.repoExists).toBe(false)
    expect(configLevel?.goalCheck).toEqual({
      type: 'configState',
      description: 'user.name과 user.email이 모두 설정된 상태',
    })
    expect(addLevel?.initialEngineState?.files['README.md'].status).toBe('untracked')
    expect(addLevel?.goalCheck).toEqual({
      type: 'fileStatus',
      fileName: 'README.md',
      status: 'staged',
      description: 'README.md가 Staged 상태',
    })
  })

  it('uses the highest numeric commit id when deriving next commit index', () => {
    const levels = createPlayableLevels(levelsData)
    const level = levels.find((candidate) => candidate.id === '2-3')

    expect(level?.initialEngineState?.nextCommitIndex).toBe(5)
  })
})