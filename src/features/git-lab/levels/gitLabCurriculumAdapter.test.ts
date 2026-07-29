import { describe, expect, it } from 'vitest'
import levelsData from './gitLabLevels.json'
import { createCurriculumNavigation, createPlayableLevels } from './gitLabCurriculumAdapter'

describe('gitLabCurriculumAdapter', () => {
  it('keeps base levels and exposes supported curriculum levels as playable candidates', () => {
    const levels = createPlayableLevels(levelsData)
    const curriculumLevels = levels.filter((level) => /^\d+-\d+$/.test(level.id))

    expect(levels).toHaveLength(32)
    expect(curriculumLevels).toHaveLength(28)
  })

  it('groups all imported curriculum levels by module with locked reasons for unsupported goals', () => {
    const modules = createCurriculumNavigation(levelsData)
    const items = modules.flatMap((module) => module.items)

    expect(modules).toHaveLength(3)
    expect(items).toHaveLength(28)
    expect(items.filter((item) => item.status === 'playable')).toHaveLength(28)
    expect(items.find((item) => item.id === '1-2')?.playableLevel?.goalKind).toBe('fileStatus')
    expect(items.find((item) => item.id === '3-9')?.playableLevel?.goalKind).toBe('resetState')
    expect(items.find((item) => item.id === '1-6')?.playableLevel?.goalKind).toBe('remoteState')
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

  it('converts reset curriculum goals into three-tree engine state checks', () => {
    const levels = createPlayableLevels(levelsData)
    const softResetLevel = levels.find((candidate) => candidate.id === '3-9')
    const mixedResetLevel = levels.find((candidate) => candidate.id === '3-10')
    const hardResetLevel = levels.find((candidate) => candidate.id === '3-11')

    expect(softResetLevel?.initialEngineState).toMatchObject({
      indexCommitId: 'C1',
      workingTreeCommitId: 'C1',
    })
    expect(softResetLevel?.goalCheck).toMatchObject({
      type: 'resetState',
      headCommitId: 'C0',
      indexCommitId: 'C1',
      workingTreeCommitId: 'C1',
    })
    expect(mixedResetLevel?.goalCheck).toMatchObject({
      type: 'resetState',
      indexCommitId: 'C0',
      workingTreeCommitId: 'C1',
    })
    expect(hardResetLevel?.goalCheck).toMatchObject({
      type: 'resetState',
      indexCommitId: 'C0',
      workingTreeCommitId: 'C0',
    })
  })
  it('uses the highest numeric commit id when deriving next commit index', () => {
    const levels = createPlayableLevels(levelsData)
    const level = levels.find((candidate) => candidate.id === '2-3')

    expect(level?.initialEngineState?.nextCommitIndex).toBe(5)
  })

  it('carries remotes, tags, stash, and bugState through to engine state', () => {
    const [level] = createPlayableLevels({
      levels: [],
      curriculumModules: [
        {
          moduleId: 'm1',
          moduleTitle: 'Module 1',
          bookRef: 'ref',
          levels: [
            {
              id: 'test-1',
              title: 'test',
              bookRef: 'ref',
              description: 'desc',
              allowedCommands: ['git tag'],
              initialState: {
                repoExists: true,
                commits: [{ id: 'C0', parents: [], bugState: 'good' }],
                branches: [{ name: 'master', commitId: 'C0' }],
                tags: [{ name: 'v0.9', commitId: 'C0' }],
                remotes: [{ name: 'origin', url: 'https://example.com/repo.git' }],
                stash: [{ id: 'stash@{0}', files: { 'index.html': 'wip' } }],
                HEAD: { type: 'branch', name: 'master' },
              },
              goal: { type: 'tagState', condition: "t.name === 'v1.0'" },
            },
          ],
        },
      ],
    })

    expect(level.initialEngineState?.tags).toEqual([{ name: 'v0.9', commitId: 'C0' }])
    expect(level.initialEngineState?.remotes).toEqual([
      { name: 'origin', url: 'https://example.com/repo.git' },
    ])
    expect(level.initialEngineState?.stash).toEqual([
      { id: 'stash@{0}', files: { 'index.html': 'wip' } },
    ])
    expect(level.initialEngineState?.commits[0].bugState).toBe('good')
  })

  it('parses remoteState goal conditions for both origin registration and remote branch existence', () => {
    const [level1, level2] = createPlayableLevels({
      levels: [],
      curriculumModules: [
        {
          moduleId: 'm1',
          moduleTitle: 'Module 1',
          bookRef: 'ref',
          levels: [
            {
              id: 'remote-origin',
              title: 'origin',
              bookRef: 'ref',
              description: 'desc',
              allowedCommands: ['git remote add'],
              initialState: {
                commits: [{ id: 'C0', parents: [] }],
                branches: [{ name: 'master', commitId: 'C0' }],
                HEAD: { type: 'branch', name: 'master' },
              },
              goal: {
                type: 'remoteState',
                condition: "remotes.includes('origin') && remoteBranches.master === localBranches.master",
              },
            },
            {
              id: 'remote-branch',
              title: 'branch',
              bookRef: 'ref',
              description: 'desc',
              allowedCommands: ['git push'],
              initialState: {
                commits: [{ id: 'C0', parents: [] }],
                branches: [{ name: 'iss53', commitId: 'C0' }],
                HEAD: { type: 'branch', name: 'iss53' },
              },
              goal: {
                type: 'remoteState',
                condition: "remoteBranches.includes('origin/iss53')",
              },
            },
          ],
        },
      ],
    })

    expect(level1.goalCheck).toMatchObject({
      type: 'remoteState',
      requiredRemoteName: 'origin',
      requiredRemoteBranch: 'origin/master',
    })
    expect(level2.goalCheck).toMatchObject({
      type: 'remoteState',
      requiredRemoteBranch: 'origin/iss53',
    })
  })

  it('wires the real 2-6 conflict lesson data end to end (adapter -> engine -> compareGitLabGoal)', () => {
    const levels = createPlayableLevels(levelsData as never)
    const level = levels.find((candidate) => candidate.id === '2-6')

    expect(level).toBeDefined()
    expect(level?.goalKind).toBe('conflictResolved')
    expect(level?.initialEngineState?.files['index.html'].versions).toMatchObject({
      C4: expect.any(String),
      C3: expect.any(String),
    })
  })
})
