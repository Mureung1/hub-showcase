import assert from 'node:assert/strict'
import {
  chmod,
  link,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { after, before, test } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  CodexChatRuntimeError,
} from './index.js'
import type { CodexProductActivity } from './contract.js'
import type { NativeContextProbeRunner } from './native-context-coordinator.js'
import { NativeContextProbeError } from './native-context-probe.js'
import { verifyProductionBundle } from './production-bundle.js'
import {
  startVerifiedCodexChatRuntime as startRuntimeAtExactGitRoot,
  type NodeRuntimeDeadlines,
  type SpawnedCodexChatRuntime,
  type StartVerifiedCodexChatRuntimeOptions,
} from './runtime.js'
import {
  EXTERNAL_PRODUCTION_RUNTIME_ROOT_FOR_TEST as ARTIFACT_ROOT,
  initializeGitRootForTest,
} from './runtime-test-support.js'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const FAKE_APP_SERVER = join(
  PACKAGE_ROOT,
  'scripts',
  'fake_python_bridge_app_server.py',
)
const FAKE_NODE_WORKER = join(
  PACKAGE_ROOT,
  'scripts',
  'fake_node_runtime_worker.py',
)

async function startVerifiedCodexChatRuntime(
  options: Parameters<typeof startRuntimeAtExactGitRoot>[0],
) {
  await initializeGitRootForTest(options.workspace)
  return startRuntimeAtExactGitRoot({
    ...options,
    workspace: await realpath(options.workspace),
  })
}

let bundle: Awaited<ReturnType<typeof verifyProductionBundle>>
const roots: string[] = []

before(async () => {
  bundle = await verifyProductionBundle(ARTIFACT_ROOT)
})

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })))
})

test('streams one nominal native turn to its authoritative terminal', async () => {
  const harness = await startHarness('nominal')
  try {
    const thread = await harness.runtime.startThread()
    const turn = await harness.runtime.startTurn({
      threadId: thread.threadId,
      text: 'hello nominal',
    })

    assert.deepEqual(
      await collect(turn.events),
      [
        {
          type: 'agent_message.delta',
          threadId: thread.threadId,
          turnId: turn.turnId,
          itemId: `item-${turn.turnId}`,
          delta: 'hello nominal',
        },
        {
          type: 'agent_message.completed',
          threadId: thread.threadId,
          turnId: turn.turnId,
          itemId: `item-${turn.turnId}`,
          text: 'hello nominal',
        },
        {
          type: 'turn.completed',
          threadId: thread.threadId,
          turnId: turn.turnId,
          status: 'completed',
        },
      ],
    )
    const journal = JSON.parse(await readFile(harness.journalPath, 'utf8')) as {
      launchArgs?: readonly string[]
      messages: readonly {
        readonly method?: string
        readonly params?: Record<string, unknown>
      }[]
    }
    assert.deepEqual(journal.launchArgs, [])
    const threadStart = journal.messages.find(
      ({ method }) => method === 'thread/start',
    )
    assert.equal(
      Object.hasOwn(threadStart?.params ?? {}, 'config'),
      false,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('projects native account readiness without starting a thread or turn', async () => {
  const harness = await startHarness('account-not-ready')
  try {
    await writeFile(join(dirname(harness.journalPath), 'account-not-ready'), '')

    assert.deepEqual(await harness.runtime.readAccountReadiness(), {
      state: 'not_ready',
      reason: 'authentication_required',
    })

    const journal = JSON.parse(await readFile(harness.journalPath, 'utf8')) as {
      messages: readonly { readonly method?: string }[]
    }
    assert.deepEqual(
      journal.messages
        .map(({ method }) => method)
        .filter((method) => method === 'account/read' || method === 'thread/start' || method === 'turn/start'),
      ['account/read'],
    )
  } finally {
    await harness.runtime.close()
  }
})

test('projects unsupported native account state as authentication-required', async () => {
  const harness = await startHarness('account-unsupported')
  try {
    await writeFile(
      join(dirname(harness.journalPath), 'account-state'),
      'unsupported',
    )

    assert.deepEqual(await harness.runtime.readAccountReadiness(), {
      state: 'not_ready',
      reason: 'authentication_required',
    })
  } finally {
    await harness.runtime.close()
  }
})

test('settles failed account reads safely and reaps each process tree', async (t) => {
  for (const [label, scenario, code] of [
    ['malformed output', 'malformed-output', 'bridge_protocol_failed'],
    ['response timeout', 'response-hang', 'runtime_response_timeout'],
    ['process loss', 'pending-eof', 'runtime_lost'],
  ] as const) {
    await t.test(label, async () => {
      const { harness, processJournalPath } = await startSyntheticHarness(
        `account-read-${scenario}`,
        scenario,
      )

      await assert.rejects(
        within(harness.runtime.readAccountReadiness()),
        (error: unknown) =>
          error instanceof CodexChatRuntimeError &&
          error.code === code &&
          !error.unknownOutcome,
      )
      assert.equal((await harness.terminal).code, code)
      await harness.closed
      const processJournal = await readProcessJournal(processJournalPath)
      assert.deepEqual(
        processJournal.commands.map((command) => command.command),
        ['read_account'],
      )
      await waitForProcessGroupExit(processJournal.processGroupId)
    })
  }
})

test('settles an account read once when Runtime close wins the race', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'account-read-close',
    'account-read-close',
  )
  const account = harness.runtime.readAccountReadiness()
  await waitForProcessJournalCommandCount(processJournalPath, 1)

  const close = harness.runtime.close()
  await assert.rejects(
    within(account),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_closed' &&
      !error.unknownOutcome,
  )
  await within(close)
  await harness.closed
  const processJournal = await readProcessJournal(processJournalPath)
  assert.deepEqual(
    processJournal.commands.map((command) => command.command),
    ['read_account', 'close'],
  )
  await waitForProcessGroupExit(processJournal.processGroupId)
})

test('projects one atomic native-context generation through the workspace Runtime', async () => {
  let calls = 0
  const harness = await startNativeContextHarness(
    'native-context-pair',
    async (options) => {
      calls += 1
      assert.equal(options.workspace, harness.workspace)
      assert.deepEqual(options.environment, harness.environment)
      assert.deepEqual(options.application, {
        name: 'ay-ple',
        title: 'AY-PLE',
        version: '0.1.0-preview.1',
      })
      return {
        config: {
          projectRootMarkers: [],
          globalInstructionsFile: null,
          mcpServers: [],
        },
        skills: [
          {
            name: 'ay-ple-first-assignment',
            enabled: true,
            sourceRoot: join(
              harness.workspace,
              '.agents',
              'skills',
              'ay-ple-first-assignment',
            ),
          },
        ],
      }
    },
  )
  try {
    const signal = new AbortController().signal
    assert.deepEqual(
      await harness.runtime.readEffectiveConfig({
        signal,
      }),
      {
        projectRootMarkers: [],
        globalInstructionsFile: null,
        mcpServers: [],
      },
    )
    assert.deepEqual(
      await harness.runtime.listEffectiveSkills({
        signal,
      }),
      [
        {
          name: 'ay-ple-first-assignment',
          enabled: true,
          sourceRoot: join(
            harness.workspace,
            '.agents',
            'skills',
            'ay-ple-first-assignment',
          ),
        },
      ],
    )
    assert.equal(calls, 1)
    assert.deepEqual(await harness.runtime.startThread(), {
      threadId: 'thread-1',
    })
  } finally {
    await harness.runtime.close()
  }
})

test('runs the pinned workspace Runtime and native-context sidecar provider-free', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'ay-ple-managed-native-context-pinned-'),
  )
  roots.push(root)
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const environment = await createEnvironmentRoots(root)
  const skillRoot = join(
    workspace,
    '.agents',
    'skills',
    'ay-managed-native-context',
  )
  await mkdir(skillRoot, { recursive: true })
  await writeFile(
    join(skillRoot, 'SKILL.md'),
    [
      '---',
      'name: ay-managed-native-context',
      'description: Managed provider-free native context smoke.',
      '---',
      '',
      '# Managed native context',
      '',
    ].join('\n'),
    'utf8',
  )
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace: await realpath(workspace),
    application: {
      name: 'ay-ple',
      title: 'AY-PLE',
      version: '0.1.0-preview.1',
    },
    environment,
  })
  try {
    const signal = new AbortController().signal
    assert.deepEqual(await harness.runtime.readEffectiveConfig({ signal }), {
      projectRootMarkers: ['.git'],
      globalInstructionsFile: null,
      mcpServers: [],
    })
    assert.deepEqual(await harness.runtime.listEffectiveSkills({ signal }), [
      {
        name: 'ay-managed-native-context',
        enabled: true,
        sourceRoot: await realpath(skillRoot),
      },
    ])
  } finally {
    await harness.runtime.close()
    await harness.closed
  }
})

test('workspace Runtime close aborts and awaits an in-flight native-context generation', async () => {
  const started = deferred<AbortSignal>()
  const cleanup = deferred<void>()
  const harness = await startNativeContextHarness(
    'native-context-close',
    async (options) => {
      started.resolve(options.signal)
      await new Promise<void>((resolvePromise) => {
        options.signal.addEventListener('abort', () => resolvePromise(), {
          once: true,
        })
      })
      await cleanup.promise
      throw new NativeContextProbeError({ code: 'aborted' })
    },
  )
  const read = harness.runtime.readEffectiveConfig({
    signal: new AbortController().signal,
  })
  const probeSignal = await started.promise
  let closeSettled = false
  const close = harness.runtime.close().finally(() => {
    closeSettled = true
  })

  assert.equal(probeSignal.aborted, true)
  await Promise.resolve()
  assert.equal(closeSettled, false)
  cleanup.resolve()
  await assert.rejects(
    () => read,
    (error: unknown) => {
      assert.ok(error instanceof CodexChatRuntimeError)
      assert.equal(error.code, 'runtime_closing')
      assert.equal(error.unknownOutcome, false)
      return true
    },
  )
  await close
  assert.equal(closeSettled, true)
})

test('native-context cleanup ambiguity becomes the workspace Runtime terminal', async () => {
  const harness = await startNativeContextHarness(
    'native-context-cleanup-failure',
    async () => {
      throw new NativeContextProbeError({ code: 'cleanup_failed' })
    },
  )

  await assert.rejects(
    () =>
      harness.runtime.readEffectiveConfig({
        signal: new AbortController().signal,
      }),
    (error: unknown) => {
      assert.ok(error instanceof CodexChatRuntimeError)
      assert.equal(error.code, 'runtime_cleanup_failed')
      assert.equal(error.unknownOutcome, false)
      return true
    },
  )
  assert.equal((await harness.terminal).code, 'runtime_cleanup_failed')
  await assert.rejects(
    harness.runtime.close(),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_cleanup_failed',
  )
  await assert.rejects(harness.closed, (error: unknown) => {
    assert.ok(error instanceof CodexChatRuntimeError)
    assert.equal(error.code, 'runtime_cleanup_failed')
    return true
  })
  await waitForPidExit(harness.nativeChildPidPath)
  await waitForProcessGroupExit(harness.child.pid as number)
})

