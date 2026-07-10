import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer as createHttpServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseRuntimeRunLog, type RuntimeRunLog } from '@ay-ple/runtime-core'
import { test as base, type Page } from 'playwright/test'
import { createServer as createViteServer, type ViteDevServer } from 'vite'

const inspectorRoot = fileURLToPath(new URL('../', import.meta.url))
const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const serverEntryPath = path.join(
  workspaceRoot,
  'apps',
  'server',
  'src',
  'server.ts',
)

type InspectorFixtures = {
  inspectorHarness: InspectorHarness
  inspectorPage: Page
}

type InspectorHarness = {
  close: () => Promise<void>
  readCanonicalRunLog: (runId: string) => Promise<RuntimeRunLog>
  restartApiServer: (runId: string) => Promise<{
    canonicalRunLogAtReadiness: RuntimeRunLog
    currentProcessId: number
    previousProcessId: number
  }>
  url: string
}

type ManagedApiServer = {
  process: ChildProcess
  readError: () => Error | undefined
  readOutput: () => string
}

export const test = base.extend<InspectorFixtures>({
  inspectorHarness: async ({ browserName: _browserName }, provideHarness) => {
    const harness = await startInspectorHarness()

    try {
      await provideHarness(harness)
    } finally {
      await harness.close()
    }
  },
  inspectorPage: async ({ inspectorHarness, page }, providePage) => {
    try {
      await page.goto(inspectorHarness.url)
      await providePage(page)
    } finally {
      await page.close()
    }
  },
})

async function startInspectorHarness(): Promise<InspectorHarness> {
  const temporaryRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-inspector-e2e-'),
  )
  let apiServer: ManagedApiServer | undefined
  let inspectorServer: Server | undefined
  let viteServer: ViteDevServer | undefined

  try {
    const apiPort = await reservePort()
    const apiUrl = `http://127.0.0.1:${apiPort}`
    const runtimeHistoryDirectory = path.join(
      temporaryRoot,
      'runtime-history',
    )
    const apiEnvironment: NodeJS.ProcessEnv = {
      ...process.env,
      CODEX_BIN_PATH: path.join(temporaryRoot, 'missing-codex'),
      CODEX_HOME: path.join(temporaryRoot, 'codex-home'),
      CODEX_RUNTIME_CWD: temporaryRoot,
      CODEX_SQLITE_HOME: path.join(temporaryRoot, 'codex-sqlite-home'),
      PORT: String(apiPort),
      RUNTIME_FAKE_DELAY_MS: '5000',
      RUNTIME_HISTORY_DIR: runtimeHistoryDirectory,
    }

    apiServer = await startApiServerProcess(apiUrl, apiEnvironment)
    viteServer = await createViteServer({
      root: inspectorRoot,
      cacheDir: path.join(temporaryRoot, 'vite-cache'),
      clearScreen: false,
      logLevel: 'error',
      server: {
        hmr: false,
        middlewareMode: true,
        proxy: {
          '/api': apiUrl,
        },
      },
    })
    inspectorServer = createHttpServer(viteServer.middlewares)
    inspectorServer.listen(0, '127.0.0.1')
    await once(inspectorServer, 'listening')

    let closed = false

    return {
      url: serverUrl(inspectorServer),
      readCanonicalRunLog: (runId) =>
        readCanonicalRunLog(runtimeHistoryDirectory, runId),
      restartApiServer: async (runId) => {
        const previousProcessId = apiServerProcessId(apiServer)

        await closeApiServerProcess(apiServer)

        apiServer = await startApiServerProcess(apiUrl, apiEnvironment)
        const canonicalRunLogAtReadiness = await readCanonicalRunLog(
          runtimeHistoryDirectory,
          runId,
        )

        return {
          canonicalRunLogAtReadiness,
          currentProcessId: apiServerProcessId(apiServer),
          previousProcessId,
        }
      },
      close: async () => {
        if (closed) {
          return
        }

        closed = true
        await closeHarnessResources({
          apiServer,
          inspectorServer,
          temporaryRoot,
          viteServer,
        })
      },
    }
  } catch (error) {
    await closeHarnessResources({
      apiServer,
      inspectorServer,
      temporaryRoot,
      viteServer,
    })
    throw error
  }
}

