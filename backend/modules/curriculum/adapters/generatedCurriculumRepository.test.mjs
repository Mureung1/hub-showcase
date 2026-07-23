import { describe, expect, it } from 'vitest'
import { createInMemoryGeneratedCurriculumRepository } from './inMemoryGeneratedCurriculumRepository.mjs'
import { createSqliteGeneratedCurriculumRepository } from './sqliteGeneratedCurriculumRepository.mjs'
import { createSqliteDatabase } from '../../../shared/sqliteDatabase.mjs'

const testSnapshot = {
  id: 'test-plan-1',
  goal: 'Learn Docker containerization',
  plan: {
    id: 'test-plan-1',
    goal: 'Learn Docker containerization',
    title: 'Docker Fundamentals',
    summary: 'Master Docker containers and images.',
    estimatedDuration: '2 weeks',
    focusRole: 'Backend Developer',
    todayMission: {
      title: 'Container Basics',
      detail: 'Run docker run alpine',
      durationMinutes: 30,
      fileName: 'Dockerfile',
      mode: 'docker',
    },
    steps: [{ id: 'docker-01', title: 'Install Docker' }],
    sources: [{ title: 'Docker Docs', type: 'official_docs', urlLabel: 'https://docs.docker.com' }],
  },
  generatedAt: '2026-07-23T12:00:00.000Z',
  updatedAt: '2026-07-23T12:00:00.000Z',
}

describe('generated curriculum repositories', () => {
  describe('in-memory repository', () => {
    it('returns null when no snapshot is stored', () => {
      const repo = createInMemoryGeneratedCurriculumRepository()
      expect(repo.getLatest()).toBeNull()
    })

    it('saves and retrieves the latest snapshot', () => {
      const repo = createInMemoryGeneratedCurriculumRepository()
      repo.save(testSnapshot)
      expect(repo.getLatest()).toEqual(testSnapshot)
    })

    it('resets the stored snapshot', () => {
      const repo = createInMemoryGeneratedCurriculumRepository(testSnapshot)
      expect(repo.getLatest()).toEqual(testSnapshot)
      repo.reset()
      expect(repo.getLatest()).toBeNull()
    })
  })

  describe('SQLite repository', () => {
    it('persists and retrieves snapshots across repository instances', () => {
      const db = createSqliteDatabase({ dbPath: ':memory:' })
      const repo = createSqliteGeneratedCurriculumRepository(db)

      expect(repo.getLatest()).toBeNull()

      repo.save(testSnapshot)
      expect(repo.getLatest()).toEqual(testSnapshot)

      const repo2 = createSqliteGeneratedCurriculumRepository(db)
      expect(repo2.getLatest()).toEqual(testSnapshot)

      repo.reset()
      expect(repo.getLatest()).toBeNull()
    })
  })
})
