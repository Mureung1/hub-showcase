import { afterEach, describe, expect, it } from 'vitest'
import { createSqliteDatabase } from '../../../shared/sqliteDatabase.mjs'
import { createInMemoryProfileRepository } from './inMemoryProfileRepository.mjs'
import { createSqliteProfileRepository } from './sqliteProfileRepository.mjs'
import { createSupabaseProfileRepository } from './supabaseProfileRepository.mjs'

const profile = {
  displayName: '예린',
  learningGoal: 'React 앱 완성하기',
  preferredTracks: ['frontend', 'git'],
  dailyStudyMinutes: 60,
  level: 'beginner',
}

const databases = []

afterEach(() => databases.splice(0).forEach((database) => database.close()))

describe.each([
  ['in-memory', () => createInMemoryProfileRepository()],
  ['SQLite', () => {
    const database = createSqliteDatabase({ dbPath: ':memory:' })
    databases.push(database)
    return createSqliteProfileRepository(database)
  }],
])('%s profile repository', (_name, createRepository) => {
  it('saves, retrieves, and removes the singleton profile', async () => {
    const repository = createRepository()

    await expect(repository.get()).resolves.toBeNull()
    await expect(repository.save(profile)).resolves.toEqual(profile)
    await expect(repository.get()).resolves.toEqual(profile)
    await repository.remove()
    await expect(repository.get()).resolves.toBeNull()
  })
})

describe('Supabase profile repository', () => {
  it('maps the primary row through select, upsert, and delete', async () => {
    const calls = []
    const row = {
      id: 'primary',
      display_name: '예린',
      learning_goal: 'React 앱 완성하기',
      preferred_tracks: ['frontend', 'git'],
      daily_study_minutes: 60,
      level: 'beginner',
    }
    const client = createSupabaseClientDouble({ calls, row })
    const repository = createSupabaseProfileRepository(client)

    await expect(repository.get()).resolves.toEqual(profile)
    await expect(repository.save(profile)).resolves.toEqual(profile)
    await repository.remove()

    expect(calls).toEqual([
      ['select', 'learner_profiles', '*', 'id', 'primary'],
      ['upsert', 'learner_profiles', row, { onConflict: 'id' }],
      ['delete', 'learner_profiles', 'id', 'primary'],
    ])
  })
})

function createSupabaseClientDouble({ calls, row }) {
  return {
    from(resource) {
      return {
        select(columns) {
          return {
            eq(column, value) {
              return {
                async maybeSingle() {
                  calls.push(['select', resource, columns, column, value])
                  return { data: row, error: null }
                },
              }
            },
          }
        },
        async upsert(value, options) {
          calls.push(['upsert', resource, value, options])
          return { data: null, error: null }
        },
        delete() {
          return {
            async eq(column, value) {
              calls.push(['delete', resource, column, value])
              return { data: null, error: null }
            },
          }
        },
      }
    },
  }
}
