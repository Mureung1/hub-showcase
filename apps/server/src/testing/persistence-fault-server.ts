import {
  AgentRuntimeKernel,
  type RuntimeRunLog,
  type RuntimeRunLogPersistence,
  type RuntimeRunLogPersistenceMutationResult,
} from '@ay-ple/runtime-core'
import { FakeRuntimeAdapter } from '@ay-ple/runtime-fake'
import { RuntimeRunJsonStore } from '../runtime-run-json-store.js'
import {
  createServerApp,
  resolveRuntimeHistoryDirectory,
  resolveRuntimeHistoryLimits,
} from '../server.js'

const checkpointFailureMessage = 'Injected checkpoint persistence failure'

class CheckpointFailingRuntimeRunPersistence
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
      return Promise.reject(new Error(checkpointFailureMessage))
    }

    return this.delegate.save(log)
  }

  remove(runId: string): Promise<void> {
    return this.delegate.remove(runId)
  }
}

async function startPersistenceFaultServer(): Promise<void> {
  const limits = resolveRuntimeHistoryLimits()
  const persistence = new CheckpointFailingRuntimeRunPersistence(
    new RuntimeRunJsonStore({
      directory: resolveRuntimeHistoryDirectory(),
      maxTerminalBytes: limits.maxBytes,
      maxTerminalRuns: limits.maxRuns,
    }),
  )
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new FakeRuntimeAdapter({ delayMs: 300 })],
    persistence,
  })
  const app = await createServerApp({ kernel })
  const port = Number(process.env.PORT ?? 3000)

  app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`)
  })
}

void startPersistenceFaultServer().catch((error: unknown) => {
  console.error(
    `Unable to start persistence fault server: ${error instanceof Error ? error.message : String(error)}`,
  )
  process.exitCode = 1
})