test('native cleanup failure waits for delayed main process cleanup before closing', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'ay-ple-native-cleanup-join-'),
  )
  roots.push(root)
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const processJournalPath = join(root, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    application: {
      name: 'ay-ple',
      title: 'AY-PLE',
      version: '0.1.0-preview.1',
    },
    environment: await createEnvironmentRoots(root),
    nativeContextProbeRunnerOverride: async () => {
      throw new NativeContextProbeError({ code: 'cleanup_failed' })
    },
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stubborn-close',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      gracefulCloseMs: 50,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const processJournal = await readProcessJournal(processJournalPath)
  let closedSettled = false
  const observedClosed = harness.closed.finally(() => {
    closedSettled = true
  })
  void observedClosed.catch(() => undefined)

  await assert.rejects(
    () =>
      harness.runtime.readEffectiveConfig({
        signal: new AbortController().signal,
      }),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_cleanup_failed',
  )
  await new Promise<void>((resolvePromise) =>
    setImmediate(resolvePromise),
  )
  assert.equal(closedSettled, false)

  await assert.rejects(
    observedClosed,
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_cleanup_failed',
  )
  assert.equal(closedSettled, true)
  await waitForProcessGroupExit(processJournal.processGroupId)
  await waitForProcessExit(processJournal.descendantPid)
})

test('uses the global Codex home as SQLite authority without a separate directory', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'ay-ple-node-global-codex-home-'),
  )
  roots.push(root)
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const environment = await createOwnerOnlyEnvironmentRoots(root)
  const processJournalPath = join(root, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment: {
      ...environment,
      codexSqliteHome: environment.codexHome,
    },
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stream-complete',
      `--process-journal=${processJournalPath}`,
    ],
  })

  await harness.runtime.close()
  await harness.closed
})

test('rejects overlapping workspace and controlled roots before spawn', async () => {
  const root = await mkdtemp(
    join(tmpdir(), 'ay-ple-node-workspace-overlap-'),
  )
  roots.push(root)
  const environment = await createOwnerOnlyEnvironmentRoots(root)
  const workspace = join(environment.home, 'workspace')
  await mkdir(workspace)
  const processJournalPath = join(root, 'process-journal.json')
  let spawned: SpawnedCodexChatRuntime | undefined
  try {
    await assert.rejects(
      async () => {
        spawned = await startVerifiedCodexChatRuntime({
          bundle,
          workspace,
          application: {
            name: 'ay-ple',
            title: 'AY-PLE',
            version: '0.1.0-preview.1',
          },
          environment,
          bridgeEntrypointOverride: FAKE_NODE_WORKER,
          bridgeArgsOverride: [
            '--scenario=response-hang',
            `--process-journal=${processJournalPath}`,
          ],
        })
      },
      (error: unknown) =>
        error instanceof TypeError &&
        error.message === 'Codex Runtime roots must be disjoint',
    )
  } finally {
    await spawned?.runtime.close().catch(() => undefined)
  }
  await assert.rejects(
    readFile(processJournalPath),
    (error: unknown) =>
      (error as NodeJS.ErrnoException).code === 'ENOENT',
  )
})

test('rejects noncanonical application SemVer before spawning workspace Runtime', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ay-ple-node-app-version-'))
  roots.push(root)
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const processJournalPath = join(root, 'process-journal.json')

  await assert.rejects(
    startVerifiedCodexChatRuntime({
      bundle,
      workspace,
      application: {
        name: 'ay-ple',
        title: 'AY-PLE',
        version: '1.0.0-01',
      },
      environment: await createOwnerOnlyEnvironmentRoots(root),
      bridgeEntrypointOverride: FAKE_NODE_WORKER,
      bridgeArgsOverride: [
        '--scenario=response-hang',
        `--process-journal=${processJournalPath}`,
      ],
    }),
    TypeError,
  )
  await assert.rejects(
    readFile(processJournalPath),
    (error: unknown) =>
      (error as NodeJS.ErrnoException).code === 'ENOENT',
  )
})

test('rejects unprepared, indirect, and noncanonical Git roots before spawn', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'ay-ple-node-git-root-'))
  roots.push(root)
  const environment = await createEnvironmentRoots(root)
  const targetRepository = join(root, 'target-repository')
  await mkdir(targetRepository)
  await initializeGitRootForTest(targetRepository)

  const missingMarker = join(root, 'missing-marker')
  const fakeMarker = join(root, 'fake-marker')
  const linkedMarker = join(root, 'linked-marker')
  const canonicalRepository = join(root, 'canonical-repository')
  await Promise.all([
    mkdir(missingMarker),
    mkdir(join(fakeMarker, '.git'), { recursive: true }),
    mkdir(linkedMarker),
    mkdir(canonicalRepository),
  ])
  await Promise.all([
    symlink(join(targetRepository, '.git'), join(linkedMarker, '.git')),
    initializeGitRootForTest(canonicalRepository),
  ])
  const [canonicalMissingMarker, canonicalFakeMarker, canonicalLinkedMarker] =
    await Promise.all([
      realpath(missingMarker),
      realpath(fakeMarker),
      realpath(linkedMarker),
    ])

  for (const [label, workspace, message] of [
    [
      'missing marker',
      canonicalMissingMarker,
      'Codex workspace must be an exact Git root',
    ],
    [
      'fake marker',
      canonicalFakeMarker,
      'Codex workspace must be an exact Git root',
    ],
    [
      'linked marker',
      canonicalLinkedMarker,
      'Codex workspace must be an exact Git root',
    ],
    [
      'noncanonical path',
      join(canonicalRepository, '..', basename(canonicalRepository)),
      'Codex workspace must be canonical',
    ],
  ] as const) {
    await t.test(label, async () => {
      const processJournalPath = join(
        root,
        `${label.replaceAll(' ', '-')}-process-journal.json`,
      )
      await assert.rejects(
        startRuntimeAtExactGitRoot({
          bundle,
          workspace,
          environment,
          bridgeEntrypointOverride: FAKE_NODE_WORKER,
          bridgeArgsOverride: [
            '--scenario=response-hang',
            `--process-journal=${processJournalPath}`,
          ],
        }),
        (error: unknown) =>
          error instanceof TypeError && error.message === message,
      )
      await assert.rejects(
        readFile(processJournalPath),
        (error: unknown) =>
          (error as NodeJS.ErrnoException).code === 'ENOENT',
      )
    })
  }
})

test('forwards the fixed project cwd without thread-start overrides and supports a text-only product turn', async () => {
  const harness = await startHarness('isolated-product-thread')
  try {
    const workspace = await realpath(dirname(harness.journalPath))
    assert.deepEqual(await harness.runtime.readModelCatalog(), {
      models: [
        {
          model: 'current-default-model',
          displayName: 'current-default-model',
          description: 'Fake current-default-model',
          isDefault: true,
          defaultReasoningEffort: 'high',
          supportedReasoningEfforts: [
            {
              reasoningEffort: 'high',
              description: 'Fake high effort',
            },
          ],
          serviceTiers: ['fast'],
        },
        {
          model: 'fake-model',
          displayName: 'fake-model',
          description: 'Fake fake-model',
          isDefault: false,
          defaultReasoningEffort: 'medium',
          supportedReasoningEfforts: [
            {
              reasoningEffort: 'medium',
              description: 'Fake medium effort',
            },
          ],
          serviceTiers: ['fast'],
        },
      ],
    })
    const { threadId } = await harness.runtime.startThread()

    const chat = await harness.runtime.startTurn({
      threadId,
      text: 'chat on the isolated thread',
    })
    await collect(chat.events)

    const product = await harness.runtime.startProductTurn({
      threadId,
      permissionProfile: 'read_only',
      settings: {
        model: 'fake-model',
        reasoningEffort: 'medium',
        serviceTier: 'fast',
      },
      text: 'Continue the product conversation.',
    })
    const iterator = product.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)
    const cancelled = harness.runtime.cancelUserInput({
      interactionId: requested.interactionId,
    })
    events.push(...(await collectIterator(iterator)))
    await cancelled

    const journal = JSON.parse(await readFile(harness.journalPath, 'utf8')) as {
      messages: readonly {
        readonly method?: string
        readonly params?: Record<string, unknown>
      }[]
    }
    const threadStart = journal.messages.find(
      ({ method }) => method === 'thread/start',
    )
    assert.equal(threadStart?.params?.cwd, workspace)
    assert.equal(threadStart?.params?.approvalPolicy, 'on-request')
    assert.equal(threadStart?.params?.sandbox, 'workspace-write')
    assert.equal(Object.hasOwn(threadStart?.params ?? {}, 'config'), false)
    const turnStarts = journal.messages.filter(
      ({ method }) => method === 'turn/start',
    )
    assert.equal(turnStarts.length, 2)
    assert.deepEqual(
      turnStarts.map(({ params }) => params?.cwd),
      [workspace, workspace],
    )
    assert.deepEqual(
      turnStarts[1]?.params?.input,
      [{ type: 'text', text: 'Continue the product conversation.' }],
    )
    assert.equal(turnStarts[1]?.params?.approvalPolicy, 'never')
    assert.deepEqual(turnStarts[1]?.params?.sandboxPolicy, {
      networkAccess: false,
      type: 'readOnly',
    })
    assert.deepEqual(
      journal.messages
        .map(({ method }) => method)
        .filter((method) => method === 'model/list' || method === 'turn/start'),
      ['model/list', 'turn/start', 'turn/start'],
    )
    assert.equal(
      journal.messages.some(({ method }) => method === 'skills/extraRoots/set'),
      false,
    )
    assert.deepEqual(turnStarts[1]?.params?.collaborationMode, {
      mode: 'plan',
      settings: {
        developer_instructions: null,
        model: 'fake-model',
        reasoning_effort: 'medium',
      },
    })
    assert.equal(turnStarts[1]?.params?.model, 'fake-model')
    assert.equal(turnStarts[1]?.params?.effort, 'medium')
    assert.equal(turnStarts[1]?.params?.serviceTier, 'fast')
  } finally {
    await harness.runtime.close()
  }
})

