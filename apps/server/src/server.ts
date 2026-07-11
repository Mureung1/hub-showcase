import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  AgentRuntimeKernel,
  isTerminalRuntimeRunEvent,
  RuntimePersistenceUnavailableError,
  type RuntimeRunEvent,
} from '@ay-ple/runtime-core'
import {
  CodexRuntimeAdapter,
  listCodexCapabilitySlots,
  readCodexRuntimeStatus,
  type CodexRawClientOptions,
} from '@ay-ple/runtime-codex'
import { FakeRuntimeAdapter } from '@ay-ple/runtime-fake'
import cors from 'cors'
import dotenv from 'dotenv'
import express, { type Express, type Response } from 'express'
import {
  defaultRuntimeHistoryMaxBytes,
  defaultRuntimeHistoryMaxRuns,
  parsePositiveSafeInteger,
  RuntimeRunJsonStore,
} from './runtime-run-json-store.js'

dotenv.config()

const port = Number(process.env.PORT ?? 3000)
const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url))

export type CreateServerAppOptions = {
  fakeDelayMs?: number
  kernel?: AgentRuntimeKernel
  codexRawClientOptions?: CodexRawClientOptions
  runtimeHistoryDirectory?: string
  runtimeHistoryMaxRuns?: number
  runtimeHistoryMaxBytes?: number
}

type FakeRuntimeScenario = 'failure'

export async function createServerApp(
  options: CreateServerAppOptions = {},
): Promise<Express> {
  const codexRawClientOptions =
    options.codexRawClientOptions ?? readCodexRawClientOptionsFromEnv()
  let fakeAdapter: FakeRuntimeAdapter | undefined
  let kernel = options.kernel

  if (!kernel) {
    fakeAdapter = new FakeRuntimeAdapter({
      delayMs: options.fakeDelayMs ?? readFakeRuntimeDelayFromEnv(),
    })
    const codexAdapter = new CodexRuntimeAdapter({
      rawClientOptions: codexRawClientOptions,
    })
    const runtimeHistoryLimits =
      options.runtimeHistoryMaxRuns === undefined ||
      options.runtimeHistoryMaxBytes === undefined
        ? resolveRuntimeHistoryLimits()
        : undefined

    kernel = await AgentRuntimeKernel.create({
      adapters: [fakeAdapter, codexAdapter],
      persistence: new RuntimeRunJsonStore({
        directory:
          options.runtimeHistoryDirectory ??
          resolveRuntimeHistoryDirectory(),
        maxTerminalRuns:
          options.runtimeHistoryMaxRuns ?? runtimeHistoryLimits?.maxRuns,
        maxTerminalBytes:
          options.runtimeHistoryMaxBytes ?? runtimeHistoryLimits?.maxBytes,
      }),
    })
  }

  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    const persistence = kernel.getPersistenceState()

    res
      .status(persistence.status === 'ready' ? 200 : 503)
      .json({ ok: persistence.status === 'ready', persistence })
  })

  app.get('/api/runtime/adapters', (_req, res) => {
    res.json({ adapters: kernel.listAdapters() })
  })

  app.get('/api/runtime/codex/capabilities', (_req, res) => {
    res.json({ slots: listCodexCapabilitySlots() })
  })

  app.get('/api/runtime/codex/status', async (_req, res) => {
    res.json(await readCodexRuntimeStatus(codexRawClientOptions))
  })

  app.post('/api/runtime/runs', async (req, res) => {
    const adapter = req.body?.adapter
    const prompt = req.body?.prompt
    const fakeScenario = req.body?.fakeScenario

    if (typeof adapter !== 'string') {
      res.status(400).json({ error: 'adapter is required' })
      return
    }

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt is required' })
      return
    }

    if (!isFakeRuntimeScenario(fakeScenario)) {
      res.status(400).json({ error: 'fakeScenario is invalid' })
      return
    }

    if (fakeScenario === 'failure') {
      if (!fakeAdapter || adapter !== fakeAdapter.name) {
        res.status(400).json({
          error: 'fakeScenario is only supported by the fake adapter',
        })
        return
      }

      fakeAdapter.failNextRun()
    }

    try {
      const run = await kernel.startRun({ adapter, prompt })
      res.status(201).json({ runId: run.runId })
    } catch (error) {
      if (sendRuntimePersistenceUnavailable(res, error)) {
        return
      }

      res.status(400).json({
        error: error instanceof Error ? error.message : 'Unable to start run',
      })
    }
  })

  app.get('/api/runtime/runs', (_req, res) => {
    res.json({ runs: kernel.listRuns() })
  })

  app.delete('/api/runtime/runs', async (_req, res) => {
    try {
      const clearedRunIds = await kernel.clearTerminalHistory()

      res.json({ clearedRunIds })
    } catch (error) {
      if (sendRuntimePersistenceUnavailable(res, error)) {
        return
      }

      throw error
    }
  })

  app.get('/api/runtime/runs/:runId', (req, res) => {
    const run = kernel.getRunLog(req.params.runId)

    if (!run) {
      res.status(404).json({ error: 'runtime run not found' })
      return
    }

    res.json({ run })
  })

  app.post('/api/runtime/runs/:runId/cancel', async (req, res) => {
    try {
      const run = await kernel.cancelRun(req.params.runId)

      if (!run) {
        res.status(404).json({ error: 'runtime run not found' })
        return
      }

      res.json({ run })
    } catch (error) {
      if (sendRuntimePersistenceUnavailable(res, error)) {
        return
      }

      throw error
    }
  })

  app.get('/api/runtime/runs/:runId/events', (req, res) => {
    const run = kernel.getRunLog(req.params.runId)

    if (!run) {
      res.status(404).json({ error: 'runtime run not found' })
      return
    }

    const afterSequence = Number(req.query.after ?? 0)

    if (!Number.isInteger(afterSequence) || afterSequence < 0) {
      res.status(400).json({ error: 'after must be a non-negative integer' })
      return
    }

    res.setHeader('content-type', 'text/event-stream')
    res.setHeader('cache-control', 'no-cache')
    res.setHeader('connection', 'keep-alive')
    res.setHeader('x-accel-buffering', 'no')
    res.flushHeaders()

    let subscribed = false
    let shouldCloseAfterSubscribe = false
    let unsubscribe = () => {}
    const closeStream = () => {
      unsubscribe()
      res.end()
    }

    unsubscribe = kernel.subscribeToRun(
      req.params.runId,
      afterSequence,
      (event) => {
        writeSseEvent(res, event)

        if (!isTerminalRuntimeRunEvent(event)) {
          return
        }

        if (subscribed) {
          closeStream()
          return
        }

        shouldCloseAfterSubscribe = true
      },
    )

    subscribed = true

    if (shouldCloseAfterSubscribe) {
      closeStream()
      return
    }

    req.on('close', () => {
      unsubscribe()
    })
  })

  return app
}

