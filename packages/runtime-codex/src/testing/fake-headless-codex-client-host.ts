import { appendFileSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  HeadlessCodexClientHost,
  type HeadlessCodexClientHostOptions,
} from '../index.js'
import {
  createHeadlessCodexClientHostForTesting,
  type HeadlessCodexClientHostTestOptions,
} from '../headless-codex-client-host.js'

export type FakeHeadlessCodexClientHostScenario =
  | 'ready'
  | 'initialize_error'
  | 'initialize_timeout'
  | 'invalid_initialize_response'
  | 'observation_flood'
  | 'exit_after_ready'
  | 'spawn_error'

export type FakeHeadlessCodexClientHostJournalEntry =
  | {
      kind: 'version_check'
      pid: number
    }
  | {
      kind: 'spawn'
      pid: number
      args: string[]
      cwd: string
      codexHome?: string
      codexSqliteHome?: string
      inheritedLocale?: string
      githubPatPresent: boolean
      tokenLikeMarkerPresent: boolean
    }
  | {
      kind: 'client_message'
      message: Record<string, unknown>
    }
  | {
      kind: 'observation_consumer_ready'
    }
  | {
      kind: 'process_exit_observed'
      pid: number
    }

export type FakeHeadlessCodexClientHostFixture = {
  appDataRoot: string
  host: HeadlessCodexClientHost
  packageRoot: string
  tempRoot: string
  workspaceRoot: string
  releaseVersionProbe: () => Promise<void>
  releaseStartSettlement: () => void
  readJournal: (input?: {
    minimumEntries?: number
    timeoutMs?: number
  }) => Promise<FakeHeadlessCodexClientHostJournalEntry[]>
  observeProcessExit: (pid: number) => Promise<void>
}

export async function withFakeHeadlessCodexClientHost(
  input: {
    scenario?: FakeHeadlessCodexClientHostScenario
    gateVersionProbe?: boolean
    gateStartSettlement?: boolean
    hostOptions?: HeadlessCodexClientHostOptions
    ignoreSigterm?: boolean
    recordObservationConsumerReady?: boolean
    testOptions?: HeadlessCodexClientHostTestOptions
  },
  testBody: (fixture: FakeHeadlessCodexClientHostFixture) => Promise<void>,
): Promise<void> {
  const tempRoot = await mkdtemp(join(tmpdir(), 'ay-ple-headless-host-'))
  const packageRoot = join(tempRoot, 'package')
  const appDataRoot = join(tempRoot, 'app-data')
  const workspaceRoot = join(tempRoot, 'workspace')
  const journalPath = join(tempRoot, 'journal.jsonl')
  const versionProbeReleasePath = join(tempRoot, 'release-version-probe')
  const codexBinPath = join(
    packageRoot,
    'node_modules',
    '.bin',
    'codex',
  )

  await mkdir(join(packageRoot, 'node_modules', '.bin'), { recursive: true })
  await mkdir(workspaceRoot)
  await writeFakeCodexBinary(
    codexBinPath,
    journalPath,
    input.scenario ?? 'ready',
    input.gateVersionProbe ?? false,
    versionProbeReleasePath,
    input.ignoreSigterm ?? false,
  )

  let releaseStartSettlement = (): void => {}
  const startSettlementBarrier = input.gateStartSettlement
    ? new Promise<void>((resolvePromise) => {
        releaseStartSettlement = resolvePromise
      })
    : input.testOptions?.startSettlementBarrier
  const configuredTestOptions = input.testOptions
  const host = createHeadlessCodexClientHostForTesting(
    { packageRoot, appDataRoot, workspaceRoot },
    input.hostOptions,
    {
      ...input.testOptions,
      onObservationConsumerReady: input.recordObservationConsumerReady
        ? () => {
            appendFileSync(
              journalPath,
              `${JSON.stringify({ kind: 'observation_consumer_ready' })}\n`,
            )
            configuredTestOptions?.onObservationConsumerReady?.()
          }
        : configuredTestOptions?.onObservationConsumerReady,
      startSettlementBarrier,
    },
  )
  const readJournal = createJournalReader(journalPath)

  try {
    await testBody({
      appDataRoot,
      host,
      observeProcessExit: async (pid) => {
        await waitForProcessMissing(pid)
        appendFileSync(
          journalPath,
          `${JSON.stringify({ kind: 'process_exit_observed', pid })}\n`,
        )
      },
      packageRoot,
      readJournal,
      releaseVersionProbe: () => writeFile(versionProbeReleasePath, ''),
      releaseStartSettlement,
      tempRoot,
      workspaceRoot,
    })
  } finally {
    try {
      await host.stop().catch(() => {})
    } finally {
      const journal = await readJournal({ minimumEntries: 0 })

      for (const entry of journal) {
        if (entry.kind === 'spawn' || entry.kind === 'version_check') {
          await forceKillProcess(entry.pid)
        }
      }

      await rm(tempRoot, { recursive: true, force: true })
    }
  }
}

