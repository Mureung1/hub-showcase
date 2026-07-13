import assert from 'node:assert/strict'
import { access, realpath } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import {
  HeadlessCodexClientHost,
  HeadlessCodexClientHostError,
  HeadlessCodexClientHostSubscriptionError,
} from './index.js'
import { withFakeHeadlessCodexClientHost } from './testing/fake-headless-codex-client-host.js'

test('HeadlessCodexClientHost initializes one child and publishes an ordered lifecycle', async () => {
  await withFakeHeadlessCodexClientHost({}, async ({
    appDataRoot,
    host,
    packageRoot,
    readJournal,
    tempRoot,
    workspaceRoot,
  }) => {
    assert.ok(host instanceof HeadlessCodexClientHost)
    const subscription = host.subscribe()
    const iterator = subscription.events[Symbol.asyncIterator]()

    assert.deepEqual(subscription.snapshot, {
      status: 'stopped',
      generation: 0,
      failure: null,
      recoverable: false,
    })
    assert.equal(subscription.cursor, 0)

    const starts = [host.start(), host.start(), host.start()]
    assert.strictEqual(starts[0], starts[1])
    assert.strictEqual(starts[1], starts[2])
    await Promise.all(starts)

    assert.deepEqual(host.getSnapshot(), {
      status: 'ready',
      generation: 1,
      failure: null,
      recoverable: false,
    })

    await host.start()
    const stops = [host.stop(), host.stop()]
    assert.strictEqual(stops[0], stops[1])
    await Promise.all(stops)

    const events = []

    while (true) {
      const result = await iterator.next()

      if (result.done) {
        break
      }

      events.push(result.value)
    }

    assert.deepEqual(
      events.map((event) => ({
        generation: event.generation,
        kind: event.kind,
        sequence: event.sequence,
        status: event.snapshot.status,
      })),
      [
        {
          generation: 0,
          kind: 'host_state_changed',
          sequence: 1,
          status: 'starting',
        },
        {
          generation: 1,
          kind: 'host_state_changed',
          sequence: 2,
          status: 'ready',
        },
        {
          generation: 1,
          kind: 'host_state_changed',
          sequence: 3,
          status: 'stopping',
        },
        {
          generation: 1,
          kind: 'host_state_changed',
          sequence: 4,
          status: 'stopped',
        },
      ],
    )
    assert.ok(
      events.every((event) => !Number.isNaN(Date.parse(event.timestamp))),
    )
    assertPublicValueIsSanitized(events, [
      packageRoot,
      appDataRoot,
      workspaceRoot,
      tempRoot,
    ])

    const journal = await readJournal({ minimumEntries: 4 })
    assert.equal(
      journal.filter((entry) => entry.kind === 'version_check').length,
      1,
    )
    const spawn = journal.find((entry) => entry.kind === 'spawn')
    const canonicalAppDataRoot = await realpath(appDataRoot)
    const canonicalWorkspaceRoot = await realpath(workspaceRoot)
    assert.deepEqual(spawn, {
      kind: 'spawn',
      pid: spawn && 'pid' in spawn ? spawn.pid : undefined,
      args: ['app-server', '--listen', 'stdio://'],
      cwd: canonicalWorkspaceRoot,
      codexHome: join(canonicalAppDataRoot, 'codex', 'home'),
      codexSqliteHome: join(canonicalAppDataRoot, 'codex', 'sqlite'),
      ...(process.env.LANG
        ? { inheritedLocale: process.env.LANG }
        : {}),
      githubPatPresent: false,
      tokenLikeMarkerPresent: false,
    })
    assert.deepEqual(
      journal
        .filter((entry) => entry.kind === 'client_message')
        .map((entry) => entry.message),
      [
        {
          id: 1,
          method: 'initialize',
          params: {
            clientInfo: {
              name: 'ay_ple_headless_codex_client_host',
              title: 'AY-PLE Headless Codex Client Host',
              version: '0.0.0',
            },
            capabilities: null,
          },
        },
        { method: 'initialized' },
      ],
    )
  })
})

