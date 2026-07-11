import { AgentRuntimeKernel } from '@ay-ple/runtime-core'
import { FakeRuntimeAdapter } from '@ay-ple/runtime-fake'
import { RuntimeRunJsonStore } from '../runtime-run-json-store.js'
import {
  createServerApp,
  resolveRuntimeHistoryDirectory,
  resolveRuntimeHistoryLimits,
} from '../server.js'
import { CheckpointFailingRuntimeRunLogPersistence } from './checkpoint-failing-persistence.js'

async function startPersistenceFaultServer(): Promise<void> {
  const limits = resolveRuntimeHistoryLimits()
  const persistence = new CheckpointFailingRuntimeRunLogPersistence(
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
