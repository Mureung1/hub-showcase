import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  NativeContextProbeError,
  nativeContextProbeTesting,
  runNativeContextProbe,
  type NativeContextProbeBudgets,
  type NativeContextProbeDeadlines,
  type RunNativeContextProbeOptions,
} from './native-context-probe.js'
import {
  ProductionBundleVerificationError,
  verifyProductionBundle,
  type VerifiedProductionBundle,
} from './production-bundle.js'
import {
  EXTERNAL_PRODUCTION_RUNTIME_ROOT_FOR_TEST as ARTIFACT_ROOT,
} from './runtime-test-support.js'

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const FAKE_APP_SERVER = path.join(
  PACKAGE_ROOT,
  'scripts',
  'fake_native_context_app_server.mts',
)
interface Fixture {
  readonly root: string
  readonly workspace: string
  readonly journalPath: string
  readonly options: RunNativeContextProbeOptions
  readJournal(): Promise<ProbeJournal>
  dispose(): Promise<void>
}

interface ProbeJournal {
  readonly argv: readonly string[]
  readonly cwd: string
  readonly environment: Readonly<Record<string, string | null>>
  readonly messages: readonly Record<string, unknown>[]
  readonly pid: number
  readonly signals: readonly string[]
  readonly stdinEnded: boolean
}

const DEFAULT_TEST_DEADLINES: NativeContextProbeDeadlines = {
  startupMs: 2_000,
  responseMs: 500,
  gracefulCloseMs: 200,
  terminateMs: 200,
  postKillMs: 500,
}

async function createFixture(
  scenario: string,
  input: {
    readonly budgets?: Partial<NativeContextProbeBudgets>
    readonly deadlines?: Partial<NativeContextProbeDeadlines>
    readonly signal?: AbortSignal
    readonly signalProcessGroupOverride?: (
      processGroupId: number,
      signal: NodeJS.Signals,
    ) => void
  } = {},
): Promise<Fixture> {
  const root = await realpath(
    await mkdtemp(
      path.join(tmpdir(), 'ay-ple-native-context-probe-'),
    ),
  )
  const workspace = path.join(root, 'workspace')
  const environment = {
    home: path.join(root, 'controlled-home'),
    codexHome: path.join(root, 'controlled-codex-home'),
    codexSqliteHome: path.join(root, 'controlled-codex-sqlite-home'),
    tempDirectory: path.join(root, 'controlled-temp'),
  }
  await Promise.all(
    [workspace, ...Object.values(environment)].map((directory) =>
      mkdir(directory),
    ),
  )
  const journalPath = path.join(root, 'probe-journal.json')
  const bundle: VerifiedProductionBundle = {
    bridgeEntrypoint: '/runtime/bridge.py',
    codexPathDirectory: '/runtime/codex-path',
    nativeExecutable: '/runtime/bin/codex',
    patchStackSha256: 'patch-stack',
    pythonBuild: 'python-build',
    pythonExecutable: process.execPath,
    pythonVersion: '3.10.18',
    runtimeBinaryVersion: 'codex-cli 0.144.4',
    runtimeVersion: '0.144.4',
    sitePackages: '/runtime/site-packages',
    sourceCommit: 'source-commit',
  }
  return {
    root,
    workspace,
    journalPath,
    options: {
      bundle,
      workspace,
      environment,
      application: {
        name: 'ay-ple',
        title: 'AY-PLE',
        version: '0.1.0-preview.1',
      },
      signal: input.signal ?? new AbortController().signal,
      budgets: input.budgets,
      deadlines: {
        ...DEFAULT_TEST_DEADLINES,
        ...input.deadlines,
      },
      testCommandOverride: [
        process.execPath,
        '--experimental-strip-types',
        FAKE_APP_SERVER,
        scenario,
      ],
      testJournalPath: journalPath,
      testBundleReattestationOverride: async (candidate) => candidate,
      disableManagedConfigForTest: true,
      signalProcessGroupOverride: input.signalProcessGroupOverride,
    },
    readJournal: async () =>
      JSON.parse(await readFile(journalPath, 'utf8')) as ProbeJournal,
    dispose: () => rm(root, { recursive: true, force: true }),
  }
}

