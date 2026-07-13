import type {
  RuntimeRunLog,
  RuntimeRunLogPersistence,
  RuntimeRunLogPersistenceMutationResult,
} from '@ay-ple/runtime-core'

export const checkpointPersistenceFailureMessage =
  'Injected checkpoint persistence failure'

export class CheckpointFailingRuntimeRunLogPersistence
  implements RuntimeRunLogPersistence
{
  private readonly delegate: RuntimeRunLogPersistence
  private checkpointFailed = false

  constructor(delegate: RuntimeRunLogPersistence) {
    this.delegate = delegate
  }

  load(): Promise<RuntimeRunLog[]> {
    return this.delegate.load()
  }

  applyRetention(): Promise<RuntimeRunLogPersistenceMutationResult> {
    return this.delegate.applyRetention()
  }

  save(
    log: RuntimeRunLog,
  ): Promise<RuntimeRunLogPersistenceMutationResult> {
    if (
      this.checkpointFailed ||
      (log.status === 'running' &&
        log.events.some((event) => event.type === 'output_delta'))
    ) {
      this.checkpointFailed = true
      return Promise.reject(new Error(checkpointPersistenceFailureMessage))
    }

    return this.delegate.save(log)
  }

  remove(runId: string): Promise<void> {
    return this.delegate.remove(runId)
  }
}
