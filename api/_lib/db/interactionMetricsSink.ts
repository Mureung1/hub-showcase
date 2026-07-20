import type { InteractionEvent } from '../../../src/shared/interaction/contracts'
import type { InteractionEventSink } from '../interaction/handler'
import {
  createDatabase,
  databaseUrlFromEnvironment,
  type DatabaseEnvironment,
} from './database'
import type { BackgroundTaskScheduler } from './generationMetricsSink'
import {
  createDataRepositories,
  createDrizzleDataWriters,
  type InteractionEventRepository,
} from './repositories'

type DatabaseInteractionMetricsSinkDependencies = {
  repository: InteractionEventRepository
  schedule: BackgroundTaskScheduler
}

type EnvironmentInteractionMetricsSinkDependencies = {
  createRepository?: (databaseUrl: string) => InteractionEventRepository
  environment: DatabaseEnvironment
  schedule: BackgroundTaskScheduler
}

export const noopInteractionEventSink: InteractionEventSink = {
  record: () => undefined,
}

export const createDatabaseInteractionMetricsSink = ({
  repository,
  schedule,
}: DatabaseInteractionMetricsSinkDependencies): InteractionEventSink => ({
  record(event: InteractionEvent) {
    const recordTask = Promise.resolve()
      .then(() => repository.record(event))
      .then(() => undefined)
      .catch(() => undefined)

    try {
      schedule(recordTask)
    } catch {
      // Metrics remain best-effort when the runtime cannot extend the request lifetime.
    }
  },
})

const createDefaultRepository = (databaseUrl: string) => {
  const database = createDatabase(databaseUrl)
  return createDataRepositories(createDrizzleDataWriters(database)).interactionEvents
}

export const createEnvironmentInteractionMetricsSink = ({
  createRepository = createDefaultRepository,
  environment,
  schedule,
}: EnvironmentInteractionMetricsSinkDependencies): InteractionEventSink => {
  const databaseUrl = databaseUrlFromEnvironment(environment)
  if (!databaseUrl) return noopInteractionEventSink

  try {
    return createDatabaseInteractionMetricsSink({
      repository: createRepository(databaseUrl),
      schedule,
    })
  } catch {
    return noopInteractionEventSink
  }
}
