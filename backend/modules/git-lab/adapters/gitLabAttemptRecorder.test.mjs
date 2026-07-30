import { afterEach, describe, expect, it } from 'vitest'
import { createSqliteDatabase } from '../../../shared/sqliteDatabase.mjs'
import { createSqliteMistakeNoteRepository } from '../../mistake-notes/adapters/sqliteMistakeNoteRepository.mjs'
import { createSqliteGitLabAttemptRepository } from './sqliteGitLabAttemptRepository.mjs'
import { createSqliteGitLabAttemptRecorder } from './sqliteGitLabAttemptRecorder.mjs'

const databases = []

afterEach(() => {
  databases.splice(0).forEach((database) => database.close())
})

describe('SQLite Git Lab attempt recorder', () => {
  it('rolls back the attempt when saving the mistake note fails', async () => {
    const database = createSqliteDatabase({ dbPath: ':memory:' })
    databases.push(database)
    const attemptRepository = createSqliteGitLabAttemptRepository(database)
    const mistakeNoteRepository = {
      ...createSqliteMistakeNoteRepository(database),
      save() {
        throw new Error('mistake note write failed')
      },
    }
    const recorder = createSqliteGitLabAttemptRecorder({
      database,
      attemptRepository,
      mistakeNoteRepository,
    })

    await expect(recorder.record({
      attempt: createAttempt(),
      mistakeNote: createMistakeNote(),
    })).rejects.toThrow('mistake note write failed')

    expect(attemptRepository.list()).toEqual([])
  })

  it('commits the attempt and mistake note together', async () => {
    const database = createSqliteDatabase({ dbPath: ':memory:' })
    databases.push(database)
    const attemptRepository = createSqliteGitLabAttemptRepository(database)
    const mistakeNoteRepository = createSqliteMistakeNoteRepository(database)
    const recorder = createSqliteGitLabAttemptRecorder({
      database,
      attemptRepository,
      mistakeNoteRepository,
    })

    await expect(recorder.record({
      attempt: createAttempt(),
      mistakeNote: createMistakeNote(),
    })).resolves.toMatchObject({
      attempt: { id: 'attempt-1' },
      mistakeNote: { id: 'mistake-1' },
    })

    expect(attemptRepository.list()).toHaveLength(1)
    expect(mistakeNoteRepository.list()).toHaveLength(1)
  })
})

function createAttempt() {
  return {
    id: 'attempt-1',
    lessonId: 'lesson-1',
    command: 'git status',
    result: 'failed',
    reason: 'not clean',
    createdAt: '2026-07-28T00:00:00.000Z',
  }
}

function createMistakeNote() {
  return {
    id: 'mistake-1',
    source: 'git-lab',
    lessonId: 'lesson-1',
    lessonTitle: 'Git 상태',
    command: 'git status',
    reason: 'not clean',
    correction: '변경 사항을 정리합니다.',
    createdAt: '2026-07-28T00:00:00.000Z',
    reviewedAt: null,
    status: 'open',
  }
}
