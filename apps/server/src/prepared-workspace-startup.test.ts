import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'

import {
  INTERACTION_BROKER_PROTOCOL_VERSION,
} from '@ay-ple/interaction-mcp'
import type { ProductWorkspaceLifecycle } from '@ay-ple/product-contract'
import {
  createInitialSemesterWorkspaceStateV4,
  encodeSemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'
import express from 'express'

import { createInteractionBroker } from './interaction-broker.js'
import {
  PreparedWorkspaceStartupError,
  startPreparedWorkspace,
  type PreparedWorkspaceRuntimeGeneration,
  type PreparedWorkspaceStartupPorts,
  type PreparedWorkspaceStartupStage,
} from './prepared-workspace-startup.js'
import { bindServerApplicationListener } from './server-listener.js'
import {
  createWorkspaceRegistryStore,
  type WorkspaceRegistryStore,
} from './workspace-registry.js'

const execFileAsync = promisify(execFile)
const previousWorkspaceId =
  'workspace_0123456789abcdef0123456789abcdef'
const targetWorkspaceId =
  'workspace_fedcba9876543210fedcba9876543210'
const previousWorkspace = {
  workspaceId: previousWorkspaceId,
  term: { key: 'fall', displayName: '2학기' },
} as const
const targetWorkspace = {
  workspaceId: targetWorkspaceId,
  term: { key: 'spring', displayName: '1학기' },
} as const
let harnessGeneration = 0
const registryRelativePath = path.join(
  'state',
  'workspace-registry.json',
)

test('real shared listener and Broker authenticate one generation before active publication', async () => {
  const fixture = await createFixture()
  const terminal = deferred<void>()
  let readLifecycle: () => unknown = () => undefined
  try {
    const app = express()
    app.get('/api/product/workspace-lifecycle', (_request, response) => {
      response.json(readLifecycle())
    })
    const listener = await bindServerApplicationListener({
      host: '127.0.0.1',
      port: 0,
      requestHandler: app,
    })
    const ports: PreparedWorkspaceStartupPorts = {
      async bindSharedListener(input) {
        readLifecycle = input.readLifecycle
        return {
          port: listener.port,
          async close() {
            const result = await listener.close({
              signal: new AbortController().signal,
            })
            assert.equal(result.status, 'closed')
          },
        }
      },
      async prepareBrokerGeneration(input) {
        const broker = await createInteractionBroker({
          workspaceRoot: input.canonicalRoot,
          activeProductTurn: () => undefined,
          uiAdapter: { publish: () => undefined },
        })
        app.use('/api/_private/interaction-mcp', broker.router)
        const credentials = broker.credentials()
        return {
          childEnvironment: {
            AY_PLE_INTERACTION_BROKER_URL:
              `http://127.0.0.1:${input.listenerPort}/api/_private/interaction-mcp`,
            AY_PLE_INTERACTION_BROKER_TOKEN: credentials.token,
            AY_PLE_INTERACTION_RUNTIME_BINDING: credentials.binding,
          },
          runtimeTerminal: () => broker.runtimeTerminal(),
          adapterLost: () => broker.adapterLost(),
          appShutdown: () => broker.appShutdown(),
        }
      },
      async spawnWorkspaceRuntime(input) {
        return {
          terminal: terminal.promise,
          async loadNativeProjectConfig() {
            await mkdir(path.join(input.canonicalRoot, '.codex'), {
              recursive: true,
            })
            await writeFile(
              path.join(input.canonicalRoot, '.codex', 'config.toml'),
              [
                '[mcp_servers.ay_ple_interaction]',
                'required = true',
                'enabled_tools = ["propose_state_patch"]',
                '',
              ].join('\n'),
              'utf8',
            )
          },
          async startWorkspaceThread() {
            const response = await fetch(
              input.childEnvironment.AY_PLE_INTERACTION_BROKER_URL,
              {
                method: 'POST',
                headers: {
                  authorization:
                    `Bearer ${input.childEnvironment.AY_PLE_INTERACTION_BROKER_TOKEN}`,
                  'content-type': 'application/json',
                  'x-ay-ple-runtime-binding':
                    input.childEnvironment.AY_PLE_INTERACTION_RUNTIME_BINDING,
                },
                body: JSON.stringify({
                  protocolVersion:
                    INTERACTION_BROKER_PROTOCOL_VERSION,
                  kind: 'handshake',
                  serverName: 'ay_ple_interaction',
                  capabilities: ['propose_state_patch'],
                }),
              },
            )
            assert.equal(response.status, 200)
            assert.deepEqual(await response.json(), {
              protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
              kind: 'handshake_accepted',
            })
            return { threadId: 'thread/real-broker' }
          },
          async waitForRequiredMcp(input) {
            assert.equal(input.serverName, 'ay_ple_interaction')
            assert.deepEqual(input.expectedTools, [
              'propose_state_patch',
            ])
          },
          async confirmThreadContext(input) {
            assert.equal(
              (
                await execFileAsync('git', [
                  '-C',
                  input.canonicalRoot,
                  'rev-parse',
                  '--show-toplevel',
                ])
              ).stdout.trim(),
              input.canonicalRoot,
            )
            assert.equal(input.workspaceId, targetWorkspaceId)
          },
          async close() {},
        }
      },
    }
    const session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.targetRoot,
      ports,
    })

    const response = await fetch(
      `http://127.0.0.1:${listener.port}/api/product/workspace-lifecycle`,
    )
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), session.lifecycle)
    await session.close()
  } finally {
    await fixture.cleanup()
  }
})

