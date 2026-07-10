import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url))
const serverEntryPath = fileURLToPath(new URL('./server.ts', import.meta.url))
const canonicalRunId = '11111111-1111-4111-8111-111111111111'

test('server process fails closed before listening when runtime history startup fails', async (t) => {
  const cases: Array<{
    name: string
    prepare: (temporaryRoot: string) => Promise<{
      environment?: NodeJS.ProcessEnv
      historyDirectory: string
      expectedError: RegExp
    }>
  }> = [
    {
      name: 'corrupted canonical record',
      prepare: async (temporaryRoot) => {
        const historyDirectory = path.join(temporaryRoot, 'corrupted-runs')
        const recordPath = path.join(
          historyDirectory,
          `${canonicalRunId}.json`,
        )

        await mkdir(historyDirectory, { recursive: true })
        await writeFile(recordPath, '{ malformed', 'utf8')

        return {
          historyDirectory,
          expectedError: new RegExp(
            `Invalid runtime history record ${escapeRegExp(recordPath)}: malformed JSON`,
          ),
        }
      },
    },
    {
      name: 'invalid numeric setting',
      prepare: async (temporaryRoot) => ({
        environment: { RUNTIME_HISTORY_MAX_RUNS: '0' },
        historyDirectory: path.join(temporaryRoot, 'invalid-setting-runs'),
        expectedError:
          /RUNTIME_HISTORY_MAX_RUNS must be a positive safe integer/,
      }),
    },
    {
      name: 'unpreparable history directory',
      prepare: async (temporaryRoot) => {
        const historyDirectory = path.join(temporaryRoot, 'not-a-directory')

        await writeFile(historyDirectory, 'occupied by a file', 'utf8')

        return {
          historyDirectory,
          expectedError: new RegExp(
            `Unable to prepare runtime history directory ${escapeRegExp(historyDirectory)}`,
          ),
        }
      },
    },
  ]

  for (const entry of cases) {
    await t.test(entry.name, async () => {
      const temporaryRoot = await mkdtemp(
        path.join(tmpdir(), 'ay-ple-server-startup-test-'),
      )
      const port = await reservePort()

      try {
        const prepared = await entry.prepare(temporaryRoot)
        const result = await runServerProcess({
          environment: {
            ...prepared.environment,
            PORT: String(port),
            RUNTIME_HISTORY_DIR: prepared.historyDirectory,
          },
        })

        assert.equal(result.exitCode, 1)
        assert.match(result.stderr, prepared.expectedError)
        assert.doesNotMatch(result.stdout, /server listening on/)

        const probeServer = createServer()

        probeServer.listen(port, '127.0.0.1')
        await once(probeServer, 'listening')
        await closeServer(probeServer)
      } finally {
        await rm(temporaryRoot, { force: true, recursive: true })
      }
    })
  }
})

async function runServerProcess(options: {
  environment: NodeJS.ProcessEnv
}): Promise<{ exitCode: number | null; stderr: string; stdout: string }> {
  const childProcess = spawn(
    process.execPath,
    ['--conditions=development', '--import', 'tsx', serverEntryPath],
    {
      cwd: workspaceRoot,
      env: {
        ...process.env,
        RUNTIME_HISTORY_MAX_BYTES: '104857600',
        RUNTIME_HISTORY_MAX_RUNS: '100',
        ...options.environment,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let stderr = ''
  let stdout = ''

  childProcess.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString()
  })
  childProcess.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString()
  })

  const exitResult = await new Promise<[
    number | null,
    NodeJS.Signals | null,
  ]>((resolve, reject) => {
    const timeout = setTimeout(() => {
      childProcess.kill('SIGKILL')
      reject(new Error('Server process did not exit after startup failure'))
    }, 10_000)

    childProcess.once('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    childProcess.once('exit', (code, signal) => {
      clearTimeout(timeout)
      resolve([code, signal])
    })
  })

  return {
    exitCode: exitResult[0] as number | null,
    stderr,
    stdout,
  }
}

async function reservePort(): Promise<number> {
  const server = createServer()

  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const address = server.address()

  if (!address || typeof address === 'string') {
    throw new Error('Expected reserved TCP port')
  }

  await closeServer(server)

  return address.port
}

async function closeServer(server: Server): Promise<void> {
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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