test('queries exact native context, omits system Skills, and fully reaps before return', async () => {
  const fixture = await createFixture('nominal')
  try {
    const snapshot = await runNativeContextProbe(fixture.options)

    assert.deepEqual(snapshot, {
      config: {
        projectRootMarkers: [],
        globalInstructionsFile: null,
        mcpServers: [],
      },
      skills: [
        {
          name: 'ay-ple-first-assignment',
          enabled: true,
          sourceRoot: path.join(
            fixture.workspace,
            '.agents',
            'skills',
            'ay-ple-first-assignment',
          ),
        },
      ],
    })
    assert.equal(Object.isFrozen(snapshot), true)
    assert.equal(Object.isFrozen(snapshot.config), true)
    assert.equal(Object.isFrozen(snapshot.skills), true)

    const journal = await fixture.readJournal()
    assert.equal(journal.cwd, fixture.workspace)
    assert.deepEqual(journal.argv, ['nominal'])
    assert.equal(
      journal.environment.AY_PLE_NATIVE_CONTEXT_PROBE_JOURNAL,
      fixture.journalPath,
    )
    assert.equal(
      journal.environment.CODEX_HOME,
      fixture.options.environment.codexHome,
    )
    assert.equal(
      journal.environment.CODEX_SQLITE_HOME,
      fixture.options.environment.codexSqliteHome,
    )
    assert.equal(
      journal.environment.HOME,
      fixture.options.environment.home,
    )
    assert.equal(
      journal.environment.TMPDIR,
      fixture.options.environment.tempDirectory,
    )
    assert.equal(
      journal.environment.CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG,
      '1',
    )
    assert.deepEqual(journal.messages, [
      {
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'ay-ple',
            title: 'AY-PLE',
            version: '0.1.0-preview.1',
          },
          capabilities: { experimentalApi: true },
        },
      },
      { method: 'initialized' },
      {
        id: 2,
        method: 'config/read',
        params: {
          cwd: fixture.workspace,
          includeLayers: true,
        },
      },
      {
        id: 3,
        method: 'skills/list',
        params: {
          cwds: [fixture.workspace],
          forceReload: true,
        },
      },
    ])
    assert.equal(journal.stdinEnded, true)
    assert.equal(processExists(journal.pid), false)
    assert.equal(processGroupExists(journal.pid), false)
  } finally {
    await fixture.dispose()
  }
})

test('repeated probes retain zero fd, task, process, route, or temp resources', async () => {
  const fixture = await createFixture('nominal')
  try {
    await runNativeContextProbe(fixture.options)
    await delay(100)
    const baseline = await readParentResourceSnapshot(
      fixture.options.environment.tempDirectory,
    )

    const observedPids: number[] = []
    for (let iteration = 0; iteration < 12; iteration += 1) {
      await runNativeContextProbe(fixture.options)
      const journal = await fixture.readJournal()
      observedPids.push(journal.pid)
      assert.equal(processExists(journal.pid), false)
      assert.equal(processGroupExists(journal.pid), false)
      assert.deepEqual(
        nativeContextProbeTesting.readRetainedResources(),
        {
          pendingResponses: 0,
          processGroups: 0,
          sessions: 0,
        },
      )
      assert.deepEqual(
        (
          await readdir(fixture.options.environment.tempDirectory)
        ).sort(),
        baseline.tempEntries,
      )
    }

    await delay(100)
    const final = await readParentResourceSnapshot(
      fixture.options.environment.tempDirectory,
    )
    assert.equal(observedPids.length, 12)
    assert.equal(final.fileDescriptors, baseline.fileDescriptors)
    assert.equal(final.pipeWraps, baseline.pipeWraps)
    assert.equal(final.processWraps, baseline.processWraps)
    assert.equal(final.timeouts <= baseline.timeouts, true)
    assert.deepEqual(final.tempEntries, baseline.tempEntries)
  } finally {
    await fixture.dispose()
  }
})

test('cleanly reaped SIGTERM escalation fails only the native observation', async () => {
  const fixture = await createFixture('ignore-eof')
  try {
    await assert.rejects(
      runNativeContextProbe(fixture.options),
      (error: unknown) =>
        error instanceof NativeContextProbeError &&
        error.code === 'shutdown_failed' &&
        !error.unknownOutcome,
    )
    const journal = await fixture.readJournal()
    assert.equal(journal.stdinEnded, true)
    assert.deepEqual(journal.signals, ['SIGTERM'])
    await waitForProcessGone(journal.pid)
  } finally {
    await fixture.dispose()
  }
})