async function readCanonicalRunLog(
  historyDirectory: string,
  runId: string,
): Promise<RuntimeRunLog> {
  const recordPath = path.join(historyDirectory, `${runId}.json`)
  const contents = await readFile(recordPath, 'utf8')
  const envelope = JSON.parse(contents) as {
    schemaVersion?: unknown
    log?: unknown
  }

  if (envelope.schemaVersion !== 1) {
    throw new Error(
      `Expected runtime history schema version 1 for run ${runId}`,
    )
  }

  const log = parseRuntimeRunLog(envelope.log)

  if (log.runId !== runId) {
    throw new Error(
      `Expected canonical runtime history for ${runId}, received ${log.runId}`,
    )
  }

  return log
}

function serverUrl(server: Server): string {
  return `http://127.0.0.1:${serverPort(server)}`
}

function serverPort(server: Server): number {
  const address = server.address() as AddressInfo | null

  if (!address) {
    throw new Error('Expected browser harness server to be listening')
  }

  return address.port
}

async function closeHarnessResources(resources: {
  apiServer?: ManagedApiServer
  inspectorServer?: Server
  temporaryRoot: string
  viteServer?: ViteDevServer
}): Promise<void> {
  const results = await Promise.allSettled([
    closeServer(resources.inspectorServer),
    resources.viteServer?.close() ?? Promise.resolve(),
    closeApiServerProcess(resources.apiServer),
  ])

  await rm(resources.temporaryRoot, { force: true, recursive: true })

  const rejectedResult = results.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (rejectedResult) {
    throw rejectedResult.reason
  }
}

async function reservePort(): Promise<number> {
  const server = createHttpServer()

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const port = serverPort(server)

  await closeServer(server)

  return port
}

async function startApiServerProcess(
  apiUrl: string,
  environment: NodeJS.ProcessEnv,
): Promise<ManagedApiServer> {
  let output = ''
  let processError: Error | undefined
  const childProcess = spawn(
    process.execPath,
    ['--conditions=development', '--import', 'tsx', serverEntryPath],
    {
      cwd: workspaceRoot,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  const appendOutput = (chunk: Buffer) => {
    output = `${output}${chunk.toString()}`.slice(-20_000)
  }

  childProcess.stdout?.on('data', appendOutput)
  childProcess.stderr?.on('data', appendOutput)
  childProcess.on('error', (error) => {
    processError = error
  })

  const managedServer: ManagedApiServer = {
    process: childProcess,
    readError: () => processError,
    readOutput: () => output,
  }

  try {
    await waitForApiServer(apiUrl, managedServer)
    return managedServer
  } catch (error) {
    await closeApiServerProcess(managedServer)
    throw error
  }
}

async function waitForApiServer(
  apiUrl: string,
  server: ManagedApiServer,
): Promise<void> {
  const deadline = Date.now() + 10_000

  while (Date.now() < deadline) {
    const processError = server.readError()

    if (processError) {
      throw new Error(`API server process failed: ${processError.message}`)
    }

    if (
      server.process.exitCode !== null ||
      server.process.signalCode !== null
    ) {
      throw new Error(
        `API server process exited before readiness:\n${server.readOutput()}`,
      )
    }

    try {
      const response = await fetch(`${apiUrl}/api/health`, {
        signal: AbortSignal.timeout(500),
      })

      if (response.ok) {
        return
      }
    } catch {
      // The process may still be hydrating or binding its listener.
    }

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 50)
    })
  }

  throw new Error(
    `API server did not become ready before timeout:\n${server.readOutput()}`,
  )
}

function apiServerProcessId(server: ManagedApiServer | undefined): number {
  const processId = server?.process.pid

  if (processId === undefined) {
    throw new Error('Expected API server process ID')
  }

  return processId
}

async function closeApiServerProcess(
  server: ManagedApiServer | undefined,
): Promise<void> {
  const childProcess = server?.process

  if (
    !childProcess ||
    childProcess.exitCode !== null ||
    childProcess.signalCode !== null
  ) {
    return
  }

  await new Promise<void>((resolve) => {
    const forceKillTimeout = setTimeout(() => {
      childProcess.kill('SIGKILL')
    }, 5_000)

    childProcess.once('exit', () => {
      clearTimeout(forceKillTimeout)
      resolve()
    })

    if (!childProcess.kill('SIGTERM')) {
      clearTimeout(forceKillTimeout)
      resolve()
    }
  })
}

async function closeServer(server: Server | undefined): Promise<void> {
  if (!server?.listening) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}