test('opens the active surface only after the exact required startup order and registry commit', async () => {
  const fixture = await createFixture()
  try {
    const harness = createHarness()
    const registry = recordingRegistry(
      fixture.store,
      harness.events,
      () => {
        assert.equal(harness.readLifecycle?.().state, 'starting')
      },
    )
    const session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.targetRoot,
      ports: harness.ports,
      registryStore: registry,
    })
    assert.deepEqual(harness.readLifecycle?.(), session.lifecycle)

    assert.deepEqual(harness.events, [
      'listener.bind',
      'broker.prepare',
      'runtime.spawn',
      'config.load',
      'adapter.handshake',
      'roster.ready',
      'context.confirm',
      'registry.commit',
      'surface.active',
    ])
    assert.deepEqual(session.lifecycle, {
      state: 'active',
      workspace: {
        workspaceId: targetWorkspaceId,
        semester: {
          yearLevel: 2,
          term: { key: 'spring', displayName: '1학기' },
        },
        label: '2학년 1학기',
      },
    })
    const publicBytes = JSON.stringify(session.lifecycle)
    assert.equal(publicBytes.includes(fixture.targetRoot), false)
    assert.equal(publicBytes.includes('broker-token'), false)
    assert.equal(publicBytes.includes('thread/native'), false)
    assert.equal(
      (await fixture.store.resolveActiveWorkspace()).status,
      'available',
    )

    await session.close()
    assert.deepEqual(harness.events.slice(-3), [
      'broker.shutdown',
      'runtime.close',
      'listener.close',
    ])
  } finally {
    await fixture.cleanup()
  }
})

test('Runtime terminal during the registry transaction restores the previous pointer without active publication', async () => {
  const fixture = await createFixture()
  try {
    const before = await registryBytes(fixture.appDataRoot)
    const harness = createHarness()
    const registry = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
      async fault(point) {
        if (point === 'before_final_compare') {
          harness.terminal.resolve()
        }
      },
    })

    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: fixture.targetRoot,
        ports: harness.ports,
        registryStore: registry,
      }),
      (error: unknown) =>
        error instanceof PreparedWorkspaceStartupError &&
        error.stage === 'registry_transaction',
    )
    await waitFor(() => harness.events.includes('listener.close'))
    assert.equal(harness.readLifecycle?.().state, 'recovery_required')
    assert.deepEqual(await registryBytes(fixture.appDataRoot), before)
  } finally {
    await fixture.cleanup()
  }
})

test('explicit first open and registry reopen pass the same readiness gate with fresh generations', async () => {
  const fixture = await createFixture()
  try {
    const first = createHarness()
    const firstSession = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.targetRoot,
      ports: first.ports,
    })
    await firstSession.close()

    const reopened = createHarness()
    const reopenedSession = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      ports: reopened.ports,
    })

    assert.deepEqual(
      startupGate(reopened.events),
      startupGate(first.events),
    )
    assert.notEqual(
      reopened.childEnvironment.AY_PLE_INTERACTION_BROKER_TOKEN,
      first.childEnvironment.AY_PLE_INTERACTION_BROKER_TOKEN,
    )
    assert.notEqual(reopened.threadId, first.threadId)
    assert.equal(
      reopened.runtimeInput?.canonicalRoot,
      fixture.targetRoot,
    )
    await reopenedSession.close()
  } finally {
    await fixture.cleanup()
  }
})