test('HeadlessCodexClientHost isolates a slow subscriber when its buffer overflows', async () => {
  await withFakeHeadlessCodexClientHost(
    { hostOptions: { subscriptionBufferLimit: 1 } },
    async ({ host }) => {
      const slow = host.subscribe()
      const slowIterator = slow.events[Symbol.asyncIterator]()
      const fast = host.subscribe()
      const fastIterator = fast.events[Symbol.asyncIterator]()
      const fastEventsPromise = readEvents(fastIterator, 2)

      await host.start()

      assert.deepEqual(
        (await fastEventsPromise).map((event) => event.snapshot.status),
        ['starting', 'ready'],
      )
      await assert.rejects(
        slowIterator.next(),
        (error: unknown) => {
          assert.ok(error instanceof HeadlessCodexClientHostSubscriptionError)
          assert.equal(error.code, 'subscription_overflow')
          assertPublicValueIsSanitized(error, [])

          return true
        },
      )
      assert.deepEqual(await slowIterator.next(), {
        done: true,
        value: undefined,
      })
      assert.equal(host.getSnapshot().status, 'ready')

      const converged = host.subscribe()
      assert.equal(converged.snapshot.status, 'ready')
      assert.equal(converged.cursor, 2)
      converged.unsubscribe()
      fast.unsubscribe()
    },
  )
})

test('HeadlessCodexClientHost rejects an invalid layout before spawning a child', async () => {
  await withFakeHeadlessCodexClientHost({}, async ({
    appDataRoot,
    readJournal,
    workspaceRoot,
  }) => {
    const host = new HeadlessCodexClientHost({
      packageRoot: 'relative-package',
      appDataRoot,
      workspaceRoot,
    })

    await assert.rejects(host.start(), (error: unknown) => {
      assert.ok(error instanceof HeadlessCodexClientHostError)
      assert.equal(error.code, 'invalid_root')
      assert.equal(error.recoverable, false)

      return true
    })
    assert.deepEqual(host.getSnapshot(), {
      status: 'failed',
      generation: 0,
      failure: {
        code: 'invalid_root',
        message: 'Product runtime layout validation failed',
      },
      recoverable: false,
    })
    await assert.rejects(host.start(), (error: unknown) => {
      assert.ok(error instanceof HeadlessCodexClientHostError)
      assert.equal(error.code, 'operation_conflict')

      return true
    })
    assert.deepEqual(await readJournal({ minimumEntries: 0 }), [])
    await host.stop()
    await assert.rejects(host.start(), (error: unknown) => {
      assert.ok(error instanceof HeadlessCodexClientHostError)
      assert.equal(error.code, 'operation_conflict')

      return true
    })
    assert.deepEqual(await readJournal({ minimumEntries: 0 }), [])
  })
})

test('HeadlessCodexClientHost classifies initialize and protocol failures without leaking raw errors', async (t) => {
  const cases = [
    {
      name: 'initialize error',
      scenario: 'initialize_error' as const,
      code: 'initialize_error',
      recoverable: true,
      initializeTimeoutMs: 1000,
    },
    {
      name: 'initialize timeout',
      scenario: 'initialize_timeout' as const,
      code: 'initialize_timeout',
      recoverable: true,
      initializeTimeoutMs: 100,
    },
    {
      name: 'malformed initialize response',
      scenario: 'invalid_initialize_response' as const,
      code: 'protocol_error',
      recoverable: false,
      initializeTimeoutMs: 1000,
    },
    {
      name: 'observation queue overflow',
      scenario: 'observation_flood' as const,
      code: 'protocol_error',
      recoverable: false,
      initializeTimeoutMs: 1000,
      maxQueuedObservations: 1,
    },
  ]

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      await withFakeHeadlessCodexClientHost(
        {
          scenario: fixtureCase.scenario,
          hostOptions: {
            initializeTimeoutMs: fixtureCase.initializeTimeoutMs,
            maxQueuedObservations: fixtureCase.maxQueuedObservations,
          },
        },
        async ({ host, readJournal, tempRoot }) => {
          await assert.rejects(host.start(), (error: unknown) => {
            assert.ok(error instanceof HeadlessCodexClientHostError)
            assert.equal(error.code, fixtureCase.code)
            assert.equal(error.recoverable, fixtureCase.recoverable)
            assertPublicValueIsSanitized(error, [tempRoot])

            return true
          })

          const snapshot = host.getSnapshot()
          assert.equal(snapshot.status, 'failed')
          assert.equal(snapshot.generation, 1)
          assert.equal(snapshot.failure?.code, fixtureCase.code)
          assert.equal(snapshot.recoverable, fixtureCase.recoverable)
          assert.equal(
            JSON.stringify(snapshot).includes('fixture initialize error'),
            false,
          )

          const journal = await readJournal({ minimumEntries: 3 })
          assert.equal(
            journal.some(
              (entry) =>
                entry.kind === 'client_message' &&
                entry.message.method === 'initialized',
            ),
            false,
          )
        },
      )
    })
  }
})