test('snapshots one workspace Skill before asynchronous validation and native turn mutation', async () => {
  const harness = await startHarness('product-skill-input')
  try {
    const workspace = await realpath(dirname(harness.journalPath))
    const skillPath = join(
      workspace,
      '.agents',
      'skills',
      'ay-ple-first-assignment',
      'SKILL.md',
    )
    await mkdir(dirname(skillPath), { recursive: true })
    await writeFile(
      skillPath,
      [
        '---',
        'name: ay-ple-first-assignment',
        'description: Test Skill.',
        '---',
        '',
        'Use the selected SemesterWorkspace files.',
        '',
      ].join('\n'),
      'utf8',
    )
    const { threadId } = await harness.runtime.startThread()
    const input = {
      threadId,
      permissionProfile: 'workspace_write' as const,
      settings: {
        model: 'fake-model',
        reasoningEffort: 'medium',
        serviceTier: 'fast' as const,
      },
      skill: {
        name: 'ay-ple-first-assignment',
        path: skillPath,
      },
      text: 'Continue the product conversation.',
    }

    const pendingTurn = harness.runtime.startProductTurn(input)
    input.settings.model = 'caller-mutated-model'
    input.skill.name = 'caller-mutated-skill'
    input.skill.path = '/caller-mutated/SKILL.md'
    input.text = 'caller-mutated text'
    const turn = await pendingTurn
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested } = await readUntilUserInput(iterator)
    const cancelled = harness.runtime.cancelUserInput({
      interactionId: requested.interactionId,
    })
    await collectIterator(iterator)
    await cancelled

    const journal = await readAppServerJournal(harness.journalPath)
    const turnStart = journal.messages.find(
      ({ method }) => method === 'turn/start',
    )
    assert.deepEqual(turnStart?.params?.input, [
      {
        type: 'skill',
        name: 'ay-ple-first-assignment',
        path: skillPath,
      },
      {
        type: 'text',
        text: 'Continue the product conversation.',
      },
    ])
    assert.equal(turnStart?.params?.model, 'fake-model')
    assert.equal(turnStart?.params?.effort, 'medium')
    assert.equal(turnStart?.params?.serviceTier, 'fast')
    assert.equal(
      journal.messages.some(
        ({ method }) => method === 'skills/extraRoots/set',
      ),
      false,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('rejects malformed or unsafe Product Skill input before native turn mutation', async () => {
  const harness = await startHarness('product-skill-validation')
  try {
    const workspace = await realpath(dirname(harness.journalPath))
    const validSkillPath = join(
      workspace,
      '.agents',
      'skills',
      'valid-skill',
      'SKILL.md',
    )
    await mkdir(dirname(validSkillPath), { recursive: true })
    await writeFile(validSkillPath, '# Valid test Skill\n', 'utf8')

    const outsideRoot = await mkdtemp(
      join(tmpdir(), 'ay-ple-product-skill-outside-'),
    )
    roots.push(outsideRoot)
    const outsideSkillPath = join(await realpath(outsideRoot), 'SKILL.md')
    await writeFile(outsideSkillPath, '# Outside test Skill\n', 'utf8')

    const directorySkillPath = join(
      workspace,
      '.agents',
      'skills',
      'directory-skill',
      'SKILL.md',
    )
    await mkdir(directorySkillPath, { recursive: true })

    const linkedSkillPath = join(
      workspace,
      '.agents',
      'skills',
      'linked-skill',
      'SKILL.md',
    )
    await mkdir(dirname(linkedSkillPath), { recursive: true })
    await symlink(validSkillPath, linkedSkillPath)

    const linkedParent = join(
      workspace,
      '.agents',
      'skills',
      'linked-parent',
    )
    await symlink(dirname(validSkillPath), linkedParent)

    const { threadId } = await harness.runtime.startThread()
    const base = {
      threadId,
      permissionProfile: 'workspace_write',
      text: 'Continue the product conversation.',
    }
    const invalidInputs = [
      {
        threadId,
        text: base.text,
      },
      {
        ...base,
        skill: { name: 'valid-skill', path: validSkillPath },
        extra: true,
      },
      {
        ...base,
        skill: { name: 'valid-skill' },
      },
      {
        ...base,
        skill: {
          name: 'valid-skill',
          path: validSkillPath,
          version: 'v1',
        },
      },
      {
        ...base,
        skill: { name: '', path: validSkillPath },
      },
      {
        ...base,
        skill: { name: 'é'.repeat(129), path: validSkillPath },
      },
      {
        ...base,
        skill: { name: 'unsafe\nname', path: validSkillPath },
      },
      {
        ...base,
        skill: { name: 'valid-skill', path: 'relative/SKILL.md' },
      },
      {
        ...base,
        skill: {
          name: 'valid-skill',
          path:
            `${workspace}/.agents/skills/valid-skill/` +
            '../valid-skill/SKILL.md',
        },
      },
      {
        ...base,
        skill: {
          name: 'valid-skill',
          path: join(dirname(validSkillPath), 'README.md'),
        },
      },
      {
        ...base,
        skill: { name: 'valid-skill', path: outsideSkillPath },
      },
      {
        ...base,
        skill: {
          name: 'valid-skill',
          path: join(workspace, '.agents', 'skills', 'missing', 'SKILL.md'),
        },
      },
      {
        ...base,
        skill: { name: 'valid-skill', path: directorySkillPath },
      },
      {
        ...base,
        skill: { name: 'valid-skill', path: linkedSkillPath },
      },
      {
        ...base,
        skill: {
          name: 'valid-skill',
          path: join(linkedParent, 'SKILL.md'),
        },
      },
    ]

    for (const invalidInput of invalidInputs) {
      await assert.rejects(
        async () =>
          harness.runtime.startProductTurn(
            invalidInput as StartProductTurnInput,
          ),
        TypeError,
      )
    }

    const journal = await readAppServerJournal(harness.journalPath)
    assert.equal(
      journal.messages.some(({ method }) => method === 'turn/start'),
      false,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('rejects a Product Skill when its parent directory is replaced during validation', async () => {
  let swapSkillParent: (() => Promise<void>) | undefined
  const harness = await startHarness(
    'product-skill-parent-swap',
    undefined,
    async ({ phase }) => {
      assert.equal(phase, 'before_open')
      await swapSkillParent?.()
    },
  )
  try {
    const workspace = await realpath(dirname(harness.journalPath))
    const skillsRoot = join(workspace, '.agents', 'skills')
    const skillRoot = join(skillsRoot, 'swapped-skill')
    const replacementRoot = join(skillsRoot, 'replacement-skill')
    const displacedRoot = join(skillsRoot, 'displaced-skill')
    const skillPath = join(skillRoot, 'SKILL.md')
    const replacementSkillPath = join(replacementRoot, 'SKILL.md')
    await Promise.all([
      mkdir(skillRoot, { recursive: true }),
      mkdir(replacementRoot, { recursive: true }),
    ])
    await writeFile(skillPath, '# Parent swap test Skill\n', 'utf8')
    await link(skillPath, replacementSkillPath)
    swapSkillParent = async () => {
      await rename(skillRoot, displacedRoot)
      await rename(replacementRoot, skillRoot)
    }

    const { threadId } = await harness.runtime.startThread()
    await assert.rejects(
      harness.runtime.startProductTurn({
        threadId,
        permissionProfile: 'workspace_write',
        skill: {
          name: 'swapped-skill',
          path: skillPath,
        },
        text: 'Do not start this Product Turn.',
      }),
      (error: unknown) =>
        error instanceof TypeError &&
        error.message ===
          'Product Skill path ancestry changed during validation',
    )

    const journal = await readAppServerJournal(harness.journalPath)
    assert.equal(
      journal.messages.some(({ method }) => method === 'turn/start'),
      false,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('rejects a Product Skill when the startup workspace root is replaced before native turn mutation', async () => {
  const harness = await startHarness('product-skill-workspace-root-replacement')
  const workspace = await realpath(dirname(harness.journalPath))
  const displacedWorkspace = `${workspace}-displaced`
  roots.push(displacedWorkspace)
  try {
    const { threadId } = await harness.runtime.startThread()
    const startupJournal = await readFile(harness.journalPath, 'utf8')

    await rename(workspace, displacedWorkspace)
    await mkdir(workspace)
    await initializeGitRootForTest(workspace)
    const skillPath = join(
      workspace,
      '.agents',
      'skills',
      'replacement-root-skill',
      'SKILL.md',
    )
    await mkdir(dirname(skillPath), { recursive: true })
    await writeFile(skillPath, '# Replacement root test Skill\n', 'utf8')
    await writeFile(harness.journalPath, startupJournal, 'utf8')

    await assert.rejects(
      harness.runtime.startProductTurn({
        threadId,
        permissionProfile: 'workspace_write',
        skill: {
          name: 'replacement-root-skill',
          path: skillPath,
        },
        text: 'Do not start this Product Turn.',
      }),
      TypeError,
    )

    const journal = await readAppServerJournal(harness.journalPath)
    assert.equal(
      journal.messages.some(({ method }) => method === 'turn/start'),
      false,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('runs a structured product turn through one pending native interaction', async () => {
  const harness = await startHarness('product-turn')
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(productTurnInput(threadId))
    const iterator = turn.events[Symbol.asyncIterator]()
    const events: CodexProductActivity[] = []
    let requested: Extract<
      CodexProductActivity,
      { type: 'user_input.requested' }
    > | undefined
    while (!requested) {
      const next = await within(iterator.next())
      assert.equal(next.done, false)
      events.push(next.value)
      if (next.value.type === 'user_input.requested') requested = next.value
    }

    await assert.rejects(
      harness.runtime.answerUserInput({
        interactionId: requested.interactionId,
        answers: { unknown: ['Accept'] },
      }),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'invalid_user_input_answer',
    )

    const [answered, duplicate] = await Promise.allSettled([
      harness.runtime.answerUserInput({
        interactionId: requested.interactionId,
        answers: { decision: ['Accept'] },
      }),
      harness.runtime.answerUserInput({
        interactionId: requested.interactionId,
        answers: { decision: ['Accept'] },
      }),
    ])
    assert.equal(answered.status, 'fulfilled')
    assert.equal(duplicate.status, 'rejected')
    assert.equal(
      duplicate.status === 'rejected' &&
        duplicate.reason instanceof CodexChatRuntimeError
        ? duplicate.reason.code
        : undefined,
      'interaction_not_pending',
    )

    while (true) {
      const next = await within(iterator.next())
      if (next.done) break
      events.push(next.value)
    }
    assert.deepEqual(
      [...events.map(({ type }) => type)].sort(),
      [
        'agent_message.completed',
        'agent_message.delta',
        'plan.completed',
        'plan.delta',
        'turn.completed',
        'user_input.requested',
        'user_input.resolved',
      ].sort(),
    )
    assert.deepEqual(events.at(-1), {
      type: 'turn.completed',
      threadId,
      turnId: turn.turnId,
      status: 'completed',
    })
    const projected = JSON.stringify(events)
    for (const privateValue of [
      'user-input-',
      '/managed/assignment-modeling/SKILL.md',
      '/private/',
      'credential',
      'private-state-server',
    ]) {
      assert.equal(projected.includes(privateValue), false)
    }
    const journal = JSON.parse(
      await readFile(harness.journalPath, 'utf8'),
    ) as {
      messages: readonly {
        readonly method?: string
        readonly params?: Record<string, unknown>
      }[]
    }
    assert.equal(
      journal.messages.some(({ method }) => method === 'skills/extraRoots/set'),
      false,
    )
    const nativeTurn = journal.messages.find(
      ({ method }) => method === 'turn/start',
    )
    assert.equal(nativeTurn?.params?.approvalPolicy, 'on-request')
    assert.equal(nativeTurn?.params?.approvalsReviewer, 'auto_review')
    assert.deepEqual(nativeTurn?.params?.sandboxPolicy, {
      excludeSlashTmp: false,
      excludeTmpdirEnvVar: false,
      networkAccess: false,
      type: 'workspaceWrite',
      writableRoots: [],
    })
  } finally {
    await harness.runtime.close()
  }
})

test('uses native thread settings when the advertised model catalog is ambiguous or unavailable', async () => {
  for (const marker of [
    'no-default-model',
    'multiple-default-models',
    'fail-model-list',
  ]) {
    const harness = await startHarness(`product-${marker}`)
    try {
      const { threadId } = await harness.runtime.startThread()
      await writeFile(join(dirname(harness.journalPath), marker), '')

      const turn = await harness.runtime.startProductTurn(
        productTurnInput(threadId),
      )
      const iterator = turn.events[Symbol.asyncIterator]()
      const { requested } = await readUntilUserInput(iterator)
      await harness.runtime.cancelUserInput({
        interactionId: requested.interactionId,
      })
      await collectIterator(iterator)

      const journal = JSON.parse(
        await readFile(harness.journalPath, 'utf8'),
      ) as {
        messages: readonly {
          readonly method?: string
          readonly params?: Record<string, unknown>
        }[]
      }
      assert.deepEqual(
        journal.messages
          .map(({ method }) => method)
          .filter(
            (method) => method === 'model/list' || method === 'turn/start',
          ),
        ['turn/start'],
      )
      const turnStart = journal.messages.find(
        ({ method }) => method === 'turn/start',
      )
      assert.deepEqual(turnStart?.params?.collaborationMode, {
        mode: 'plan',
        settings: {
          developer_instructions: null,
          model: 'fake-model',
          reasoning_effort: 'medium',
        },
      })
    } finally {
      await harness.runtime.close()
    }
  }
})

test('orders product settlement after native resolution and before continuation', async () => {
  const harness = await startHarness('product-native-resolution-order')
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(productTurnInput(threadId))
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)
    await writeFile(
      join(dirname(harness.journalPath), 'delay-user-input-resolution'),
      '',
    )

    const settlement = harness.runtime.answerUserInput({
      interactionId: requested.interactionId,
      answers: { decision: ['Accept'] },
    })
    await waitForJournalUserInputResponse(harness.journalPath)
    await assertPending(settlement)

    const publicResolution = readUntilUserInputResolved(iterator, events)
    await assertPending(publicResolution)
    const account = harness.runtime.readAccountReadiness()
    await settlement
    await within(publicResolution)
    events.push(...(await collectIterator(iterator)))
    assert.deepEqual(await account, { state: 'ready' })

    const orderedTypes = events.map(({ type }) => type)
    assert.equal(
      orderedTypes.filter((type) => type === 'user_input.resolved').length,
      1,
    )
    assert.ok(
      orderedTypes.indexOf('user_input.resolved') <
        orderedTypes.indexOf('agent_message.delta'),
    )
    assert.equal(orderedTypes.at(-1), 'turn.completed')
  } finally {
    await harness.runtime.close()
  }
})

test('does not project answer success when cleanup resolves before terminal', async () => {
  const harness = await startHarness('product-native-cleanup-resolution')
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(productTurnInput(threadId))
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)
    await writeFile(
      join(dirname(harness.journalPath), 'cleanup-user-input-resolution'),
      '',
    )

    const settlement = harness.runtime.answerUserInput({
      interactionId: requested.interactionId,
      answers: { decision: ['Accept'] },
    })
    await assert.rejects(
      settlement,
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'interaction_not_pending' &&
        !error.unknownOutcome,
    )
    events.push(...(await collectIterator(iterator)))

    assert.equal(
      events.filter(({ type }) => type === 'user_input.resolved').length,
      0,
    )
    assert.deepEqual(events.at(-1), {
      type: 'turn.completed',
      threadId,
      turnId: turn.turnId,
      status: 'interrupted',
    })
  } finally {
    await harness.runtime.close()
  }
})

test('cancels and interrupts pending product interactions once', async (t) => {
  await t.test('cancel', async () => {
    const harness = await startHarness('product-cancel')
    try {
      const { threadId } = await harness.runtime.startThread()
      const turn = await harness.runtime.startProductTurn(
        productTurnInput(threadId),
      )
      const iterator = turn.events[Symbol.asyncIterator]()
      const { requested, events } = await readUntilUserInput(iterator)

      await harness.runtime.cancelUserInput({
        interactionId: requested.interactionId,
      })
      events.push(...(await collectIterator(iterator)))
      assert.equal(
        events.filter(({ type }) => type === 'user_input.resolved').length,
        1,
      )
      assert.equal(
        events.find(({ type }) => type === 'user_input.resolved')?.resolution,
        'cancelled',
      )
      assert.equal(events.at(-1)?.type, 'turn.completed')
    } finally {
      await harness.runtime.close()
    }
  })

  await t.test('interrupt', async () => {
    const harness = await startHarness('product-interrupt')
    try {
      const { threadId } = await harness.runtime.startThread()
      const turn = await harness.runtime.startProductTurn(
        productTurnInput(threadId),
      )
      const iterator = turn.events[Symbol.asyncIterator]()
      const { requested, events } = await readUntilUserInput(iterator)

      await harness.runtime.interrupt({ threadId, turnId: turn.turnId })
      await assert.rejects(
        harness.runtime.answerUserInput({
          interactionId: requested.interactionId,
          answers: { decision: ['Accept'] },
        }),
        (error: unknown) =>
          error instanceof CodexChatRuntimeError &&
          error.code === 'interaction_not_pending',
      )
      events.push(...(await collectIterator(iterator)))
      assert.equal(
        events.filter(
          ({ type }) => type === 'turn.interrupt_acknowledged',
        ).length,
        1,
      )
      assert.deepEqual(events.at(-1), {
        type: 'turn.completed',
        threadId,
        turnId: turn.turnId,
        status: 'interrupted',
      })
    } finally {
      await harness.runtime.close()
    }
  })

  await t.test('close', async () => {
    const harness = await startHarness('product-close')
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(
      productTurnInput(threadId),
    )
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)
    const remaining = collectIterator(iterator)

    await harness.runtime.close()
    events.push(...(await remaining))
    assert.equal(
      events.filter(({ type }) => type === 'user_input.resolved').length,
      0,
    )
    assert.deepEqual(events.at(-1), {
      type: 'turn.completed',
      threadId,
      turnId: turn.turnId,
      status: 'interrupted',
    })
    await assert.rejects(
      harness.runtime.cancelUserInput({
        interactionId: requested.interactionId,
      }),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError && error.code === 'runtime_closed',
    )
  })

  await t.test('close during settlement', async () => {
    const harness = await startHarness('product-close-during-settlement')
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(
      productTurnInput(threadId),
    )
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)
    await writeFile(
      join(dirname(harness.journalPath), 'delay-user-input-resolution'),
      '',
    )
    const settlement = harness.runtime.answerUserInput({
      interactionId: requested.interactionId,
      answers: { decision: ['Accept'] },
    })
    await waitForJournalUserInputResponse(harness.journalPath)

    const remaining = collectIterator(iterator)
    const close = harness.runtime.close()
    await assert.rejects(
      settlement,
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'interaction_not_pending' &&
        !error.unknownOutcome,
    )
    await close
    events.push(...(await remaining))
    assert.equal(
      events.filter(({ type }) => type === 'user_input.resolved').length,
      0,
    )
    assert.deepEqual(events.at(-1), {
      type: 'turn.completed',
      threadId,
      turnId: turn.turnId,
      status: 'interrupted',
    })
  })
})

test('settles a pending product interaction once on stream overflow', async () => {
  const harness = await startHarness('product-pending-overflow', {
    operationMaxFrames: 8,
    operationMaxBytes: 1024 * 1024,
    aggregateMaxFrames: 16,
    aggregateMaxBytes: 2 * 1024 * 1024,
  })
  let closed = false
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(productTurnInput(threadId))
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)

    await writeFile(
      join(dirname(harness.journalPath), 'flood-pending-product-turn'),
      '',
    )
    const concurrentRead = harness.runtime.readAccountReadiness()
    const terminal = await within(harness.terminal)
    assert.equal(terminal.code, 'buffer_overflow')
    await concurrentRead.catch(() => undefined)

    events.push(...(await collectIterator(iterator)))
    assert.equal(
      events.filter(({ type }) => type === 'runtime.failed').length,
      1,
    )
    assert.equal(events.at(-1)?.type, 'runtime.failed')
    await assert.rejects(
      harness.runtime.answerUserInput({
        interactionId: requested.interactionId,
        answers: { decision: ['Accept'] },
      }),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'buffer_overflow',
    )
    await harness.closed
    closed = true
    await waitForPidExit(harness.nativeChildPidPath)
  } finally {
    if (!closed) await harness.runtime.close().catch(() => undefined)
  }
})

test('settles a pending product interaction once when App Server is lost', async () => {
  const harness = await startHarness('product-pending-app-server-loss')
  let closed = false
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startProductTurn(productTurnInput(threadId))
    const iterator = turn.events[Symbol.asyncIterator]()
    const { requested, events } = await readUntilUserInput(iterator)

    await killNativeChild(harness.nativeChildPidPath)
    events.push(...(await collectIterator(iterator)))
    assert.equal(
      events.filter(({ type }) => type === 'runtime.failed').length,
      1,
    )
    assert.deepEqual(events.at(-1), {
      type: 'runtime.failed',
      code: 'sdk_transport_failed',
      displayMessage:
        'The Codex bridge terminated because its private protocol failed.',
      mutationOutcomeKnown: true,
    })
    await assert.rejects(
      harness.runtime.cancelUserInput({
        interactionId: requested.interactionId,
      }),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'sdk_transport_failed',
    )
    assert.equal((await within(harness.terminal)).code, 'sdk_transport_failed')
    await harness.closed
    closed = true
    await waitForPidExit(harness.nativeChildPidPath)
  } finally {
    if (!closed) await harness.runtime.close().catch(() => undefined)
  }
})

test('constructs a controlled child environment without ambient authority', async () => {
  const ambient = {
    ANTHROPIC_API_KEY: 'ambient-anthropic-secret',
    DYLD_LIBRARY_PATH: '/ambient/dynamic-loader',
    HOME: '/ambient/home',
    OPENAI_API_KEY: 'ambient-openai-secret',
    OPENAI_BASE_URL: 'https://ambient.invalid',
    OPENAI_ORGANIZATION: 'ambient-organization',
    OPENAI_PROJECT: 'ambient-project',
    PATH: '/ambient/bin',
    PYTHONPATH: '/ambient/python',
  } as const
  const previous = new Map(
    Object.keys(ambient).map((key) => [key, process.env[key]]),
  )
  Object.assign(process.env, ambient)

  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-bridge-env-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const journalPath = join(workspace, 'journal.json')
  const nativeChildPidPath = join(workspace, 'native-child.pid')
  let harness: SpawnedCodexChatRuntime | undefined
  try {
    harness = await startVerifiedCodexChatRuntime({
      bundle,
      workspace,
      environment,
      childEnvironment: {
        AY_PLE_INTERACTION_BROKER_TOKEN: 'runtime-token',
        AY_PLE_INTERACTION_BROKER_URL:
          'http://127.0.0.1:43127/api/_private/interaction-mcp',
        AY_PLE_INTERACTION_RUNTIME_BINDING:
          'runtime_0123456789abcdef0123456789abcdef',
      },
      launchArgsOverride: [
        bundle.pythonExecutable,
        '-B',
        FAKE_APP_SERVER,
        journalPath,
        nativeChildPidPath,
      ],
      journalPath,
      nativeChildPidPath,
    })
    const journal = JSON.parse(await readFile(journalPath, 'utf8')) as {
      environment: Record<string, unknown>
    }
    assert.deepEqual(journal.environment, {
      AY_PLE_INTERACTION_BROKER_TOKEN: 'runtime-token',
      AY_PLE_INTERACTION_BROKER_URL:
        'http://127.0.0.1:43127/api/_private/interaction-mcp',
      AY_PLE_INTERACTION_RUNTIME_BINDING:
        'runtime_0123456789abcdef0123456789abcdef',
      CODEX_HOME: environment.codexHome,
      CODEX_SQLITE_HOME: environment.codexSqliteHome,
      HOME: environment.home,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      PATH: [
        bundle.codexPathDirectory,
        dirname(bundle.pythonExecutable),
        dirname(process.execPath),
        '/usr/bin',
        '/bin',
        '/usr/sbin',
        '/sbin',
      ].join(':'),
      TMPDIR: environment.tempDirectory,
      keys: [
        'AY_PLE_INTERACTION_BROKER_TOKEN',
        'AY_PLE_INTERACTION_BROKER_URL',
        'AY_PLE_INTERACTION_RUNTIME_BINDING',
        'CODEX_HOME',
        'CODEX_SQLITE_HOME',
        'HOME',
        'LANG',
        'LC_ALL',
        'PATH',
        'PYTHONDONTWRITEBYTECODE',
        'PYTHONNOUSERSITE',
        'PYTHONUNBUFFERED',
        'PYTHONUTF8',
        'TMPDIR',
        '__CF_USER_TEXT_ENCODING',
      ],
      unsafePresent: [],
    })
  } finally {
    await harness?.runtime.close().catch(() => undefined)
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})

test('rejects invalid operational options before spawning any child', async (t) => {
  for (const [label, overrides] of [
    ['budget', { budgets: { operationMaxFrames: 0 } }],
    ['deadline', { deadlines: { responseMs: 0 } }],
    ['entry-count', {
      childEnvironment: Object.fromEntries(
        Array.from({ length: 17 }, (_value, index) => [
          `AY_PLE_TEST_${index}`,
          'value',
        ]),
      ),
    }],
    ['invalid-key', { childEnvironment: { 'invalid-key': 'value' } }],
    ['value-bytes', {
      childEnvironment: { AY_PLE_TEST_VALUE: '가'.repeat(2_731) },
    }],
    ['aggregate-bytes', {
      childEnvironment: Object.fromEntries(
        Array.from({ length: 9 }, (_value, index) => [
          `AY_PLE_TEST_${index}`,
          'x'.repeat(8 * 1024),
        ]),
      ),
    }],
    ['protected-home', { childEnvironment: { HOME: '/tmp/override' } }],
    ['protected-codex-home', {
      childEnvironment: { CODEX_HOME: '/tmp/override' },
    }],
    ['protected-codex-sqlite-home', {
      childEnvironment: { CODEX_SQLITE_HOME: '/tmp/override' },
    }],
    ['protected-temp', { childEnvironment: { TMPDIR: '/tmp/override' } }],
    ['protected-path', { childEnvironment: { PATH: '/tmp/override' } }],
    ['protected-python', {
      childEnvironment: { PYTHONPATH: '/tmp/override' },
    }],
    ['protected-dynamic-loader', {
      childEnvironment: { DYLD_LIBRARY_PATH: '/tmp/override' },
    }],
    ['protected-runtime-key', {
      childEnvironment: { LANG: 'ko_KR.UTF-8' },
    }],
  ] as const) {
    await t.test(label, async () => {
      const workspace = await mkdtemp(join(tmpdir(), `ay-ple-node-invalid-${label}-`))
      roots.push(workspace)
      const processJournalPath = join(workspace, 'process-journal.json')
      await assert.rejects(
        startVerifiedCodexChatRuntime({
          bundle,
          workspace,
          environment: await createEnvironmentRoots(workspace),
          bridgeEntrypointOverride: FAKE_NODE_WORKER,
          bridgeArgsOverride: [
            '--scenario=response-hang',
            `--process-journal=${processJournalPath}`,
          ],
          ...overrides,
        }),
        TypeError,
      )
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 150))
      try {
        const journal = JSON.parse(await readFile(processJournalPath, 'utf8')) as {
          processGroupId: number
        }
        if (processGroupExists(journal.processGroupId)) {
          process.kill(-journal.processGroupId, 'SIGKILL')
          await waitForProcessGroupExit(journal.processGroupId)
        }
        assert.fail('invalid options spawned a child process')
      } catch (error) {
        assert.equal((error as NodeJS.ErrnoException).code, 'ENOENT')
      }
    })
  }
})

test('preserves response-last native identity and FIFO events through Node', async () => {
  const harness = await startHarness('response-last')
  try {
    const thread = await harness.runtime.startThread()
    assert.deepEqual(thread, { threadId: 'thread-1' })

    const turn = await harness.runtime.startTurn({
      threadId: thread.threadId,
      text: 'response-last',
    })
    assert.equal(turn.threadId, 'thread-1')
    assert.equal(turn.turnId, 'turn-1')
    const events = await collect(turn.events)
    assert.deepEqual(
      events.map((event) => event.type),
      [
        'turn.error',
        'agent_message.delta',
        'agent_message.completed',
        'turn.completed',
      ],
    )
    assert.equal(events.at(-1)?.type, 'turn.completed')
    assert.equal(JSON.stringify({ thread, turn: events }).includes('bridgeRequestId'), false)
  } finally {
    await harness.runtime.close()
  }
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('fails a stalled turn consumer on the frame after its exact queue boundary', async () => {
  const harness = await startHarness('node-operation-overflow', {
    operationMaxFrames: 2,
    operationMaxBytes: 1024 * 1024,
    aggregateMaxFrames: 4,
    aggregateMaxBytes: 2 * 1024 * 1024,
  })
  let closed = false
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startTurn({
      threadId,
      text: 'node-stalled-consumer-overflow',
    })

    const terminal = await within(harness.terminal)
    assert.equal(terminal.code, 'buffer_overflow')
    assert.deepEqual(await collect(turn.events), [
      {
        type: 'runtime.failed',
        code: 'buffer_overflow',
        displayMessage: 'The Codex runtime buffer limit was exceeded.',
        mutationOutcomeKnown: true,
      },
    ])
    await harness.closed
    closed = true
    await waitForPidExit(harness.nativeChildPidPath)
  } finally {
    if (!closed) {
      await harness.runtime.close().catch(() => undefined)
    }
  }
})

test('fails on the first byte beyond one turn queue while preserving the exact boundary', async () => {
  const first = bridgeEventFrame('bridge-2', 'a')
  const second = bridgeEventFrame('bridge-2', 'b')
  const third = bridgeEventFrame('bridge-2', 'c')
  assert.equal(first.byteLength, second.byteLength)
  assert.equal(second.byteLength, third.byteLength)
  const { harness, processJournalPath } = await startSyntheticHarness(
    'operation-byte-boundary',
    'stream-idle',
    {
      operationMaxFrames: 4,
      operationMaxBytes: first.byteLength * 2,
      aggregateMaxFrames: 8,
      aggregateMaxBytes: first.byteLength * 4,
    },
  )
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'byte bound' })

  harness.receiveRawForTest(first)
  harness.receiveRawForTest(second)
  await assertPending(harness.terminal)
  harness.receiveRawForTest(third)

  assert.equal((await harness.terminal).code, 'buffer_overflow')
  assert.deepEqual(await collect(turn.events), [
    {
      type: 'runtime.failed',
      code: 'buffer_overflow',
      displayMessage: 'The Codex runtime buffer limit was exceeded.',
      mutationOutcomeKnown: true,
    },
  ])
  await harness.closed
  await waitForProcessGroupExit(
    (await readProcessJournal(processJournalPath)).processGroupId,
  )
})

test('fails the aggregate queue without prematurely failing either turn route', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'aggregate-frame-boundary',
    'stream-idle',
    {
      operationMaxFrames: 2,
      operationMaxBytes: 1024 * 1024,
      aggregateMaxFrames: 2,
      aggregateMaxBytes: 2 * 1024 * 1024,
    },
  )
  const firstThread = await harness.runtime.startThread()
  const secondThread = await harness.runtime.startThread()
  const firstTurn = await harness.runtime.startTurn({
    threadId: firstThread.threadId,
    text: 'first',
  })
  const secondTurn = await harness.runtime.startTurn({
    threadId: secondThread.threadId,
    text: 'second',
  })

  harness.receiveRawForTest(bridgeEventFrame('bridge-3', 'a'))
  harness.receiveRawForTest(bridgeEventFrame('bridge-4', 'b'))
  await assertPending(harness.terminal)
  harness.receiveRawForTest(bridgeEventFrame('bridge-4', 'c'))

  assert.equal((await harness.terminal).code, 'buffer_overflow')
  for (const events of [
    await collect(firstTurn.events),
    await collect(secondTurn.events),
  ]) {
    assert.equal(events.length, 1)
    assert.equal(events[0]?.type, 'runtime.failed')
  }
  await harness.closed
  await waitForProcessGroupExit(
    (await readProcessJournal(processJournalPath)).processGroupId,
  )
})

test('keeps interrupt correlation separate from the active turn stream', async () => {
  const harness = await startHarness('interrupt')
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
    const eventsPromise = collect(turn.events)

    await harness.runtime.interrupt({ threadId, turnId: turn.turnId })
    assert.deepEqual(await eventsPromise, [
      {
        type: 'turn.completed',
        threadId,
        turnId: turn.turnId,
        status: 'interrupted',
      },
    ])
  } finally {
    await harness.runtime.close()
  }
})

