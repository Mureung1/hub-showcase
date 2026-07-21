import { describe, expect, it, vi } from 'vitest'
import type { InteractionEvent } from '../../../src/shared/interaction/contracts.js'
import type { InteractionEventRepository } from './repositories.js'
import {
  createDatabaseInteractionMetricsSink,
  createEnvironmentInteractionMetricsSink,
} from './interactionMetricsSink.js'

const event: InteractionEvent = {
  eventName: 'result_shown',
  mode: 'initiate',
  route: 'template_fallback',
  scenarioId: 'friend',
  situationId: 'express_feelings',
}

describe('T36 interaction metrics sink', () => {
  it('schedules a background repository write without adding request metadata', async () => {
    const record = vi.fn<InteractionEventRepository['record']>(() => Promise.resolve())
    const scheduledTasks: Array<Promise<void>> = []
    const sink = createDatabaseInteractionMetricsSink({
      repository: { record },
      schedule: (task) => scheduledTasks.push(task),
    })

    sink.record(event)

    expect(scheduledTasks).toHaveLength(1)
    await expect(scheduledTasks[0]).resolves.toBeUndefined()
    expect(record).toHaveBeenCalledExactlyOnceWith(event)
  })

  it('swallows asynchronous repository failures', async () => {
    const scheduledTasks: Array<Promise<void>> = []
    const sink = createDatabaseInteractionMetricsSink({
      repository: { record: () => Promise.reject(new Error('database unavailable')) },
      schedule: (task) => scheduledTasks.push(task),
    })

    expect(() => sink.record(event)).not.toThrow()
    await expect(scheduledTasks[0]).resolves.toBeUndefined()
  })

  it('does not throw when waitUntil is unavailable', async () => {
    const record = vi.fn<InteractionEventRepository['record']>(() => Promise.resolve())
    const sink = createDatabaseInteractionMetricsSink({
      repository: { record },
      schedule: () => {
        throw new Error('waitUntil unavailable')
      },
    })

    expect(() => sink.record(event)).not.toThrow()
    await Promise.resolve()
    expect(record).toHaveBeenCalledExactlyOnceWith(event)
  })

  it('uses a no-op sink without DATABASE_URL or when repository setup fails', () => {
    const createRepository = vi.fn<(databaseUrl: string) => InteractionEventRepository>()
    const missingSink = createEnvironmentInteractionMetricsSink({
      createRepository,
      environment: {},
      schedule: () => undefined,
    })

    expect(() => missingSink.record(event)).not.toThrow()
    expect(createRepository).not.toHaveBeenCalled()

    const failingSink = createEnvironmentInteractionMetricsSink({
      createRepository: () => {
        throw new Error('invalid database setup')
      },
      environment: { DATABASE_URL: 'postgresql://example.test/db' },
      schedule: () => undefined,
    })

    expect(() => failingSink.record(event)).not.toThrow()
  })

  it('trims DATABASE_URL before creating the repository', () => {
    const createRepository = vi.fn<(databaseUrl: string) => InteractionEventRepository>(() => ({
      record: () => Promise.resolve(),
    }))
    const sink = createEnvironmentInteractionMetricsSink({
      createRepository,
      environment: { DATABASE_URL: '  postgresql://example.test/db  ' },
      schedule: () => undefined,
    })

    sink.record(event)

    expect(createRepository).toHaveBeenCalledWith('postgresql://example.test/db')
  })
})