test('a failed explicit relaunch preserves the previous pointer for a fresh no-argument reopen', async () => {
  const fixture = await createFixture()
  try {
    const before = await registryBytes(fixture.appDataRoot)
    const failed = createHarness({ fault: 'roster' })
    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: fixture.targetRoot,
        ports: failed.ports,
      }),
      PreparedWorkspaceStartupError,
    )
    assert.deepEqual(await registryBytes(fixture.appDataRoot), before)

    const reopened = createHarness({ expectedWorkspaceId: previousWorkspaceId })
    const session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      ports: reopened.ports,
    })
    assert.equal(reopened.runtimeInput?.canonicalRoot, fixture.previousRoot)
    assert.equal(session.lifecycle.workspace.workspaceId, previousWorkspaceId)
    assert.notEqual(reopened.threadId, failed.threadId)
    assert.notEqual(
      reopened.childEnvironment.AY_PLE_INTERACTION_BROKER_TOKEN,
      failed.childEnvironment.AY_PLE_INTERACTION_BROKER_TOKEN,
    )
    await session.close()
  } finally {
    await fixture.cleanup()
  }
})

test('an unavailable registered root projects path-free workspace recovery before any Runtime start', async () => {
  const fixture = await createFixture()
  try {
    await rm(fixture.previousRoot, { recursive: true })
    const harness = createHarness()
    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        ports: harness.ports,
      }),
      (error: unknown) => {
        assert.ok(error instanceof PreparedWorkspaceStartupError)
        assert.equal(error.stage, 'prepared_root_validation')
        assert.deepEqual(error.lifecycle, {
          state: 'recovery_required',
          workspace: {
            availability: 'unavailable',
            workspaceId: previousWorkspaceId,
            label: '등록된 학기 작업공간',
          },
          reason: 'workspace_unavailable',
          displayMessage:
            'The registered SemesterWorkspace is unavailable. Check the prepared workspace before restarting AY-PLE.',
        })
        assert.equal(JSON.stringify(error.lifecycle).includes(fixture.root), false)
        return true
      },
    )
    assert.deepEqual(harness.events, [])
  } finally {
    await fixture.cleanup()
  }
})

for (const [name, stage, fault] of [
  ['listener bind', 'shared_listener', 'listener'],
  ['Broker generation bind', 'broker_generation', 'broker'],
  ['Runtime spawn', 'workspace_runtime', 'runtime'],
  ['native project config load', 'native_project_config', 'config'],
  ['authenticated Adapter handshake', 'adapter_handshake', 'handshake'],
  ['required MCP roster', 'required_tool_roster', 'roster'],
  ['thread cwd and identity', 'thread_context', 'context'],
  ['registry transaction', 'registry_transaction', 'registry'],
] as const satisfies readonly [
  string,
  PreparedWorkspaceStartupStage,
  HarnessFault,
][]) {
  test(`${name} failure preserves the previous active pointer and never opens Chat`, async () => {
    const fixture = await createFixture()
    try {
      const before = await registryBytes(fixture.appDataRoot)
      const harness = createHarness({ fault })
      const registry =
        fault === 'registry'
          ? failingRegistry(fixture.store, harness.events)
          : recordingRegistry(fixture.store, harness.events)

      await assert.rejects(
        startPreparedWorkspace({
          appDataRoot: fixture.appDataRoot,
          explicitWorkspaceRoot: fixture.targetRoot,
          ports: harness.ports,
          registryStore: registry,
        }),
        (error: unknown) => {
          assert.ok(error instanceof PreparedWorkspaceStartupError)
          assert.equal(error.stage, stage)
          assert.equal(error.lifecycle?.reason, 'runtime_unavailable')
          return true
        },
      )

      assert.equal(harness.events.includes('surface.active'), false)
      assert.deepEqual(
        await registryBytes(fixture.appDataRoot),
        before,
      )
      assert.equal(
        (await fixture.store.resolveActiveWorkspace()).status,
        'available',
      )
      if (
        fault === 'listener' ||
        fault === 'broker'
      ) {
        assert.equal(harness.events.includes('runtime.spawn'), false)
      }
    } finally {
      await fixture.cleanup()
    }
  })
}