test('snapshots caller-owned inputs before asynchronous correlation', async () => {
  const harness = await startHarness('input-snapshot')
  let closed = false
  try {
    const { threadId } = await harness.runtime.startThread()
    const startInput = { threadId, text: 'hold' }
    const turnPromise = harness.runtime.startTurn(startInput)
    startInput.threadId = 'mutated-thread'
    startInput.text = 'mutated-text'
    const turn = await within(turnPromise)

    const interruptInput = { threadId, turnId: turn.turnId }
    const interruptPromise = harness.runtime.interrupt(interruptInput)
    interruptInput.threadId = 'mutated-thread'
    interruptInput.turnId = 'mutated-turn'
    await within(interruptPromise)
    assert.equal((await collect(turn.events)).at(-1)?.type, 'turn.completed')

    const releaseInput = { threadId }
    const releasePromise = harness.runtime.releaseThread(releaseInput)
    releaseInput.threadId = 'mutated-thread'
    await within(releasePromise)

    await harness.runtime.close()
    closed = true
  } finally {
    if (!closed) {
      harness.child.kill('SIGKILL')
      await harness.closed
    }
  }
})

test('rejects a dispatched mutation as unknown when the bridge dies pre-response', async () => {
  const harness = await startHarness('pre-response-loss')
  await writeFile(join(dirname(harness.journalPath), 'hold-thread-start'), '')
  const pending = harness.runtime.startThread()
  await waitForJournalMethod(harness.journalPath, 'thread/start')
  harness.child.kill('SIGKILL')

  await assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_lost' &&
      error.unknownOutcome,
  )
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('rejects a dispatched mutation as unknown when App Server dies pre-response', async () => {
  const harness = await startHarness('pre-response-app-server-loss')
  await writeFile(join(dirname(harness.journalPath), 'hold-thread-start'), '')
  const pending = harness.runtime.startThread()
  await waitForJournalMethod(harness.journalPath, 'thread/start')
  await killNativeChild(harness.nativeChildPidPath)

  await assert.rejects(
    pending,
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'sdk_transport_failed' &&
      error.unknownOutcome,
  )
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('rejects malformed native mutation responses as unknown and reaps once', async (t) => {
  const cases = [
    ['thread/start', { result: null }],
    ['turn/start', { result: {} }],
    [
      'turn/interrupt',
      { error: { code: true, message: 'boolean error code' } },
    ],
  ] as const

  for (const [operation, response] of cases) {
    await t.test(operation, async () => {
      const harness = await startHarness(`malformed-${operation.replace('/', '-')}`)
      const pending = startInjectedMutation(harness, operation, response)

      await assert.rejects(
        within(pending),
        (error: unknown) =>
          error instanceof CodexChatRuntimeError &&
          error.code === 'sdk_operation_failed' &&
          error.unknownOutcome,
      )
      const terminal = await within(harness.terminal)
      assert.equal(terminal.code, 'sdk_operation_failed')
      await harness.closed
      await waitForPidExit(harness.nativeChildPidPath)
    })
  }
})

test('keeps well-formed native JSON-RPC mutation rejections known and nonfatal', async (t) => {
  const rejection = {
    error: { code: -32602, message: 'injected valid rejection' },
  }
  for (const operation of [
    'thread/start',
    'turn/start',
    'turn/interrupt',
  ] as const) {
    await t.test(operation, async () => {
      const harness = await startHarness(`valid-rejection-${operation.replace('/', '-')}`)
      try {
        await assert.rejects(
          within(startInjectedMutation(harness, operation, rejection)),
          (error: unknown) =>
            error instanceof CodexChatRuntimeError &&
            error.code === 'sdk_request_failed' &&
            !error.unknownOutcome,
        )
        await assertPending(harness.terminal)
        assert.deepEqual(await harness.runtime.startThread(), {
          threadId: operation === 'thread/start' ? 'thread-1' : 'thread-2',
        })
      } finally {
        await harness.runtime.close()
      }
      await harness.closed
      await waitForPidExit(harness.nativeChildPidPath)
    })
  }
})

test('settles a pending mutation when a correlated result contradicts native scope', async () => {
  const harness = await startHarness('wrong-native-scope')
  const { threadId } = await harness.runtime.startThread()
  await writeFile(join(dirname(harness.journalPath), 'hold-turn-start'), '')
  const pending = harness.runtime.startTurn({ threadId, text: 'held response' })
  await waitForJournalMethod(harness.journalPath, 'turn/start')

  harness.receiveRawForTest(
    Buffer.from(
      '{"type":"result","bridgeRequestId":"bridge-2","command":"start_turn","threadId":"wrong-thread","turnId":"wrong-turn"}\n',
    ),
  )
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed' &&
      error.unknownOutcome,
  )
  assert.equal((await harness.terminal).code, 'bridge_protocol_failed')
  harness.child.kill('SIGKILL')
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('reaps a valid pre-ready fatal before startup rejection escapes', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-bridge-startup-fatal-'))
  roots.push(workspace)
  const journalPath = join(workspace, 'journal.json')
  const nativeChildPidPath = join(workspace, 'native-child.pid')
  await writeFile(join(workspace, 'fail-initialize'), '')

  await assert.rejects(
    startVerifiedCodexChatRuntime({
      bundle,
      workspace,
      environment: await createEnvironmentRoots(workspace),
      launchArgsOverride: [
        bundle.pythonExecutable,
        '-B',
        FAKE_APP_SERVER,
        journalPath,
        nativeChildPidPath,
      ],
      journalPath,
      nativeChildPidPath,
    }),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'sdk_initialization_failed' &&
      !error.unknownOutcome,
  )
  await waitForPidExit(nativeChildPidPath)
})

test('releases only the live bridge projection for a native thread', async () => {
  const harness = await startHarness('release')
  try {
    const thread = await harness.runtime.startThread()
    await harness.runtime.releaseThread(thread)
    await assert.rejects(
      harness.runtime.startTurn({ threadId: thread.threadId, text: 'after release' }),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'unknown_thread' &&
        !error.unknownOutcome,
    )
  } finally {
    await harness.runtime.close()
  }
})

test('ends an accepted stream once with runtime.failed after process loss', async () => {
  const harness = await startHarness('post-response-loss')
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
  harness.child.kill('SIGKILL')

  assert.deepEqual(await collect(turn.events), [
    {
      type: 'runtime.failed',
      code: 'runtime_lost',
      displayMessage: 'The Codex runtime connection was lost.',
      mutationOutcomeKnown: true,
    },
  ])
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('ends an accepted stream once when the native App Server is lost', async () => {
  const harness = await startHarness('post-response-app-server-loss')
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
  await killNativeChild(harness.nativeChildPidPath)

  assert.deepEqual(await collect(turn.events), [
    {
      type: 'runtime.failed',
      code: 'sdk_transport_failed',
      displayMessage: 'The Codex bridge terminated because its private protocol failed.',
      mutationOutcomeKnown: true,
    },
  ])
  await harness.closed
  await waitForPidExit(harness.nativeChildPidPath)
})

test('observes bridge input fatal exactly once without a public raw escape hatch', async () => {
  for (const [label, input, code] of [
    ['unknown', '{"bridgeRequestId":"raw","command":"wat"}\n', 'unknown_command'],
    ['malformed', '{nope}\n', 'malformed_json'],
  ] as const) {
    const harness = await startHarness(label)
    await harness.writeRawForTest(Buffer.from(input))
    const terminal = await harness.terminal
    assert.equal(terminal.code, code)
    assert.equal(terminal.unknownOutcome, false)
    await harness.runtime.close()
    await harness.closed
    assert.equal(harness.child.exitCode, 0)
    assert.equal(harness.child.signalCode, null)
    await waitForPidExit(harness.nativeChildPidPath)
  }
})

test('rejects untrusted turn error codes instead of publishing child strings', async (t) => {
  for (const [label, event] of [
    [
      'turn-error',
      {
        type: 'turn.error',
        threadId: 'thread-1',
        turnId: 'turn-1',
        willRetry: false,
        code: 'OPENAI_API_KEY_leaked',
        displayMessage: 'Codex reported a turn error.',
      },
    ],
    [
      'failed-terminal',
      {
        type: 'turn.completed',
        threadId: 'thread-1',
        turnId: 'turn-1',
        status: 'failed',
        failure: {
          code: 'OPENAI_API_KEY_leaked',
          displayMessage: 'Codex failed the turn.',
        },
      },
    ],
  ] as const) {
    await t.test(label, async () => {
      const { harness, processJournalPath } = await startSyntheticHarness(
        `unsafe-${label}`,
        'stream-idle',
      )
      const { threadId } = await harness.runtime.startThread()
      const turn = await harness.runtime.startTurn({ threadId, text: label })
      harness.receiveRawForTest(
        Buffer.from(
          `${JSON.stringify({
            type: 'event',
            bridgeRequestId: 'bridge-2',
            event,
          })}\n`,
          'utf8',
        ),
      )

      const terminal = await within(harness.terminal)
      assert.equal(terminal.code, 'bridge_protocol_failed')
      const events = await collect(turn.events)
      assert.equal(JSON.stringify(events).includes('OPENAI_API_KEY'), false)
      assert.equal(events.at(-1)?.type, 'runtime.failed')
      await harness.closed
      await waitForProcessGroupExit(
        (await readProcessJournal(processJournalPath)).processGroupId,
      )
    })
  }
})

test('closes idempotently after the SDK acknowledgement and complete pipe drain', async () => {
  const harness = await startHarness('close')
  await harness.runtime.startThread()
  const first = harness.runtime.close()
  const second = harness.runtime.close()
  await Promise.all([first, second])
  await harness.closed
  assert.equal(harness.child.exitCode, 0)
  assert.equal(harness.child.signalCode, null)
  await assert.rejects(
    harness.runtime.startThread(),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_closed' &&
      !error.unknownOutcome,
  )
  await waitForPidExit(harness.nativeChildPidPath)
})

test('escalates one close through SIGTERM and SIGKILL until the process group disappears', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-stubborn-close-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stubborn-close',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      gracefulCloseMs: 50,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const processJournal = await readProcessJournal(processJournalPath)
  assert.equal(processJournal.processGroupId, processJournal.workerPid)

  const first = harness.runtime.close()
  const second = harness.runtime.close()
  await assert.rejects(
    within(Promise.all([first, second])),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_close_timeout' &&
      !error.unknownOutcome,
  )
  await harness.closed
  await waitForProcessGroupExit(processJournal.processGroupId)
  await waitForProcessExit(processJournal.descendantPid)
})

 test('kills a pipe-inheriting descendant after the Python group leader exits first', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-leader-exit-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=leader-exits-first',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      gracefulCloseMs: 50,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const processJournal = await readProcessJournal(processJournalPath)
  assert.equal(processJournal.processGroupId, processJournal.workerPid)

  await assert.rejects(
    within(harness.runtime.close()),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_close_timeout',
  )
  await harness.closed
  await waitForProcessGroupExit(processJournal.processGroupId)
  await waitForProcessExit(processJournal.descendantPid)
})

test('coalesces repeated close with a simultaneous protocol fatal and writes once', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'fatal-close-race',
    'fatal-on-close',
  )
  const first = harness.runtime.close()
  const second = harness.runtime.close()
  assert.equal(first, second)
  await assert.rejects(
    harness.runtime.startThread(),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_closed' &&
      !error.unknownOutcome,
  )
  await assert.rejects(
    within(Promise.all([first, second])),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed',
  )
  assert.equal((await harness.terminal).code, 'bridge_protocol_failed')
  await harness.closed
  await assert.rejects(
    harness.runtime.startThread(),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed' &&
      !error.unknownOutcome,
  )
  const journal = await readProcessJournal(processJournalPath)
  assert.deepEqual(
    journal.commands.map((command) => command.command),
    ['close'],
  )
  await waitForProcessGroupExit(journal.processGroupId)
})

test('settles an active stream and pending mutation once during a fatal close race', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'active-fatal-close-race',
    'fatal-on-close',
  )
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'active' })
  const events = collect(turn.events)
  const pending = harness.runtime.startThread()
  void pending.catch(() => undefined)
  await waitForProcessJournalCommandCount(processJournalPath, 3)

  const close = harness.runtime.close()
  await assert.rejects(
    within(close),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed',
  )
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed' &&
      error.unknownOutcome,
  )
  assert.deepEqual(await events, [
    {
      type: 'runtime.failed',
      code: 'bridge_protocol_failed',
      displayMessage:
        'The Codex bridge returned an invalid private protocol frame.',
      mutationOutcomeKnown: true,
    },
  ])
  await harness.closed
  const journal = await readProcessJournal(processJournalPath)
  assert.deepEqual(
    journal.commands.map((command) => command.command),
    ['start_thread', 'start_turn', 'start_thread', 'close'],
  )
  await waitForProcessGroupExit(journal.processGroupId)
})