test('HeadlessCodexClientHost preserves its startup failure when stop follows the failed event', async () => {
  await withFakeHeadlessCodexClientHost(
    {
      scenario: 'initialize_error',
      ignoreSigterm: true,
      hostOptions: { closeTimeoutMs: 25 },
    },
    async ({ host }) => {
      const subscription = host.subscribe()
      const iterator = subscription.events[Symbol.asyncIterator]()
      const start = host.start()
      void start.catch(() => {})

      assert.deepEqual(
        (await readEvents(iterator, 2)).map((event) => ({
          code: event.snapshot.failure?.code,
          recoverable: event.snapshot.recoverable,
          status: event.snapshot.status,
        })),
        [
          { code: undefined, recoverable: false, status: 'starting' },
          { code: 'initialize_error', recoverable: true, status: 'failed' },
        ],
      )

      const terminalEvents = readEvents(iterator, 2)
      const stop = host.stop()
      await assert.rejects(start, (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'initialize_error')
        assert.equal(error.recoverable, true)

        return true
      })
      await stop
      assert.equal(host.getSnapshot().status, 'stopped')
      assert.deepEqual(
        (await terminalEvents).map((event) => event.snapshot.status),
        ['stopping', 'stopped'],
      )
    },
  )
})

test('HeadlessCodexClientHost lets cleanup timeout supersede its startup failure', async () => {
  await withFakeHeadlessCodexClientHost(
    {
      scenario: 'initialize_error',
      ignoreSigterm: true,
      hostOptions: { closeTimeoutMs: 25 },
      testOptions: { forceKill: () => {} },
    },
    async ({ host }) => {
      const subscription = host.subscribe()
      const iterator = subscription.events[Symbol.asyncIterator]()
      const start = host.start()
      void start.catch(() => {})
      await readEvents(iterator, 2)
      const stop = host.stop()

      await assert.rejects(start, (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'close_timeout')
        assert.equal(error.recoverable, false)

        return true
      })
      await assert.rejects(stop, (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'close_timeout')
        assert.equal(error.recoverable, false)

        return true
      })
      assert.deepEqual(host.getSnapshot(), {
        status: 'failed',
        generation: 1,
        failure: {
          code: 'close_timeout',
          message: 'Codex app-server cleanup could not confirm child termination',
        },
        recoverable: false,
      })
    },
  )
})

test('HeadlessCodexClientHost does not spawn when stop wins during preflight', async () => {
  await withFakeHeadlessCodexClientHost(
    { gateVersionProbe: true },
    async ({ host, readJournal, releaseVersionProbe }) => {
      const subscription = host.subscribe()
      const start = host.start()
      void start.catch(() => {})
      await readJournal({ minimumEntries: 1 })

      await host.stop()
      await releaseVersionProbe()
      await assert.rejects(start, (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'operation_conflict')

        return true
      })

      assert.deepEqual(
        (await drainEvents(subscription.events)).map((event) => ({
          generation: event.generation,
          status: event.snapshot.status,
        })),
        [
          { generation: 0, status: 'starting' },
          { generation: 0, status: 'stopping' },
          { generation: 0, status: 'stopped' },
        ],
      )
      assert.equal(
        (await readJournal()).some((entry) => entry.kind === 'spawn'),
        false,
      )
    },
  )
})