for (const reason of [
  'missing',
  'disabled',
  'ignored',
  'wrong_roster',
  'stale_generation',
] as const) {
  test(`${reason} required server state is a safe roster failure`, async () => {
    const fixture = await createFixture()
    try {
      const before = await registryBytes(fixture.appDataRoot)
      const harness = createHarness({
        fault: 'roster',
        rosterReason: reason,
      })
      await assert.rejects(
        startPreparedWorkspace({
          appDataRoot: fixture.appDataRoot,
          explicitWorkspaceRoot: fixture.targetRoot,
          ports: harness.ports,
        }),
        (error: unknown) =>
          error instanceof PreparedWorkspaceStartupError &&
          error.stage === 'required_tool_roster',
      )
      assert.equal(harness.events.includes('surface.active'), false)
      assert.deepEqual(
        await registryBytes(fixture.appDataRoot),
        before,
      )
    } finally {
      await fixture.cleanup()
    }
  })
}

test('fresh identity drift after readiness blocks the registry transaction', async () => {
  const fixture = await createFixture()
  try {
    const before = await registryBytes(fixture.appDataRoot)
    const harness = createHarness({
      afterRoster: async () => {
        await writeWorkspaceIdentity(fixture.targetRoot, {
          workspaceId: previousWorkspaceId,
          term: { key: 'drifted', displayName: '바뀐 학기' },
        })
      },
    })
    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: fixture.targetRoot,
        ports: harness.ports,
      }),
      (error: unknown) =>
        error instanceof PreparedWorkspaceStartupError &&
        error.stage === 'thread_context',
    )
    assert.deepEqual(await registryBytes(fixture.appDataRoot), before)
    assert.equal(harness.events.includes('context.confirm'), false)
  } finally {
    await fixture.cleanup()
  }
})

test('identity replacement at the registry compare boundary preserves the previous pointer', async () => {
  const fixture = await createFixture()
  try {
    const before = await registryBytes(fixture.appDataRoot)
    const harness = createHarness()
    const swappingStore = createWorkspaceRegistryStore({
      appDataRoot: fixture.appDataRoot,
      async fault(point) {
        if (point !== 'before_final_compare') return
        await writeWorkspaceIdentity(fixture.targetRoot, {
          workspaceId: previousWorkspaceId,
          term: { key: 'drifted', displayName: '바뀐 학기' },
        })
      },
    })

    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: fixture.targetRoot,
        ports: harness.ports,
        registryStore: swappingStore,
      }),
      (error: unknown) =>
        error instanceof PreparedWorkspaceStartupError &&
        error.stage === 'registry_transaction',
    )
    assert.deepEqual(await registryBytes(fixture.appDataRoot), before)
    assert.equal(harness.readLifecycle?.().state, 'recovery_required')
  } finally {
    await fixture.cleanup()
  }
})

test('root validation fails before listener, Broker, Runtime, or registry mutation', async () => {
  const fixture = await createFixture()
  try {
    const before = await registryBytes(fixture.appDataRoot)
    const harness = createHarness()
    await assert.rejects(
      startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: path.join(fixture.root, 'missing'),
        ports: harness.ports,
      }),
      (error: unknown) => {
        assert.ok(error instanceof PreparedWorkspaceStartupError)
        assert.equal(error.stage, 'prepared_root_validation')
        assert.equal(
          error.launchFailure?.code,
          'prepared_workspace_invalid',
        )
        return true
      },
    )
    assert.deepEqual(harness.events, [])
    assert.deepEqual(await registryBytes(fixture.appDataRoot), before)
  } finally {
    await fixture.cleanup()
  }
})

test('Runtime terminal, Adapter loss, and shutdown revoke one generation and bound teardown', async () => {
  for (const reason of [
    'runtime_terminal',
    'adapter_lost',
    'shutdown',
  ] as const) {
    const fixture = await createFixture()
    try {
      const harness = createHarness()
      const session = await startPreparedWorkspace({
        appDataRoot: fixture.appDataRoot,
        explicitWorkspaceRoot: fixture.targetRoot,
        ports: harness.ports,
      })
      if (reason === 'runtime_terminal') {
        harness.terminal.resolve()
        await waitFor(
          () => harness.events.includes('listener.close'),
        )
      } else if (reason === 'adapter_lost') {
        await session.adapterLost()
      } else {
        await session.close()
      }

      if (reason !== 'shutdown') {
        assert.deepEqual(session.readLifecycle(), {
          state: 'recovery_required',
          workspace: {
            availability: 'available',
            ...session.lifecycle.workspace,
          },
          reason: 'runtime_unavailable',
          displayMessage:
            'The workspace Runtime is unavailable. Restart AY-PLE after checking the prepared workspace.',
        })
      }
      const brokerEvent =
        reason === 'runtime_terminal'
          ? 'broker.runtime-terminal'
          : reason === 'adapter_lost'
            ? 'broker.adapter-lost'
            : 'broker.shutdown'
      assert.equal(harness.events.includes(brokerEvent), true)
      assert.equal(
        harness.events.filter((event) => event === 'runtime.close')
          .length,
        1,
      )
      assert.equal(
        harness.events.filter((event) => event === 'listener.close')
          .length,
        1,
      )
    } finally {
      await fixture.cleanup()
    }
  }
})