test('rejects close without acknowledgement and immediately settles pending work', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'missing-close-ack',
    'multiple-pending-eof',
  )
  const pending = harness.runtime.startThread()
  void pending.catch(() => undefined)
  const close = harness.runtime.close()

  await assert.rejects(
    within(close),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError && error.code === 'runtime_lost',
  )
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_lost' &&
      error.unknownOutcome,
  )
  await harness.closed
  const journal = await readProcessJournal(processJournalPath)
  assert.deepEqual(
    journal.commands.map((command) => command.command),
    ['start_thread', 'close'],
  )
  await waitForProcessGroupExit(journal.processGroupId)
})

test('treats close acknowledgement as the final private application frame', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'close-ack-seals-output',
    'close-ack-followed-by-result',
  )
  const pending = harness.runtime.startThread()
  void pending.catch(() => undefined)
  await waitForProcessJournalCommandCount(processJournalPath, 1)
  const close = harness.runtime.close()

  await assert.rejects(
    within(close),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed',
  )
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed' &&
      error.unknownOutcome,
  )
  await harness.closed
  const journal = await readProcessJournal(processJournalPath)
  assert.deepEqual(
    journal.commands.map((command) => command.command),
    ['start_thread', 'close'],
  )
  await waitForProcessGroupExit(journal.processGroupId)
})

