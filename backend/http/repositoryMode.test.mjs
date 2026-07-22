import { describe, expect, it } from 'vitest'
import { createRuntimeRepositories } from './server.mjs'

describe('server repository runtime mode', () => {
  it('uses in-memory repositories by default', () => {
    const repositories = createRuntimeRepositories({})

    repositories.progressRepository.saveMission({
      missionId: 'mission-1',
      runState: 'passed',
      runAttemptCount: 1,
      activeStepOffset: 0,
      completedAt: null,
      activityLog: [],
    })

    expect(repositories).not.toHaveProperty('sqliteDatabase')
    expect(repositories.progressRepository.listMissions()).toHaveProperty('mission-1')
  })

  it('uses SQLite repositories when configured', () => {
    const repositories = createRuntimeRepositories({
      ICU_REPOSITORY_MODE: 'sqlite',
      ICU_SQLITE_PATH: ':memory:',
    })

    repositories.progressRepository.saveMission({
      missionId: 'mission-1',
      runState: 'passed',
      runAttemptCount: 1,
      activeStepOffset: 0,
      completedAt: null,
      activityLog: [],
    })

    expect(repositories).toHaveProperty('sqliteDatabase')
    expect(repositories.progressRepository.listMissions()).toHaveProperty('mission-1')
    repositories.sqliteDatabase.close()
  })
})
