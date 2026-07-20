import { describe, expect, it, vi } from 'vitest'
import type { GenerationRunRepository } from './repositories'
import {
  createDatabaseGenerationMetricsSink,
  createEnvironmentGenerationMetricsSink,
} from './generationMetricsSink'

const metric = {
  attemptCount: 1,
  latencyMs: 120,
  purposeId: 'ask',
  route: 'ai',
  scenarioId: 'friend',
  status: 'success',
} as const

describe('T30 generation metrics sink', () => {
  it('schedules a background repository write', async () => {
    const record = vi.fn<GenerationRunRepository['record']>(() =>
      Promise.resolve('generation-id'),
    )
    const scheduledTasks: Array<Promise<void>> = []
    const sink = createDatabaseGenerationMetricsSink({
      repository: { record },
      schedule: (task) => scheduledTasks.push(task),
    })

    sink.record(metric)

    expect(scheduledTasks).toHaveLength(1)
    await expect(scheduledTasks[0]).resolves.toBeUndefined()
    expect(record).toHaveBeenCalledWith(metric)
  })

  it('swallows asynchronous database failures', async () => {
    const scheduledTasks: Array<Promise<void>> = []
    const sink = createDatabaseGenerationMetricsSink({
      repository: { record: () => Promise.reject(new Error('database unavailable')) },
      schedule: (task) => scheduledTasks.push(task),
    })

    expect(() => sink.record(metric)).not.toThrow()
    await expect(scheduledTasks[0]).resolves.toBeUndefined()
  })

  it('does not throw when the runtime scheduler is unavailable', async () => {
    const record = vi.fn<GenerationRunRepository['record']>(() =>
      Promise.resolve('generation-id'),
    )
    const sink = createDatabaseGenerationMetricsSink({
      repository: { record },
      schedule: () => {
        throw new Error('waitUntil unavailable')
      },
    })

    expect(() => sink.record(metric)).not.toThrow()
    await Promise.resolve()
    expect(record).toHaveBeenCalledWith(metric)
  })

  it('uses a no-op sink when DATABASE_URL is missing or repository setup fails', () => {
    const createRepository = vi.fn<(databaseUrl: string) => GenerationRunRepository>()
    const missingSink = createEnvironmentGenerationMetricsSink({
      createRepository,
      environment: {},
      schedule: () => undefined,
    })

    expect(() => missingSink.record(metric)).not.toThrow()
    expect(createRepository).not.toHaveBeenCalled()

    const failingSink = createEnvironmentGenerationMetricsSink({
      createRepository: () => {
        throw new Error('invalid database setup')
      },
      environment: { DATABASE_URL: 'postgresql://example.test/db' },
      schedule: () => undefined,
    })

    expect(() => failingSink.record(metric)).not.toThrow()
  })

  it('trims DATABASE_URL before creating the repository', () => {
    const createRepository = vi.fn<(databaseUrl: string) => GenerationRunRepository>(() => ({
      record: () => Promise.resolve('generation-id'),
    }))
    const sink = createEnvironmentGenerationMetricsSink({
      createRepository,
      environment: { DATABASE_URL: '  postgresql://example.test/db  ' },
      schedule: () => undefined,
    })

    sink.record(metric)

    expect(createRepository).toHaveBeenCalledWith('postgresql://example.test/db')
  })
})