test('turns cleanup failure into one terminal settlement for all pending work', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-cleanup-failure-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=response-hang',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 500,
      gracefulCloseMs: 50,
      terminateMs: 50,
      postKillMs: 50,
    },
    signalProcessGroupOverride: (processGroupId, signal) => {
      if (signal === 'SIGTERM') {
        throw Object.assign(new Error('not permitted'), { code: 'EPERM' })
      }
      process.kill(-processGroupId, signal)
    },
  })
  const journal = await readProcessJournal(processJournalPath)
  const pending = harness.runtime.startThread()
  void pending.catch(() => undefined)
  await waitForProcessJournalCommandCount(processJournalPath, 1)
  try {
    await assert.rejects(
      within(harness.runtime.close()),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'runtime_cleanup_failed',
    )
    await assert.rejects(
      within(pending),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'runtime_cleanup_failed' &&
        error.unknownOutcome,
    )
    assert.equal((await within(harness.terminal)).code, 'runtime_cleanup_failed')
    await assert.rejects(
      harness.closed,
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'runtime_cleanup_failed',
    )
  } finally {
    if (processGroupExists(journal.processGroupId)) {
      process.kill(-journal.processGroupId, 'SIGKILL')
      await waitForProcessGroupExit(journal.processGroupId)
    }
  }
})

