import { describe, expect, it } from 'vitest'
import { createSqliteGitLabAttemptRepository } from '../../git-lab/adapters/sqliteGitLabAttemptRepository.mjs'
import { createSqliteLearningProgressRepository } from '../../learning-progress/adapters/sqliteLearningProgressRepository.mjs'
import { createSqliteMistakeNoteRepository } from '../../mistake-notes/adapters/sqliteMistakeNoteRepository.mjs'
import { createSqliteDatabase } from '../../../shared/sqliteDatabase.mjs'

function createMemoryDatabase() {
  return createSqliteDatabase({ dbPath: ':memory:' })
}

describe('SQLite repositories', () => {
  it('persists learning progress with activity log JSON', () => {
    const database = createMemoryDatabase()
    const repository = createSqliteLearningProgressRepository(database)

    repository.saveMission({
      missionId: 'mission-1',
      runState: 'passed',
      runAttemptCount: 2,
      activeStepOffset: 1,
      completedAt: '2026-07-20T10:00:00.000Z',
      activityLog: [{ id: 'a1', time: '10:00', title: 'Run passed', detail: 'All checks passed' }],
    })

    expect(repository.listMissions()).toMatchObject({
      'mission-1': {
        runState: 'passed',
        runAttemptCount: 2,
        activeStepOffset: 1,
        activityLog: [{ id: 'a1', title: 'Run passed' }],
      },
    })

    repository.deleteMission('mission-1')
    expect(repository.listMissions()).toEqual({})
    database.close()
  })

  it('persists mistake notes and detects open duplicates', () => {
    const database = createMemoryDatabase()
    const repository = createSqliteMistakeNoteRepository(database)
    const note = {
      id: 'note-1',
      source: 'workspace',
      lessonId: 'lesson-1',
      lessonTitle: 'HTTP practice',
      command: 'npm test',
      reason: 'Expected 201 but received 200',
      correction: 'Return the expected status code',
      createdAt: '2026-07-20T10:00:00.000Z',
      reviewedAt: null,
      status: 'open',
    }

    repository.save(note)

    expect(repository.findById('note-1')).toMatchObject({ id: 'note-1', status: 'open' })
    expect(repository.findOpenDuplicate(note)).toMatchObject({ id: 'note-1' })

    expect(repository.delete('note-1')).toBe(true)
    expect(repository.findById('note-1')).toBeNull()
    database.close()
  })

  it('persists git lab attempts in newest-first order', () => {
    const database = createMemoryDatabase()
    const repository = createSqliteGitLabAttemptRepository(database)

    repository.save({
      id: 'attempt-1',
      lessonId: 'git-1',
      command: 'git status',
      result: 'passed',
      reason: '',
      createdAt: '2026-07-20T09:00:00.000Z',
    })
    repository.save({
      id: 'attempt-2',
      lessonId: 'git-1',
      command: 'git merge main',
      result: 'failed',
      reason: 'Wrong branch',
      createdAt: '2026-07-20T10:00:00.000Z',
    })

    expect(repository.list().map((attempt) => attempt.id)).toEqual(['attempt-2', 'attempt-1'])

    repository.reset()
    expect(repository.list()).toEqual([])
    database.close()
  })
})