async function writeFakeCodexBinary(
  codexBinPath: string,
  journalPath: string,
  scenario: FakeHeadlessCodexClientHostScenario,
  gateVersionProbe: boolean,
  versionProbeReleasePath: string,
  ignoreSigterm: boolean,
): Promise<void> {
  await writeFile(
    codexBinPath,
    createFakeCodexBinarySource(
      journalPath,
      scenario,
      gateVersionProbe,
      versionProbeReleasePath,
      ignoreSigterm,
    ),
  )
  await chmod(codexBinPath, 0o755)
}

function createFakeCodexBinarySource(
  journalPath: string,
  scenario: FakeHeadlessCodexClientHostScenario,
  gateVersionProbe: boolean,
  versionProbeReleasePath: string,
  ignoreSigterm: boolean,
): string {
  return `#!/usr/bin/env node
import { appendFileSync, existsSync, unlinkSync } from 'node:fs'
import readline from 'node:readline'

const journalPath = ${JSON.stringify(journalPath)}
const scenario = ${JSON.stringify(scenario)}
const gateVersionProbe = ${JSON.stringify(gateVersionProbe)}
const versionProbeReleasePath = ${JSON.stringify(versionProbeReleasePath)}
const ignoreSigterm = ${JSON.stringify(ignoreSigterm)}

function journal(entry) {
  appendFileSync(journalPath, JSON.stringify(entry) + '\\n')
}

if (process.argv.includes('--version')) {
  journal({ kind: 'version_check', pid: process.pid })

  while (gateVersionProbe && !existsSync(versionProbeReleasePath)) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 5))
  }

  if (scenario === 'spawn_error') {
    unlinkSync(process.argv[1])
  }

  process.stdout.write('codex-cli 0.144.0\\n')
  process.exit(0)
}

journal({
  kind: 'spawn',
  pid: process.pid,
  args: process.argv.slice(2),
  cwd: process.cwd(),
  codexHome: process.env.CODEX_HOME,
  codexSqliteHome: process.env.CODEX_SQLITE_HOME,
  inheritedLocale: process.env.LANG,
  githubPatPresent: Object.hasOwn(process.env, 'GITHUB_PAT'),
  tokenLikeMarkerPresent: Object.hasOwn(process.env, 'AY_PLE_HOST_SECRET_TOKEN'),
})

if (ignoreSigterm) {
  process.on('SIGTERM', () => {})
}

const reader = readline.createInterface({ input: process.stdin })

reader.on('line', (line) => {
  const message = JSON.parse(line)
  journal({ kind: 'client_message', message })

  if (message.method === 'initialize') {
    if (scenario === 'initialize_timeout') {
      return
    }

    if (scenario === 'initialize_error') {
      write({ id: message.id, error: { code: -32000, message: 'fixture initialize error' } })
      return
    }

    if (scenario === 'invalid_initialize_response') {
      write({ id: message.id, result: { userAgent: 'incomplete' } })
      return
    }

    if (scenario === 'observation_flood') {
      writeMany([
        { method: 'warning', params: { message: 'first' } },
        { method: 'warning', params: { message: 'second' } },
        { method: 'warning', params: { message: 'third' } },
      ])
    }

    write({
      id: message.id,
      result: {
        userAgent: 'fake-headless-codex',
        codexHome: process.env.CODEX_HOME,
        platformFamily: 'unix',
        platformOs: process.platform,
      },
    })
    return
  }

  if (message.method === 'initialized' && scenario === 'exit_after_ready') {
    setTimeout(() => process.exit(23), 5)
  }
})

function write(message) {
  process.stdout.write(JSON.stringify(message) + '\\n')
}

function writeMany(messages) {
  process.stdout.write(messages.map((message) => JSON.stringify(message)).join('\\n') + '\\n')
}
`
}

function createJournalReader(
  journalPath: string,
): FakeHeadlessCodexClientHostFixture['readJournal'] {
  return async (input = {}) => {
    const minimumEntries = input.minimumEntries ?? 1
    const deadline = Date.now() + (input.timeoutMs ?? 5000)

    while (true) {
      const entries = await readJournalFile(journalPath)

      if (entries.length >= minimumEntries) {
        return entries
      }

      if (Date.now() >= deadline) {
        throw new Error(
          `Fake Headless Codex journal did not reach ${minimumEntries} entries`,
        )
      }

      await delay(5)
    }
  }
}

async function readJournalFile(
  journalPath: string,
): Promise<FakeHeadlessCodexClientHostJournalEntry[]> {
  let contents: string

  try {
    contents = await readFile(journalPath, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return []
    }

    throw error
  }

  const lines = contents.split('\n')

  if (!contents.endsWith('\n')) {
    lines.pop()
  }

  return lines
    .filter((line) => line.length > 0)
    .map(
      (line) =>
        JSON.parse(line) as FakeHeadlessCodexClientHostJournalEntry,
    )
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}

async function forceKillProcess(pid: number): Promise<void> {
  try {
    process.kill(pid, 'SIGKILL')
  } catch (error) {
    if (!isNodeError(error) || error.code !== 'ESRCH') {
      throw error
    }

    return
  }

  await waitForProcessMissing(pid)
}

async function waitForProcessMissing(pid: number): Promise<void> {
  const deadline = Date.now() + 1000

  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if (isNodeError(error) && error.code === 'ESRCH') {
        return
      }

      throw error
    }

    await delay(5)
  }

  throw new Error('Fake Headless Codex child did not exit during cleanup')
}