test('bounds spawn plus initialize and cleans the timed-out process group', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-start-timeout-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const started = startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=startup-hang',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      spawnInitializeMs: 250,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  void started.catch(() => undefined)
  let processJournal: Awaited<ReturnType<typeof readProcessJournal>> | undefined
  try {
    await assert.rejects(
      within(started),
      (error: unknown) =>
        error instanceof CodexChatRuntimeError &&
        error.code === 'runtime_start_timeout' &&
        !error.unknownOutcome,
    )
    processJournal = await readProcessJournal(processJournalPath)
    await waitForProcessGroupExit(processJournal.processGroupId)
  } finally {
    processJournal ??= await readProcessJournal(processJournalPath)
    if (processGroupExists(processJournal.processGroupId)) {
      process.kill(-processJournal.processGroupId, 'SIGKILL')
      await waitForProcessGroupExit(processJournal.processGroupId)
    }
  }
})

test('bounds a dispatched response and settles its mutation once as unknown', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-response-timeout-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=response-hang',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 50,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const pending = harness.runtime.startThread()
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_response_timeout' &&
      error.unknownOutcome,
  )
  assert.equal((await harness.terminal).code, 'runtime_response_timeout')
  await harness.closed
  const processJournal = await readProcessJournal(processJournalPath)
  assert.deepEqual(
    processJournal.commands.map((command) => command.command),
    ['start_thread'],
  )
  await waitForProcessGroupExit(processJournal.processGroupId)
})

test('bounds an in-flight stdin write when the ready child stops reading', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-write-timeout-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stdin-stall',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 80,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const { threadId } = await harness.runtime.startThread()
  const pending = harness.runtime.startTurn({
    threadId,
    text: 'x'.repeat(900_000),
  })
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'runtime_response_timeout' &&
      error.unknownOutcome,
  )
  assert.equal((await harness.terminal).code, 'runtime_response_timeout')
  await harness.closed
  await waitForProcessGroupExit(
    (await readProcessJournal(processJournalPath)).processGroupId,
  )
})

test('bounds an accepted turn when its event stream becomes idle', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-stream-idle-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stream-idle',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 250,
      streamIdleMs: 50,
      streamTotalMs: 500,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const processJournal = await readProcessJournal(processJournalPath)
  try {
    const { threadId } = await harness.runtime.startThread()
    const turn = await harness.runtime.startTurn({ threadId, text: 'idle' })
    assert.deepEqual(await within(collect(turn.events)), [
      {
        type: 'runtime.failed',
        code: 'runtime_stream_idle_timeout',
        displayMessage: 'The Codex turn stream became unresponsive.',
        mutationOutcomeKnown: true,
      },
    ])
    await harness.closed
    await waitForProcessGroupExit(processJournal.processGroupId)
  } finally {
    if (processGroupExists(processJournal.processGroupId)) {
      process.kill(-processJournal.processGroupId, 'SIGKILL')
      await harness.closed.catch(() => undefined)
    }
  }
})

test('bounds total turn duration even while valid events reset the idle deadline', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-stream-total-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stream-active',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 250,
      streamIdleMs: 80,
      streamTotalMs: 150,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'active' })
  const events = await within(collect(turn.events))
  assert.equal(events.length > 1, true)
  assert.equal(
    events.slice(0, -1).every((event) => event.type === 'agent_message.delta'),
    true,
  )
  assert.deepEqual(events.at(-1), {
    type: 'runtime.failed',
    code: 'runtime_stream_total_timeout',
    displayMessage: 'The Codex turn exceeded its total runtime limit.',
    mutationOutcomeKnown: true,
  })
  await harness.closed
  const processJournal = await readProcessJournal(processJournalPath)
  await waitForProcessGroupExit(processJournal.processGroupId)
})

test('cancels response and stream deadlines after successful terminal delivery', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-deadline-cancel-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=stream-complete',
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 120,
      streamIdleMs: 120,
      streamTotalMs: 120,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const { threadId } = await harness.runtime.startThread()
  const turn = await harness.runtime.startTurn({ threadId, text: 'complete' })
  assert.deepEqual(await collect(turn.events), [
    {
      type: 'turn.completed',
      threadId,
      turnId: turn.turnId,
      status: 'completed',
    },
  ])

  await new Promise((resolvePromise) => setTimeout(resolvePromise, 240))
  assert.deepEqual(await harness.runtime.startThread(), { threadId: 'thread-1' })
  await harness.runtime.close()
  await harness.closed
  const processJournal = await readProcessJournal(processJournalPath)
  await waitForProcessGroupExit(processJournal.processGroupId)
})

test('keeps bounded stderr and untrusted child detail out of public failures', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'ay-ple-node-safe-failure-'))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      '--scenario=unsafe-fatal',
      `--process-journal=${processJournalPath}`,
    ],
    budgets: {
      stderrMaxFrames: 2,
      stderrMaxBytes: 64,
    },
    deadlines: {
      responseMs: 250,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  const pending = harness.runtime.startThread()
  await assert.rejects(
    within(pending),
    (error: unknown) =>
      error instanceof CodexChatRuntimeError &&
      error.code === 'bridge_protocol_failed' &&
      error.displayMessage ===
        'The Codex bridge returned an invalid private protocol frame.',
  )
  const terminal = await harness.terminal
  const publicFailure = JSON.stringify({
    code: terminal.code,
    displayMessage: terminal.displayMessage,
  })
  for (const forbidden of [
    '/private/secret',
    'OPENAI_API_KEY',
    'Traceback',
    'leaked',
  ]) {
    assert.equal(publicFailure.includes(forbidden), false)
  }
  await harness.closed
  const diagnostic = harness.stderrDiagnosticForTest()
  assert.equal(diagnostic.bytes <= 64, true)
  assert.equal(diagnostic.frames <= 2, true)
  assert.equal(diagnostic.truncated, true)
  assert.match(diagnostic.text, /stderr-tail$/)
  const processJournal = await readProcessJournal(processJournalPath)
  await waitForProcessGroupExit(processJournal.processGroupId)
})

test('settles malformed, invalid UTF-8, oversized, and pending-EOF output once and cleans each group', async (t) => {
  for (const [scenario, code] of [
    ['malformed-output', 'bridge_protocol_failed'],
    ['invalid-utf8', 'bridge_protocol_failed'],
    ['oversized-output', 'bridge_protocol_failed'],
    ['pending-eof', 'runtime_lost'],
  ] as const) {
    await t.test(scenario, async () => {
      const { harness, processJournalPath } = await startSyntheticHarness(
        `invalid-${scenario}`,
        scenario,
      )
      const pending = harness.runtime.startThread()
      await assert.rejects(
        within(pending),
        (error: unknown) =>
          error instanceof CodexChatRuntimeError &&
          error.code === code &&
          error.unknownOutcome,
      )
      assert.equal((await harness.terminal).code, code)
      await harness.closed
      const journal = await readProcessJournal(processJournalPath)
      assert.equal(journal.commands.length, 1)
      await waitForProcessGroupExit(journal.processGroupId)
    })
  }
})

test('preserves a valid correlated prefix before a malformed coalesced frame', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'valid-prefix-malformed-tail',
    'response-hang',
  )
  const pending = harness.runtime.startThread()
  harness.receiveRawForTest(
    Buffer.from(
      `${JSON.stringify({
        type: 'result',
        bridgeRequestId: 'bridge-1',
        command: 'start_thread',
        threadId: 'thread-1',
      })}\n{malformed}\n`,
      'utf8',
    ),
  )

  assert.deepEqual(await within(pending), { threadId: 'thread-1' })
  assert.equal((await harness.terminal).code, 'bridge_protocol_failed')
  await harness.closed
  await waitForProcessGroupExit(
    (await readProcessJournal(processJournalPath)).processGroupId,
  )
})

test('settles every dispatched mutation once when EOF has multiple pending operations', async () => {
  const { harness, processJournalPath } = await startSyntheticHarness(
    'multiple-pending-eof',
    'multiple-pending-eof',
  )
  const pending = [harness.runtime.startThread(), harness.runtime.startThread()]
  const results = await Promise.allSettled(pending)
  assert.equal(results.length, 2)
  for (const result of results) {
    assert.equal(result.status, 'rejected')
    if (result.status === 'rejected') {
      assert.equal(result.reason instanceof CodexChatRuntimeError, true)
      assert.equal(result.reason.code, 'runtime_lost')
      assert.equal(result.reason.unknownOutcome, true)
    }
  }
  assert.equal((await harness.terminal).code, 'runtime_lost')
  await harness.closed
  const journal = await readProcessJournal(processJournalPath)
  assert.equal(journal.commands.length, 2)
  await waitForProcessGroupExit(journal.processGroupId)
})

test('fails duplicate response and post-terminal event correlation without rewriting success', async () => {
  const duplicateResponse = await startSyntheticHarness(
    'duplicate-response',
    'duplicate-response',
  )
  assert.deepEqual(await duplicateResponse.harness.runtime.startThread(), {
    threadId: 'thread-1',
  })
  assert.equal(
    (await duplicateResponse.harness.terminal).code,
    'bridge_protocol_failed',
  )
  await duplicateResponse.harness.closed
  await waitForProcessGroupExit(
    (await readProcessJournal(duplicateResponse.processJournalPath))
      .processGroupId,
  )

  const duplicateTerminal = await startSyntheticHarness(
    'event-after-terminal',
    'event-after-terminal',
  )
  const { threadId } = await duplicateTerminal.harness.runtime.startThread()
  const turn = await duplicateTerminal.harness.runtime.startTurn({
    threadId,
    text: 'complete once',
  })
  assert.deepEqual(await collect(turn.events), [
    {
      type: 'turn.completed',
      threadId: 'thread-1',
      turnId: 'turn-1',
      status: 'completed',
    },
  ])
  assert.equal(
    (await duplicateTerminal.harness.terminal).code,
    'bridge_protocol_failed',
  )
  await duplicateTerminal.harness.closed
  await waitForProcessGroupExit(
    (await readProcessJournal(duplicateTerminal.processJournalPath))
      .processGroupId,
  )
})