test('HeadlessCodexClientHost does not initialize when stop wins spawn settlement', async () => {
  await withFakeHeadlessCodexClientHost(
    { gateStartSettlement: true },
    async ({ host, readJournal, releaseStartSettlement }) => {
      const subscription = host.subscribe()
      const start = host.start()
      void start.catch(() => {})
      await readJournal({ minimumEntries: 2 })

      await host.stop()
      releaseStartSettlement()
      await assert.rejects(start, (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'operation_conflict')

        return true
      })

      assert.deepEqual(
        (await drainEvents(subscription.events)).map((event) => ({
          generation: event.generation,
          status: event.snapshot.status,
        })),
        [
          { generation: 0, status: 'starting' },
          { generation: 0, status: 'stopping' },
          { generation: 0, status: 'stopped' },
        ],
      )
      const journal = await readJournal({ minimumEntries: 2 })
      assert.equal(
        journal.some((entry) => entry.kind === 'client_message'),
        false,
      )
    },
  )
})

test('HeadlessCodexClientHost fences initialize when stop wins after spawn', async () => {
  await withFakeHeadlessCodexClientHost(
    {
      scenario: 'initialize_timeout',
      hostOptions: { initializeTimeoutMs: 1000 },
    },
    async ({ host, readJournal }) => {
      const subscription = host.subscribe()
      const start = host.start()
      void start.catch(() => {})
      await readJournal({ minimumEntries: 3 })

      await host.stop()
      await assert.rejects(start, (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'operation_conflict')

        return true
      })

      assert.deepEqual(
        (await drainEvents(subscription.events)).map((event) => ({
          generation: event.generation,
          status: event.snapshot.status,
        })),
        [
          { generation: 0, status: 'starting' },
          { generation: 1, status: 'stopping' },
          { generation: 1, status: 'stopped' },
        ],
      )
      const journal = await readJournal({ minimumEntries: 3 })
      assert.equal(
        journal.some(
          (entry) =>
            entry.kind === 'client_message' &&
            entry.message.method === 'initialized',
        ),
        false,
      )
    },
  )
})

test('HeadlessCodexClientHost does not consume a generation on async spawn failure', async () => {
  await withFakeHeadlessCodexClientHost(
    { scenario: 'spawn_error' },
    async ({ host, readJournal }) => {
      await assert.rejects(host.start(), (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'spawn_error')
        assert.equal(error.recoverable, true)

        return true
      })
      assert.equal(host.getSnapshot().generation, 0)
      assert.equal(host.getSnapshot().status, 'failed')
      assert.equal(
        (await readJournal()).some((entry) => entry.kind === 'spawn'),
        false,
      )
    },
  )
})

test('HeadlessCodexClientHost captures snapshot and cursor atomically during start', async () => {
  await withFakeHeadlessCodexClientHost({}, async ({ host }) => {
    const start = host.start()
    const subscription = host.subscribe()
    const iterator = subscription.events[Symbol.asyncIterator]()

    assert.equal(subscription.snapshot.status, 'starting')
    assert.equal(subscription.cursor, 1)
    await start

    const ready = await iterator.next()
    assert.equal(ready.done, false)
    assert.equal(ready.value?.sequence, 2)
    assert.equal(ready.value?.snapshot.status, 'ready')
    subscription.unsubscribe()
  })
})

test('HeadlessCodexClientHost waits for the observation consumer before initialize', async () => {
  await withFakeHeadlessCodexClientHost(
    { recordObservationConsumerReady: true },
    async ({ host, readJournal }) => {
      await host.start()
      const journal = await readJournal({ minimumEntries: 5 })
      const consumerIndex = journal.findIndex(
        (entry) => entry.kind === 'observation_consumer_ready',
      )
      const initializeIndex = journal.findIndex(
        (entry) =>
          entry.kind === 'client_message' &&
          entry.message.method === 'initialize',
      )

      assert.notEqual(consumerIndex, -1)
      assert.notEqual(initializeIndex, -1)
      assert.ok(consumerIndex < initializeIndex)
    },
  )
})

test('HeadlessCodexClientHost keeps a subscription open across connection failure', async () => {
  await withFakeHeadlessCodexClientHost(
    { scenario: 'exit_after_ready' },
    async ({ host }) => {
      const subscription = host.subscribe()
      const iterator = subscription.events[Symbol.asyncIterator]()
      const firstEvents = readEvents(iterator, 3)

      await host.start()
      const observed = await firstEvents
      assert.deepEqual(
        observed.map((event) => event.snapshot.status),
        ['starting', 'ready', 'failed'],
      )
      assert.deepEqual(host.getSnapshot(), {
        status: 'failed',
        generation: 1,
        failure: {
          code: 'transport_lost',
          message: 'Codex app-server transport was lost',
        },
        recoverable: true,
      })

      const terminalEvents = readEvents(iterator, 2)
      await host.stop()
      assert.deepEqual(
        (await terminalEvents).map((event) => event.snapshot.status),
        ['stopping', 'stopped'],
      )
      assert.deepEqual(await iterator.next(), {
        done: true,
        value: undefined,
      })
    },
  )
})

