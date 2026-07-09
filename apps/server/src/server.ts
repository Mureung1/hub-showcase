import { pathToFileURL } from 'node:url'
import {
  AgentRuntimeKernel,
  isTerminalRuntimeRunEvent,
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

dotenv.config()

const port = Number(process.env.PORT ?? 3000)

export type CreateServerAppOptions = {
  fakeDelayMs?: number
  kernel?: AgentRuntimeKernel
  codexRawClientOptions?: CodexRawClientOptions
}

type FakeRuntimeScenario = 'failure'

export function createServerApp(options: CreateServerAppOptions = {}): Express {
  const app = express()
  const codexRawClientOptions =
    options.codexRawClientOptions ?? readCodexRawClientOptionsFromEnv()
  const fakeAdapter = new FakeRuntimeAdapter({
    delayMs: options.fakeDelayMs,
  })
  const codexAdapter = new CodexRuntimeAdapter({
    rawClientOptions: codexRawClientOptions,
  })
  const kernel =
    options.kernel ??
    new AgentRuntimeKernel({
      adapters: [fakeAdapter, codexAdapter],
    })
  const canControlFakeAdapter = options.kernel === undefined

  app.use(cors())
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true })
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

  app.post('/api/runtime/runs', (req, res) => {
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
      if (!canControlFakeAdapter || adapter !== fakeAdapter.name) {
        res.status(400).json({
          error: 'fakeScenario is only supported by the fake adapter',
        })
        return
      }

      fakeAdapter.failNextRun()
    }

    try {
      const run = kernel.startRun({ adapter, prompt })
      res.status(201).json({ runId: run.runId })
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Unable to start run',
      })
    }
  })

  app.get('/api/runtime/runs', (_req, res) => {
    res.json({ runs: kernel.listRuns() })
  })

  app.get('/api/runtime/runs/:runId', (req, res) => {
    const run = kernel.getRunLog(req.params.runId)

    if (!run) {
      res.status(404).json({ error: 'runtime run not found' })
      return
    }

    res.json({ run })
  })

  app.post('/api/runtime/runs/:runId/cancel', (req, res) => {
    const run = kernel.cancelRun(req.params.runId)

    if (!run) {
      res.status(404).json({ error: 'runtime run not found' })
      return
    }

    res.json({ run })
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

function writeSseEvent(res: Response, event: RuntimeRunEvent): void {
  res.write('event: runtime-event\n')
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

function isFakeRuntimeScenario(
  fakeScenario: unknown,
): fakeScenario is FakeRuntimeScenario | undefined {
  return fakeScenario === undefined || fakeScenario === 'failure'
}

function startServer(): void {
  const app = createServerApp()

  app.listen(port, () => {
    console.log(`server listening on http://localhost:${port}`)
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer()
}