async function startHarness(
  label: string,
  budgets?: {
    operationMaxFrames: number
    operationMaxBytes: number
    aggregateMaxFrames: number
    aggregateMaxBytes: number
  },
  productSkillValidationTestHook?:
    StartVerifiedCodexChatRuntimeOptions['productSkillValidationTestHook'],
): Promise<SpawnedCodexChatRuntime> {
  const workspace = await mkdtemp(join(tmpdir(), `ay-ple-node-bridge-${label}-`))
  roots.push(workspace)
  await writeFile(join(workspace, 'account-state'), 'chatgpt')
  const environment = await createEnvironmentRoots(workspace)
  const journalPath = join(workspace, 'journal.json')
  const nativeChildPidPath = join(workspace, 'native-child.pid')
  return startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    budgets,
    productSkillValidationTestHook,
    launchArgsOverride: [
      bundle.pythonExecutable,
      '-B',
      FAKE_APP_SERVER,
      journalPath,
      nativeChildPidPath,
    ],
    journalPath,
    nativeChildPidPath,
  })
}

async function startNativeContextHarness(
  label: string,
  runProbe: NativeContextProbeRunner,
): Promise<
  SpawnedCodexChatRuntime & {
    readonly workspace: string
    readonly environment: {
      readonly home: string
      readonly codexHome: string
      readonly codexSqliteHome: string
      readonly tempDirectory: string
    }
  }
> {
  const root = await mkdtemp(
    join(tmpdir(), `ay-ple-node-native-context-${label}-`),
  )
  roots.push(root)
  const workspace = join(root, 'workspace')
  await mkdir(workspace)
  const environment = await createEnvironmentRoots(root)
  const journalPath = join(root, 'journal.json')
  const nativeChildPidPath = join(root, 'native-child.pid')
  const spawned = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    application: {
      name: 'ay-ple',
      title: 'AY-PLE',
      version: '0.1.0-preview.1',
    },
    environment,
    nativeContextProbeRunnerOverride: runProbe,
    launchArgsOverride: [
      bundle.pythonExecutable,
      '-B',
      FAKE_APP_SERVER,
      journalPath,
      nativeChildPidPath,
    ],
    journalPath,
    nativeChildPidPath,
  })
  return Object.assign(spawned, {
    workspace: await realpath(workspace),
    environment,
  })
}

async function startSyntheticHarness(
  label: string,
  scenario: string,
  budgets?: {
    operationMaxFrames: number
    operationMaxBytes: number
    aggregateMaxFrames: number
    aggregateMaxBytes: number
  },
) {
  const workspace = await mkdtemp(join(tmpdir(), `ay-ple-node-${label}-`))
  roots.push(workspace)
  const environment = await createEnvironmentRoots(workspace)
  const processJournalPath = join(workspace, 'process-journal.json')
  const harness = await startVerifiedCodexChatRuntime({
    bundle,
    workspace,
    environment,
    budgets,
    bridgeEntrypointOverride: FAKE_NODE_WORKER,
    bridgeArgsOverride: [
      `--scenario=${scenario}`,
      `--process-journal=${processJournalPath}`,
    ],
    deadlines: {
      responseMs: 250,
      terminateMs: 50,
      postKillMs: 250,
    },
  })
  return { harness, processJournalPath }
}

async function startInjectedMutation(
  harness: SpawnedCodexChatRuntime,
  operation: 'thread/start' | 'turn/start' | 'turn/interrupt',
  response: Record<string, unknown>,
): Promise<unknown> {
  if (operation === 'thread/start') {
    await injectNativeResponse(harness, operation, response)
    return harness.runtime.startThread()
  }

  const { threadId } = await harness.runtime.startThread()
  if (operation === 'turn/start') {
    await injectNativeResponse(harness, operation, response)
    return harness.runtime.startTurn({
      threadId,
      text: 'injected mutation response',
    })
  }

  const turn = await harness.runtime.startTurn({ threadId, text: 'hold' })
  await injectNativeResponse(harness, operation, response)
  return harness.runtime.interrupt({ threadId, turnId: turn.turnId })
}

async function injectNativeResponse(
  harness: SpawnedCodexChatRuntime,
  method: string,
  response: Record<string, unknown>,
): Promise<void> {
  await writeFile(
    join(dirname(harness.journalPath), 'injected-response.json'),
    JSON.stringify({ method, response }),
  )
}

function bridgeEventFrame(bridgeRequestId: string, delta: string): Buffer {
  return Buffer.from(
    `${JSON.stringify({
      type: 'event',
      bridgeRequestId,
      event: {
        type: 'agent_message.delta',
        threadId: 'thread-1',
        turnId: 'turn-1',
        itemId: 'item-1',
        delta,
      },
    })}\n`,
    'utf8',
  )
}

async function createEnvironmentRoots(_root: string) {
  const environmentRoot = await mkdtemp(
    join(tmpdir(), 'ay-ple-node-runtime-environment-'),
  )
  roots.push(environmentRoot)
  const environment = {
    home: join(environmentRoot, 'runtime-home'),
    codexHome: join(environmentRoot, 'codex-home'),
    codexSqliteHome: join(environmentRoot, 'codex-sqlite-home'),
    tempDirectory: join(environmentRoot, 'runtime-temp'),
  }
  await Promise.all(
    Object.values(environment).map((directory) =>
      mkdir(directory, { recursive: true }),
    ),
  )
  const [home, codexHome, codexSqliteHome, tempDirectory] = await Promise.all([
    realpath(environment.home),
    realpath(environment.codexHome),
    realpath(environment.codexSqliteHome),
    realpath(environment.tempDirectory),
  ])
  return { home, codexHome, codexSqliteHome, tempDirectory }
}

async function createOwnerOnlyEnvironmentRoots(root: string) {
  const environment = {
    home: join(root, 'runtime-home'),
    codexHome: join(root, 'codex-home'),
    codexSqliteHome: join(root, 'codex-sqlite-home'),
    tempDirectory: join(root, 'runtime-temp'),
  }
  await Promise.all(
    Object.values(environment).map((directory) =>
      mkdir(directory, { mode: 0o700 }),
    ),
  )
  const [home, codexHome, codexSqliteHome, tempDirectory] = await Promise.all([
    realpath(environment.home),
    realpath(environment.codexHome),
    realpath(environment.codexSqliteHome),
    realpath(environment.tempDirectory),
  ])
  return { home, codexHome, codexSqliteHome, tempDirectory }
}

 function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolvePromise!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve: resolvePromise,
  }
}

 async function readAppServerJournal(path: string): Promise<{
  messages: readonly {
    readonly method?: string
    readonly params?: Readonly<Record<string, unknown>>
  }[]
}> {
  return JSON.parse(await readFile(path, 'utf8')) as {
    messages: readonly {
      readonly method?: string
      readonly params?: Readonly<Record<string, unknown>>
    }[]
  }
}

async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = []
  for await (const value of values) collected.push(value)
  return collected
}

function productTurnInput(threadId: string) {
  return {
    threadId,
    permissionProfile: 'workspace_write' as const,
    text: 'Review staged Markdown at /staged/assignment.md',
  }
}

async function readUntilUserInput(
  iterator: AsyncIterator<CodexProductActivity>,
): Promise<{
  requested: Extract<
    CodexProductActivity,
    { type: 'user_input.requested' }
  >
  events: CodexProductActivity[]
}> {
  const events: CodexProductActivity[] = []
  while (true) {
    const next = await within(iterator.next())
    if (next.done) throw new Error('Product turn ended before user input')
    events.push(next.value)
    if (next.value.type === 'user_input.requested') {
      return { requested: next.value, events }
    }
  }
}

async function collectIterator<T>(iterator: AsyncIterator<T>): Promise<T[]> {
  const events: T[] = []
  while (true) {
    const next = await within(iterator.next())
    if (next.done) return events
    events.push(next.value)
  }
}

async function readUntilUserInputResolved(
  iterator: AsyncIterator<CodexProductActivity>,
  events: CodexProductActivity[],
): Promise<void> {
  while (true) {
    const next = await iterator.next()
    if (next.done) throw new Error('Product turn ended before user input resolved')
    events.push(next.value)
    if (next.value.type === 'user_input.resolved') return
  }
}

async function within<T>(value: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      value,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error('operation did not settle')),
          1_000,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function assertPending(value: Promise<unknown>): Promise<void> {
  const settled = await Promise.race([
    value.then(() => true),
    new Promise<false>((resolvePromise) =>
      setTimeout(() => resolvePromise(false), 40),
    ),
  ])
  assert.equal(settled, false)
}

async function waitForJournalMethod(path: string, method: string): Promise<void> {
  await waitForJournalMessage(
    path,
    `method ${method}`,
    (message) => message.method === method,
  )
}

async function waitForJournalUserInputResponse(path: string): Promise<void> {
  await waitForJournalMessage(
    path,
    'native user-input response',
    (message) =>
      typeof message.id === 'string' &&
      message.id.startsWith('user-input-') &&
      message.method === undefined &&
      message.result !== undefined,
  )
}

async function waitForJournalMessage(
  path: string,
  description: string,
  predicate: (message: {
    id?: unknown
    method?: unknown
    result?: unknown
  }) => boolean,
): Promise<void> {
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    try {
      const value = JSON.parse(await readFile(path, 'utf8')) as {
        messages?: Array<{
          id?: unknown
          method?: unknown
          result?: unknown
        }>
      }
      if (value.messages?.some(predicate)) return
    } catch {
      // The fake publishes its journal atomically; absence is expected while polling.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Timed out waiting for ${description}`)
}

async function waitForPidExit(path: string): Promise<void> {
  const pid = Number(await readFile(path, 'utf8'))
  const deadline = Date.now() + 3_000
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return
      throw error
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Native fake child ${pid} did not exit`)
}

async function killNativeChild(path: string): Promise<void> {
  const pid = Number(await readFile(path, 'utf8'))
  process.kill(pid, 'SIGKILL')
}

async function readProcessJournal(path: string): Promise<{
  commands: Array<{ command?: string }>
  descendantPid: number
  processGroupId: number
  workerPid: number
}> {
  const deadline = Date.now() + 1_000
  while (Date.now() < deadline) {
    try {
      return JSON.parse(await readFile(path, 'utf8')) as {
        commands: Array<{ command?: string }>
        descendantPid: number
        processGroupId: number
        workerPid: number
      }
    } catch {
      await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
    }
  }
  throw new Error('Timed out waiting for the process journal')
}

async function waitForProcessJournalCommandCount(
  path: string,
  count: number,
): Promise<void> {
  const deadline = Date.now() + 1_000
  while (Date.now() < deadline) {
    const journal = await readProcessJournal(path)
    if (journal.commands.length >= count) return
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Timed out waiting for ${count} bridge commands`)
}

async function waitForProcessGroupExit(processGroupId: number): Promise<void> {
  const deadline = Date.now() + 1_000
  while (Date.now() < deadline) {
    try {
      process.kill(-processGroupId, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return
      throw error
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Process group ${processGroupId} did not disappear`)
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

async function waitForProcessExit(pid: number): Promise<void> {
  const deadline = Date.now() + 1_000
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return
      throw error
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10))
  }
  throw new Error(`Process ${pid} did not disappear`)
}
