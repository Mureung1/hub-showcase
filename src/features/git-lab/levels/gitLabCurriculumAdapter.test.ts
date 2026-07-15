import { describe, expect, it } from 'vitest'
import levelsData from './gitLabLevels.json'
import { createCurriculumNavigation, createPlayableLevels } from './gitLabCurriculumAdapter'

describe('gitLabCurriculumAdapter', () => {
  it('keeps base levels and exposes graph curriculum levels as playable candidates', () => {
    const levels = createPlayableLevels(levelsData)
    const curriculumLevels = levels.filter((level) => /^\d+-\d+$/.test(level.id))

    expect(levels).toHaveLength(17)
    expect(curriculumLevels).toHaveLength(13)
  })

  it('groups all imported curriculum levels by module with locked reasons for unsupported goals', () => {
    const modules = createCurriculumNavigation(levelsData)
    const items = modules.flatMap((module) => module.items)

    expect(modules).toHaveLength(3)
    expect(items).toHaveLength(28)
    expect(items.filter((item) => item.status === 'playable')).toHaveLength(13)
    expect(items.find((item) => item.id === '1-2')?.reason).toContain('fileStatus')
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
})