test('HeadlessCodexClientHost reuses its validated layout without exposing raw state', async () => {
  await withFakeHeadlessCodexClientHost({}, async ({
    appDataRoot,
    host,
    packageRoot,
    readJournal,
    tempRoot,
    workspaceRoot,
  }) => {
    await host.start()
    const firstSubscription = host.subscribe()
    await host.stop()
    await host.start()
    const secondSubscription = host.subscribe()

    assert.equal(host.getSnapshot().generation, 2)
    const journal = await readJournal({ minimumEntries: 5 })
    assert.equal(
      journal.filter((entry) => entry.kind === 'version_check').length,
      1,
    )
    assert.equal(
      journal.filter((entry) => entry.kind === 'spawn').length,
      2,
    )

    assertPublicValueIsSanitized(firstSubscription.snapshot, [
      packageRoot,
      appDataRoot,
      workspaceRoot,
      tempRoot,
    ])
    assertPublicValueIsSanitized(secondSubscription.snapshot, [
      packageRoot,
      appDataRoot,
      workspaceRoot,
      tempRoot,
    ])
    secondSubscription.unsubscribe()
  })
})

test('HeadlessCodexClientHost preserves an immutable copy of its raw layout input', async () => {
  await withFakeHeadlessCodexClientHost({}, async ({
    appDataRoot,
    packageRoot,
    workspaceRoot,
  }) => {
    const input = { packageRoot, appDataRoot, workspaceRoot }
    const host = new HeadlessCodexClientHost(input)
    input.packageRoot = 'relative-after-construction'
    input.appDataRoot = 'relative-after-construction'
    input.workspaceRoot = 'relative-after-construction'

    try {
      await host.start()
      assert.equal(host.getSnapshot().status, 'ready')
    } finally {
      await host.stop()
    }
  })
})

test('HeadlessCodexClientHost force-kills an unresponsive child before publishing stopped', async () => {
  await withFakeHeadlessCodexClientHost(
    {
      ignoreSigterm: true,
      hostOptions: { closeTimeoutMs: 25 },
    },
    async ({ host, observeProcessExit, readJournal }) => {
      await host.start()
      const spawn = (await readJournal({ minimumEntries: 4 })).find(
        (entry) => entry.kind === 'spawn',
      )
      assert.ok(spawn && 'pid' in spawn)
      await host.stop()
      await observeProcessExit(spawn.pid)

      assert.equal(host.getSnapshot().status, 'stopped')
      assert.equal(
        (await readJournal({ minimumEntries: 5 })).some(
          (entry) =>
            entry.kind === 'process_exit_observed' &&
            entry.pid === spawn.pid,
        ),
        true,
      )
    },
  )
})

test('HeadlessCodexClientHost fails closed when force-kill exit is not observed', async () => {
  await withFakeHeadlessCodexClientHost(
    {
      ignoreSigterm: true,
      hostOptions: { closeTimeoutMs: 25 },
      testOptions: { forceKill: () => {} },
    },
    async ({ host }) => {
      const subscription = host.subscribe()
      const events = readEvents(
        subscription.events[Symbol.asyncIterator](),
        4,
      )
      await host.start()

      await assert.rejects(host.stop(), (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'close_timeout')
        assert.equal(error.recoverable, false)

        return true
      })
      assert.deepEqual(host.getSnapshot(), {
        status: 'failed',
        generation: 1,
        failure: {
          code: 'close_timeout',
          message: 'Codex app-server cleanup could not confirm child termination',
        },
        recoverable: false,
      })
      assert.deepEqual(
        (await events).map((event) => event.snapshot.status),
        ['starting', 'ready', 'stopping', 'failed'],
      )

      const repeatedStopEvents = readEvents(
        subscription.events[Symbol.asyncIterator](),
        2,
      )
      await assert.rejects(host.stop(), (error: unknown) => {
        assert.ok(error instanceof HeadlessCodexClientHostError)
        assert.equal(error.code, 'close_timeout')

        return true
      })
      assert.equal(host.getSnapshot().status, 'failed')
      assert.deepEqual(
        (await repeatedStopEvents).map((event) => event.snapshot.status),
        ['stopping', 'failed'],
      )
      subscription.unsubscribe()
    },
  )
})