test('queries the pinned native App Server provider-free', async () => {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-pinned-native-context-')),
  )
  try {
    const workspace = path.join(root, 'workspace')
    const environment = {
      home: path.join(root, 'controlled-home'),
      codexHome: path.join(root, 'controlled-codex-home'),
      codexSqliteHome: path.join(root, 'controlled-codex-sqlite-home'),
      tempDirectory: path.join(root, 'controlled-temp'),
    }
    await Promise.all(
      [workspace, ...Object.values(environment)].map((directory) =>
        mkdir(directory),
      ),
    )
    execFileSync('git', ['init', '--quiet', root])
    await mkdir(path.join(root, '.codex'))
    const hostileProjectInstructions = path.join(
      root,
      'hostile-project-instructions.md',
    )
    await writeFile(
      path.join(root, 'AGENTS.md'),
      '# Hostile ancestor instructions\n',
      'utf8',
    )
    await writeFile(
      hostileProjectInstructions,
      '# Hostile ancestor project instructions\n',
      'utf8',
    )
    await writeFile(
      path.join(root, '.codex', 'config.toml'),
      `model_instructions_file = "${hostileProjectInstructions}"\n`,
      'utf8',
    )
    const hostileSkillRoot = path.join(
      root,
      '.agents',
      'skills',
      'hostile-ancestor-skill',
    )
    await mkdir(hostileSkillRoot, { recursive: true })
    await writeFile(
      path.join(hostileSkillRoot, 'SKILL.md'),
      [
        '---',
        'name: hostile-ancestor-skill',
        'description: Must not cross the nested Git boundary.',
        '---',
        '',
        '# Hostile ancestor',
        '',
      ].join('\n'),
      'utf8',
    )
    execFileSync('git', ['init', '--quiet', workspace])
    await mkdir(path.join(workspace, '.codex'))
    const projectInstructions = path.join(
      workspace,
      'project-instructions.md',
    )
    await writeFile(
      projectInstructions,
      '# Exact workspace project instructions\n',
      'utf8',
    )
    await writeFile(
      path.join(workspace, '.codex', 'config.toml'),
      `model_instructions_file = "${projectInstructions}"\n`,
      'utf8',
    )
    await writeFile(
      path.join(environment.codexHome, 'config.toml'),
      [
        `[projects."${workspace}"]`,
        'trust_level = "trusted"',
        '',
      ].join('\n'),
      'utf8',
    )
    const skillRoot = path.join(
      workspace,
      '.agents',
      'skills',
      'ay-native-context-smoke',
    )
    await mkdir(skillRoot, { recursive: true })
    await writeFile(
      path.join(workspace, 'AGENTS.md'),
      '# AY-PLE native context smoke\n',
      'utf8',
    )
    await writeFile(
      path.join(skillRoot, 'SKILL.md'),
      [
        '---',
        'name: ay-native-context-smoke',
        'description: Provider-free native context smoke.',
        '---',
        '',
        '# Native context smoke',
        '',
      ].join('\n'),
      'utf8',
    )
    const bundle = await verifyProductionBundle(ARTIFACT_ROOT)
    const probeOptions = {
      bundle,
      workspace: await realpath(workspace),
      environment: {
        home: await realpath(environment.home),
        codexHome: await realpath(environment.codexHome),
        codexSqliteHome: await realpath(environment.codexSqliteHome),
        tempDirectory: await realpath(environment.tempDirectory),
      },
      application: {
        name: 'ay-ple',
        title: 'AY-PLE',
        version: '0.0.0',
      },
      signal: new AbortController().signal,
    } as const
    const snapshot = await runNativeContextProbe(probeOptions)

    assert.deepEqual(snapshot, {
      config: {
        projectRootMarkers: ['.git'],
        globalInstructionsFile: projectInstructions,
        mcpServers: [],
      },
      skills: [
        {
          name: 'ay-native-context-smoke',
          enabled: true,
          sourceRoot: skillRoot,
        },
      ],
    })

    for (const trustConfig of [
      [
        `[projects."${workspace}"]`,
        'trust_level = "untrusted"',
        '',
      ].join('\n'),
      [
        `[projects."${root}"]`,
        'trust_level = "trusted"',
        '',
      ].join('\n'),
    ]) {
      const configPath = path.join(environment.codexHome, 'config.toml')
      await writeFile(configPath, trustConfig, 'utf8')
      assert.deepEqual(await runNativeContextProbe(probeOptions), {
        config: {
          projectRootMarkers: ['.git'],
          globalInstructionsFile: null,
          mcpServers: [],
        },
        skills: [
          {
            name: 'ay-native-context-smoke',
            enabled: true,
            sourceRoot: skillRoot,
          },
        ],
      })
      assert.equal(await readFile(configPath, 'utf8'), trustConfig)
    }
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('fails closed on wrong, duplicate, error, malformed, EOF, partial, and bounded output', async (t) => {
  const cases: Array<{
    readonly scenario: string
    readonly code:
      | 'protocol_failed'
      | 'request_failed'
      | 'response_timeout'
      | 'start_timeout'
    readonly budgets?: Partial<NativeContextProbeBudgets>
    readonly deadlines?: Partial<NativeContextProbeDeadlines>
  }> = [
    { scenario: 'wrong-id', code: 'protocol_failed' },
    { scenario: 'wrong-codex-home', code: 'protocol_failed' },
    { scenario: 'duplicate', code: 'protocol_failed' },
    { scenario: 'invalid-notification', code: 'protocol_failed' },
    { scenario: 'error', code: 'request_failed' },
    { scenario: 'malformed', code: 'protocol_failed' },
    { scenario: 'early-eof', code: 'protocol_failed' },
    { scenario: 'partial-eof', code: 'protocol_failed' },
    {
      scenario: 'oversized-line',
      code: 'protocol_failed',
      budgets: {
        stdoutMaxBytes: 4 * 1024 * 1024,
        stdoutMaxLineBytes: 1024,
      },
    },
    {
      scenario: 'nominal',
      code: 'protocol_failed',
      budgets: { stdoutMaxFrames: 1 },
    },
    {
      scenario: 'nominal',
      code: 'protocol_failed',
      budgets: {
        stdoutMaxBytes: 512,
        stdoutMaxLineBytes: 256,
      },
    },
    {
      scenario: 'response-hang',
      code: 'start_timeout',
      deadlines: { startupMs: 500 },
    },
    { scenario: 'config-hang', code: 'response_timeout' },
  ]

  for (const candidate of cases) {
    await t.test(candidate.scenario, async () => {
      const fixture = await createFixture(candidate.scenario, {
        budgets: candidate.budgets,
        deadlines: {
          responseMs: 100,
          terminateMs: 100,
          postKillMs: 300,
          ...candidate.deadlines,
        },
      })
      try {
        await assert.rejects(
          runNativeContextProbe(fixture.options),
          (error: unknown) => {
            assert.ok(error instanceof NativeContextProbeError)
            assert.equal(error.code, candidate.code)
            assert.equal(error.unknownOutcome, false)
            assert.equal(
              error.message.includes('private provider'),
              false,
            )
            return true
          },
        )
        const journal = await fixture.readJournal()
        await waitForProcessGone(journal.pid)
      } finally {
        await fixture.dispose()
      }
    })
  }
})

test('maps native executable spawn failure without leaving a process', async () => {
  const fixture = await createFixture('nominal')
  try {
    await assert.rejects(
      runNativeContextProbe({
        ...fixture.options,
        testCommandOverride: [
          path.join(fixture.root, 'missing-native-executable'),
        ],
      }),
      (error: unknown) =>
        error instanceof NativeContextProbeError &&
        error.code === 'start_failed' &&
        !error.unknownOutcome,
    )
    await assert.rejects(readFile(fixture.journalPath), /ENOENT/)
  } finally {
    await fixture.dispose()
  }
})

test('fresh bundle drift fails before native spawn or protocol write', async () => {
  const fixture = await createFixture('nominal')
  let reattestations = 0
  try {
    await assert.rejects(
      runNativeContextProbe({
        ...fixture.options,
        testBundleReattestationOverride: async () => {
          reattestations += 1
          throw new ProductionBundleVerificationError(
            'deterministic complete-tree drift',
          )
        },
      }),
      (error: unknown) =>
        error instanceof NativeContextProbeError &&
        error.code === 'start_failed' &&
        !error.unknownOutcome,
    )
    assert.equal(reattestations, 1)
    await assert.rejects(readFile(fixture.journalPath), /ENOENT/)
  } finally {
    await fixture.dispose()
  }
})

test('bounds retained stderr without leaking remote text into the error', async () => {
  const fixture = await createFixture('stderr-error', {
    budgets: {
      stderrMaxFrames: 4,
      stderrMaxBytes: 256,
    },
  })
  try {
    await assert.rejects(
      runNativeContextProbe(fixture.options),
      (error: unknown) => {
        assert.ok(error instanceof NativeContextProbeError)
        assert.equal(error.code, 'request_failed')
        assert.equal(error.diagnostic.bytes <= 256, true)
        assert.equal(error.diagnostic.frames <= 4, true)
        assert.equal(error.diagnostic.truncated, true)
        assert.equal(error.message.includes('private-stderr'), false)
        return true
      },
    )
    const journal = await fixture.readJournal()
    await waitForProcessGone(journal.pid)
  } finally {
    await fixture.dispose()
  }
})

test('AbortSignal escalates an ignored SIGTERM to SIGKILL and reaps the group', async () => {
  const controller = new AbortController()
  const signals: NodeJS.Signals[] = []
  const fixture = await createFixture('ignore-term', {
    signal: controller.signal,
    deadlines: {
      responseMs: 2_000,
      terminateMs: 100,
      postKillMs: 500,
    },
    signalProcessGroupOverride(processGroupId, signal) {
      signals.push(signal)
      process.kill(-processGroupId, signal)
    },
  })
  try {
    const pending = runNativeContextProbe(fixture.options)
    await waitForJournalMessageCount(fixture.journalPath, 1)
    controller.abort()

    await assert.rejects(
      pending,
      (error: unknown) =>
        error instanceof NativeContextProbeError &&
        error.code === 'aborted' &&
        !error.unknownOutcome,
    )
    const journal = await fixture.readJournal()
    assert.deepEqual(signals, ['SIGTERM', 'SIGKILL'])
    await waitForProcessGone(journal.pid)
  } finally {
    await fixture.dispose()
  }
})

test('pre-aborted input makes zero child writes and does not spawn', async () => {
  const controller = new AbortController()
  controller.abort()
  const fixture = await createFixture('nominal', {
    signal: controller.signal,
  })
  try {
    await assert.rejects(
      runNativeContextProbe(fixture.options),
      (error: unknown) =>
        error instanceof NativeContextProbeError &&
        error.code === 'aborted',
    )
    await assert.rejects(readFile(fixture.journalPath), /ENOENT/)
  } finally {
    await fixture.dispose()
  }
})

async function waitForJournalMessageCount(
  journalPath: string,
  expected: number,
): Promise<void> {
  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    try {
      const journal = JSON.parse(
        await readFile(journalPath, 'utf8'),
      ) as ProbeJournal
      if (journal.messages.length >= expected) return
    } catch {
      // The fake writes the journal after it starts.
    }
    await delay(10)
  }
  throw new Error('fake native context journal did not advance')
}

async function readParentResourceSnapshot(
  tempDirectory: string,
): Promise<{
  readonly fileDescriptors: number
  readonly pipeWraps: number
  readonly processWraps: number
  readonly tempEntries: readonly string[]
  readonly timeouts: number
}> {
  const [fileDescriptors, tempEntries] = await Promise.all([
    Promise.resolve(countOpenFileDescriptors()),
    readdir(tempDirectory),
  ])
  const resources = process.getActiveResourcesInfo()
  return {
    fileDescriptors,
    pipeWraps: resources.filter((resource) => resource === 'PipeWrap').length,
    processWraps: resources.filter(
      (resource) => resource === 'ProcessWrap',
    ).length,
    tempEntries: Object.freeze([...tempEntries].sort()),
    timeouts: resources.filter((resource) => resource === 'Timeout').length,
  }
}

function countOpenFileDescriptors(): number {
  const output = execFileSync(
    '/usr/sbin/lsof',
    [
      '-a',
      '-p',
      String(process.pid),
      '-d',
      '0-999',
      '-Fn',
    ],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    },
  )
  return new Set(
    output
      .split('\n')
      .filter((line) => /^f\d+$/u.test(line)),
  ).size
}

async function waitForProcessGone(pid: number): Promise<void> {
  const deadline = Date.now() + 2_000
  while (Date.now() < deadline) {
    if (!processExists(pid) && !processGroupExists(pid)) return
    await delay(10)
  }
  throw new Error(`native context process ${pid} was not reaped`)
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

function processGroupExists(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw error
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