test('cleanup deadline still attempts Runtime and listener teardown after a stalled Broker', async () => {
  const fixture = await createFixture()
  try {
    const harness = createHarness({ hangBrokerCleanup: true })
    const session = await startPreparedWorkspace({
      appDataRoot: fixture.appDataRoot,
      explicitWorkspaceRoot: fixture.targetRoot,
      ports: harness.ports,
      cleanupDeadlineMs: 20,
    })

    await assert.rejects(session.close(), AggregateError)
    await waitFor(
      () =>
        harness.events.includes('runtime.close') &&
        harness.events.includes('listener.close'),
    )
  } finally {
    await fixture.cleanup()
  }
})

type HarnessFault =
  | 'listener'
  | 'broker'
  | 'runtime'
  | 'config'
  | 'handshake'
  | 'roster'
  | 'context'
  | 'registry'

function createHarness(
  options: {
    readonly fault?: Exclude<HarnessFault, 'registry'>
    readonly rosterReason?: string
    readonly afterRoster?: () => void | Promise<void>
    readonly hangBrokerCleanup?: boolean
    readonly expectedWorkspaceId?: string
  } = {},
): {
  readonly events: string[]
  readonly ports: PreparedWorkspaceStartupPorts
  readonly terminal: Deferred<void>
  readonly childEnvironment: Record<string, string>
  readonly threadId: string
  readLifecycle?: () => ProductWorkspaceLifecycle
  runtimeInput?: {
    readonly canonicalRoot: string
  }
} {
  const events: string[] = []
  const terminal = deferred<void>()
  const generation = (++harnessGeneration)
    .toString(16)
    .padStart(32, '0')
  const childEnvironment = {
    AY_PLE_INTERACTION_BROKER_URL:
      'http://127.0.0.1:38123/api/_private/interaction-mcp',
    AY_PLE_INTERACTION_BROKER_TOKEN: `broker-token-${generation}`,
    AY_PLE_INTERACTION_RUNTIME_BINDING:
      `runtime_${generation.padEnd(32, '0').slice(0, 32)}`,
  }
  const threadId = `thread/${generation}`
  const result: ReturnType<typeof createHarness> = {
    events,
    terminal,
    childEnvironment,
    threadId,
    ports: {
      async bindSharedListener(input) {
        events.push('listener.bind')
        if (options.fault === 'listener') throw new Error('listener fault')
        result.readLifecycle = () => {
          const lifecycle = input.readLifecycle()
          if (lifecycle.state === 'active') events.push('surface.active')
          return lifecycle
        }
        return {
          port: 38123,
          async close() {
            events.push('listener.close')
          },
        }
      },
      async prepareBrokerGeneration() {
        events.push('broker.prepare')
        if (options.fault === 'broker') throw new Error('broker fault')
        return {
          childEnvironment,
          async runtimeTerminal() {
            result.readLifecycle?.()
            events.push('broker.runtime-terminal')
            if (options.hangBrokerCleanup) await never()
          },
          async adapterLost() {
            events.push('broker.adapter-lost')
            if (options.hangBrokerCleanup) await never()
          },
          async appShutdown() {
            events.push('broker.shutdown')
            if (options.hangBrokerCleanup) await never()
          },
        }
      },
      async spawnWorkspaceRuntime(input) {
        events.push('runtime.spawn')
        if (options.fault === 'runtime') throw new Error('runtime fault')
        result.runtimeInput = {
          canonicalRoot: input.canonicalRoot,
        }
        assert.deepEqual(input.childEnvironment, childEnvironment)
        return {
          terminal: terminal.promise,
          async loadNativeProjectConfig() {
            events.push('config.load')
            if (options.fault === 'config') throw new Error('config fault')
          },
          async startWorkspaceThread() {
            events.push('adapter.handshake')
            if (options.fault === 'handshake') {
              throw new Error('handshake fault')
            }
            return { threadId }
          },
          async waitForRequiredMcp(input) {
            events.push('roster.ready')
            assert.equal(input.serverName, 'ay_ple_interaction')
            assert.deepEqual(input.expectedTools, [
              'propose_state_patch',
            ])
            if (options.fault === 'roster') {
              throw new Error(
                `roster fault: ${options.rosterReason ?? 'unknown'}`,
              )
            }
            await options.afterRoster?.()
          },
          async confirmThreadContext(input) {
            events.push('context.confirm')
            assert.equal(input.threadId, threadId)
            assert.equal(input.canonicalRoot, result.runtimeInput?.canonicalRoot)
            assert.equal(
              input.workspaceId,
              options.expectedWorkspaceId ?? targetWorkspaceId,
            )
            if (options.fault === 'context') {
              throw new Error('context fault')
            }
          },
          async close() {
            events.push('runtime.close')
          },
        } satisfies PreparedWorkspaceRuntimeGeneration
      },
    },
  }
  return result
}

