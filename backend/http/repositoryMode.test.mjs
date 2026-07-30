import { describe, expect, it } from 'vitest'
import { createRuntimeRepositories } from './server.mjs'

describe('server repository runtime mode', () => {
  it('uses in-memory repositories by default', async () => {
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
    expect(repositories.profileRepository).toBeDefined()
    await expect(repositories.profileRepository.get()).resolves.toBeNull()
    expect(repositories.progressRepository.listMissions()).toHaveProperty('mission-1')
  })

  it('uses SQLite repositories when configured', async () => {
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
    expect(repositories.profileRepository).toBeDefined()
    await expect(repositories.profileRepository.get()).resolves.toBeNull()
    expect(repositories.progressRepository.listMissions()).toHaveProperty('mission-1')
    repositories.sqliteDatabase.close()
  })

  it('uses Supabase repositories with server-only credentials', () => {
    const client = { from() {} }
    let receivedConfig
    const supabaseClientFactory = (config) => {
      receivedConfig = config
      return client
    }

    const repositories = createRuntimeRepositories(
      {
        ICU_REPOSITORY_MODE: 'supabase',
        SUPABASE_URL: 'https://icu.supabase.co',
        SUPABASE_SECRET_KEY: 'sb_secret_test',
      },
      { supabaseClientFactory },
    )

    expect(repositories.repositoryMode).toBe('supabase')
    expect(repositories.supabaseClient).toBe(client)
    expect(repositories.profileRepository).toBeDefined()
    expect(receivedConfig).toEqual({
      url: 'https://icu.supabase.co',
      secretKey: 'sb_secret_test',
    })
  })

  it('rejects missing Supabase server credentials', () => {
    expect(() => createRuntimeRepositories({ ICU_REPOSITORY_MODE: 'supabase' })).toThrow(
      'SUPABASE_URL and SUPABASE_SECRET_KEY are required',
    )
  })

  it('rejects unsupported repository modes', () => {
    expect(() => createRuntimeRepositories({ ICU_REPOSITORY_MODE: 'unknown' })).toThrow(
      'Unsupported ICU_REPOSITORY_MODE: unknown',
    )
  })
})