function readCodexRawClientOptionsFromEnv(): CodexRawClientOptions {
  return {
    codexBinPath: process.env.CODEX_BIN_PATH,
    cwd: process.env.CODEX_RUNTIME_CWD,
    codexHome: process.env.CODEX_HOME,
    codexSqliteHome: process.env.CODEX_SQLITE_HOME,
  }
}

export function resolveRuntimeHistoryDirectory(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return (
    environment.RUNTIME_HISTORY_DIR ??
    path.join(workspaceRoot, '.ay-ple', 'runtime-harness', 'runs')
  )
}

export function resolveRuntimeHistoryLimits(
  environment: NodeJS.ProcessEnv = process.env,
): { maxBytes: number; maxRuns: number } {
  return {
    maxBytes: parsePositiveSafeIntegerSetting(
      environment.RUNTIME_HISTORY_MAX_BYTES,
      defaultRuntimeHistoryMaxBytes,
      'RUNTIME_HISTORY_MAX_BYTES',
    ),
    maxRuns: parsePositiveSafeIntegerSetting(
      environment.RUNTIME_HISTORY_MAX_RUNS,
      defaultRuntimeHistoryMaxRuns,
      'RUNTIME_HISTORY_MAX_RUNS',
    ),
  }
}

function parsePositiveSafeIntegerSetting(
  configuredValue: string | undefined,
  defaultValue: number,
  settingName: string,
): number {
  if (configuredValue === undefined) {
    return defaultValue
  }

  return parsePositiveSafeInteger(Number(configuredValue), settingName)
}

function readFakeRuntimeDelayFromEnv(): number | undefined {
  const configuredDelay = process.env.RUNTIME_FAKE_DELAY_MS

  if (configuredDelay === undefined) {
    return undefined
  }

  const delayMs = Number(configuredDelay)

  if (!Number.isInteger(delayMs) || delayMs < 0) {
    throw new Error('RUNTIME_FAKE_DELAY_MS must be a non-negative integer')
  }

  return delayMs
}

function writeSseEvent(res: Response, event: RuntimeRunEvent): void {
  res.write('event: runtime-event\n')
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

function isFakeRuntimeScenario(
  fakeScenario: unknown,
): fakeScenario is FakeRuntimeScenario | undefined {
  return fakeScenario === undefined || fakeScenario === 'failure'
}

function sendRuntimePersistenceUnavailable(
  response: Response,
  error: unknown,
): boolean {
  if (!(error instanceof RuntimePersistenceUnavailableError)) {
    return false
  }

  response.status(503).json({
    error: error.message,
    code: error.code,
  })

  return true
}

async function startServer(): Promise<void> {
  const app = await createServerApp()

  app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void startServer().catch((error: unknown) => {
    console.error(
      `Unable to start server: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exitCode = 1
  })
}