test('HeadlessCodexClientHost inherits non-secret environment without leaking token-like values', async () => {
  const previousLang = process.env.LANG
  const previousGithubPat = process.env.GITHUB_PAT
  const previousSecret = process.env.AY_PLE_HOST_SECRET_TOKEN
  process.env.LANG = 'ay_ple_test_locale'
  process.env.GITHUB_PAT = 'must-not-reach-child'
  process.env.AY_PLE_HOST_SECRET_TOKEN = 'must-not-reach-child'

  try {
    await withFakeHeadlessCodexClientHost({}, async ({ host, readJournal }) => {
      await host.start()
      const spawn = (await readJournal({ minimumEntries: 4 })).find(
        (entry) => entry.kind === 'spawn',
      )

      assert.equal(
        spawn && 'inheritedLocale' in spawn
          ? spawn.inheritedLocale
          : undefined,
        'ay_ple_test_locale',
      )
      assert.equal(
        spawn && 'githubPatPresent' in spawn
          ? spawn.githubPatPresent
          : true,
        false,
      )
      assert.equal(
        spawn && 'tokenLikeMarkerPresent' in spawn
          ? spawn.tokenLikeMarkerPresent
          : true,
        false,
      )
    })
  } finally {
    restoreEnvironmentValue('LANG', previousLang)
    restoreEnvironmentValue('GITHUB_PAT', previousGithubPat)
    restoreEnvironmentValue('AY_PLE_HOST_SECRET_TOKEN', previousSecret)
  }
})

test('fake Headless Codex fixture reaps a gated version probe after assertion failure', async () => {
  let tempRoot: string | undefined

  await assert.rejects(
    withFakeHeadlessCodexClientHost(
      { gateVersionProbe: true },
      async ({ host, readJournal, tempRoot: fixtureTempRoot }) => {
        tempRoot = fixtureTempRoot
        const start = host.start()
        void start.catch(() => {})
        await readJournal({ minimumEntries: 1 })
        throw new Error('intentional Host fixture assertion failure')
      },
    ),
    /intentional Host fixture assertion failure/,
  )

  assert.ok(tempRoot)
  await assert.rejects(access(tempRoot))
})

async function readEvents<Event>(
  iterator: AsyncIterator<Event>,
  count: number,
): Promise<Event[]> {
  const events: Event[] = []

  while (events.length < count) {
    const result = await iterator.next()

    if (result.done) {
      break
    }

    events.push(result.value)
  }

  return events
}

async function drainEvents(
  events: AsyncIterable<{
    generation: number
    snapshot: { status: string }
  }>,
): Promise<Array<{
  generation: number
  snapshot: { status: string }
}>> {
  const drained = []

  for await (const event of events) {
    drained.push(event)
  }

  return drained
}

function assertPublicValueIsSanitized(
  value: unknown,
  forbiddenValues: string[],
): void {
  const forbiddenKeys = new Set([
    'jsonrpc',
    'id',
    'token',
    'environment',
    'packageRoot',
    'appDataRoot',
    'workspaceRoot',
    'stderr',
    'debug',
    'payload',
    'cause',
  ])

  const visit = (candidate: unknown): void => {
    if (typeof candidate === 'string') {
      for (const forbidden of forbiddenValues) {
        assert.equal(candidate.includes(forbidden), false)
      }

      return
    }

    if (!candidate || typeof candidate !== 'object') {
      return
    }

    if (candidate instanceof Error) {
      assert.equal(Object.hasOwn(candidate, 'cause'), false)
      visit(candidate.name)
      visit(candidate.message)
    }

    for (const [key, nested] of Object.entries(candidate)) {
      assert.equal(forbiddenKeys.has(key), false)
      visit(nested)
    }
  }

  visit(value)
}

function restoreEnvironmentValue(
  key: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }

  process.env[key] = value
}
