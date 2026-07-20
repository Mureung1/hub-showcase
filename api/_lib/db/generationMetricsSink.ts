import {
  noopGenerationMetricsSink,
  type GenerationMetric,
  type GenerationMetricsSink,
} from '../generation/metrics'
import {
  createDatabase,
  databaseUrlFromEnvironment,
  type DatabaseEnvironment,
} from './database'
import {
  createDataRepositories,
  createDrizzleDataWriters,
  type GenerationRunRepository,
} from './repositories'

export type BackgroundTaskScheduler = (task: Promise<void>) => void

type DatabaseMetricsSinkDependencies = {
  repository: GenerationRunRepository
  schedule: BackgroundTaskScheduler
}

type EnvironmentMetricsSinkDependencies = {
  createRepository?: (databaseUrl: string) => GenerationRunRepository
  environment: DatabaseEnvironment
  schedule: BackgroundTaskScheduler
}

export const createDatabaseGenerationMetricsSink = ({
  repository,
  schedule,
}: DatabaseMetricsSinkDependencies): GenerationMetricsSink => ({
  record(metric: GenerationMetric) {
    const recordTask = Promise.resolve()
      .then(() => repository.record(metric))
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
  return createDataRepositories(createDrizzleDataWriters(database)).generationRuns
}

export const createEnvironmentGenerationMetricsSink = ({
  createRepository = createDefaultRepository,
  environment,
  schedule,
}: EnvironmentMetricsSinkDependencies): GenerationMetricsSink => {
  const databaseUrl = databaseUrlFromEnvironment(environment)
  if (!databaseUrl) return noopGenerationMetricsSink

  try {
    return createDatabaseGenerationMetricsSink({
      repository: createRepository(databaseUrl),
      schedule,
    })
  } catch {
    return noopGenerationMetricsSink
  }
}