function recordingRegistry(
  store: WorkspaceRegistryStore,
  events: string[],
  beforeCommit?: () => void | Promise<void>,
): WorkspaceRegistryStore {
  return registryWithCommit(store, async (input) => {
    await beforeCommit?.()
    events.push('registry.commit')
    return store.commitActiveWorkspace(input)
  })
}

function failingRegistry(
  store: WorkspaceRegistryStore,
  events: string[],
): WorkspaceRegistryStore {
  return registryWithCommit(store, async () => {
    events.push('registry.commit')
    throw new Error('registry fault')
  })
}

function registryWithCommit(
  store: WorkspaceRegistryStore,
  commitActiveWorkspace: WorkspaceRegistryStore['commitActiveWorkspace'],
): WorkspaceRegistryStore {
  return {
    read: () => store.read(),
    compareAndReplace: (input) => store.compareAndReplace(input),
    resolveActiveWorkspace: () => store.resolveActiveWorkspace(),
    commitActiveWorkspace,
  }
}

function startupGate(events: readonly string[]): readonly string[] {
  return events.filter((event) =>
    [
      'listener.bind',
      'broker.prepare',
      'runtime.spawn',
      'config.load',
      'adapter.handshake',
      'roster.ready',
      'context.confirm',
      'surface.active',
    ].includes(event),
  )
}

async function createFixture(): Promise<{
  readonly root: string
  readonly appDataRoot: string
  readonly previousRoot: string
  readonly targetRoot: string
  readonly store: WorkspaceRegistryStore
  cleanup(): Promise<void>
}> {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'prepared-startup-test-')),
  )
  const appDataRoot = path.join(root, 'app-data')
  const previousRoot = path.join(root, 'previous')
  const targetRoot = path.join(root, 'target')
  await Promise.all([
    mkdir(appDataRoot),
    prepareWorkspace(
      previousRoot,
      previousWorkspace,
    ),
    prepareWorkspace(
      targetRoot,
      targetWorkspace,
    ),
  ])
  const store = createWorkspaceRegistryStore({ appDataRoot })
  const committed = await store.commitActiveWorkspace({
    expectedAuthority: null,
    canonicalRoot: previousRoot,
    expectedWorkspaceId: previousWorkspaceId,
  })
  assert.equal(committed.status, 'written')
  return {
    root,
    appDataRoot,
    previousRoot,
    targetRoot,
    store,
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

async function prepareWorkspace(
  root: string,
  identity: WorkspaceFixtureIdentity,
): Promise<void> {
  await mkdir(root)
  await execFileAsync('git', ['init', '--quiet', root])
  await writeWorkspaceIdentity(root, identity)
}

async function writeWorkspaceIdentity(
  root: string,
  identity: WorkspaceFixtureIdentity,
): Promise<void> {
  await writeFile(
    path.join(root, 'workspace-state.json'),
    encodeSemesterWorkspaceStateV4(
      createInitialSemesterWorkspaceStateV4({
        workspaceId: identity.workspaceId,
        semester: {
          yearLevel: 2,
          term: identity.term,
        },
      }),
    ),
  )
}

async function registryBytes(appDataRoot: string): Promise<Buffer> {
  return readFile(path.join(appDataRoot, registryRelativePath))
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error('Timed out waiting for cleanup')
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

function never(): Promise<never> {
  return new Promise(() => undefined)
}

type Deferred<T> = {
  readonly promise: Promise<T>
  readonly resolve: (value: T | PromiseLike<T>) => void
}

type WorkspaceFixtureIdentity = {
  readonly workspaceId: string
  readonly term: {
    readonly key: string
    readonly displayName: string
  }
}
