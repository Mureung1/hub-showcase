import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  mkdtemp,
  mkdir,
  realpath,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import express from 'express'

import {
  createInteractionBroker,
  InteractionSettlementError,
  type ActiveInteractionProductTurn,
} from './interaction-broker.js'

const operationId = 'operation_0123456789abcdef0123456789abcdef'
const nativeThreadId = 'native-thread-secret'
const nativeTurnId = 'native-turn-secret'

test('Interaction Broker returns one held result after atomic evidence projection', async () => {
  const fixture = await createFixture()
  const content = '\ufeffprefix 한글 needle suffix'
  await writeFile(path.join(fixture.workspaceRoot, 'notes.txt'), content)
  const frames: unknown[] = []
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => activeTurn(),
    uiAdapter: {
      publish(frame) {
        frames.push(frame)
      },
    },
  })
  const server = await listen(broker.router)

  try {
    await acceptHandshake(server, broker)
    const call = postBroker(server, broker, {
      protocolVersion: 1,
      kind: 'capability_call',
      capability: 'propose_state_patch',
      request: requestWithEvidence({
        relativePath: 'notes.txt',
        contentDigest: sha256(Buffer.from(content)),
        quote: 'needle',
      }),
    })
    await waitFor(() => frames.length === 1)
    const requested = frames[0] as {
      interactionId: string
      review: {
        changes: readonly [
          {
            evidence: readonly [
              {
                contextBefore: string
                contextAfter: string
              },
            ]
          },
        ]
      }
    }
    assert.match(requested.interactionId, /^interaction_[0-9a-f]{32}$/u)
    assert.equal(
      requested.review.changes[0].evidence[0].contextBefore,
      'prefix 한글 ',
    )
    assert.equal(
      requested.review.changes[0].evidence[0].contextAfter,
      ' suffix',
    )

    const settlement = broker.settle(requested.interactionId, {
      outcome: 'accept',
    })
    assert.deepEqual(await call, {
      protocolVersion: 1,
      kind: 'capability_result',
      capability: 'propose_state_patch',
      result: { outcome: 'accept' },
    })
    await settlement
    assert.deepEqual(frames[1], {
      type: 'review.resolved',
      operationId,
      interactionId: requested.interactionId,
      result: { outcome: 'accept' },
    })
    assert.equal(JSON.stringify(frames).includes(fixture.workspaceRoot), false)
    assert.equal(JSON.stringify(frames).includes(nativeThreadId), false)
    assert.equal(JSON.stringify(frames).includes(nativeTurnId), false)
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

test('evidence failures are all-or-nothing and do not publish a card', async () => {
  const fixture = await createFixture()
  const content = 'one needle two'
  await writeFile(path.join(fixture.workspaceRoot, 'notes.txt'), content)
  await mkdir(path.join(fixture.workspaceRoot, 'directory.txt'))
  await writeFile(
    path.join(fixture.workspaceRoot, 'oversized.txt'),
    Buffer.alloc(1024 * 1024 + 1, 97),
  )
  await writeFile(
    path.join(fixture.workspaceRoot, 'invalid-utf8.txt'),
    Buffer.from([0xc3, 0x28]),
  )
  await writeFile(path.join(fixture.outsideRoot, 'secret.txt'), 'needle')
  await symlink(
    path.join(fixture.outsideRoot, 'secret.txt'),
    path.join(fixture.workspaceRoot, 'escaped.txt'),
  )
  const frames: unknown[] = []
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => activeTurn(),
    uiAdapter: { publish: (frame) => frames.push(frame) },
  })
  const server = await listen(broker.router)

  try {
    await acceptHandshake(server, broker)
    for (const request of [
      requestWithEvidence({
        relativePath: 'notes.txt',
        contentDigest: '0'.repeat(64),
        quote: 'needle',
      }),
      requestWithEvidence({
        relativePath: 'escaped.txt',
        contentDigest: sha256(Buffer.from('needle')),
        quote: 'needle',
      }),
      requestWithEvidence({
        relativePath: 'notes.txt',
        contentDigest: sha256(Buffer.from(content)),
        quote: 'missing',
      }),
      requestWithEvidence({
        relativePath: 'missing.txt',
        contentDigest: '0'.repeat(64),
        quote: 'needle',
      }),
      requestWithEvidence({
        relativePath: 'directory.txt',
        contentDigest: '0'.repeat(64),
        quote: 'needle',
      }),
      requestWithEvidence({
        relativePath: 'oversized.txt',
        contentDigest: '0'.repeat(64),
        quote: 'needle',
      }),
      requestWithEvidence({
        relativePath: 'invalid-utf8.txt',
        contentDigest: sha256(Buffer.from([0xc3, 0x28])),
        quote: '(',
      }),
    ]) {
      const response = await postBroker(server, broker, {
        protocolVersion: 1,
        kind: 'capability_call',
        capability: 'propose_state_patch',
        request,
      })
      assert.equal(response.kind, 'error')
      assert.equal(response.code, 'evidence_invalid')
    }
    assert.deepEqual(frames, [])
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

test('authentication, active lease, malformed input and busy admission fail closed', async () => {
  const fixture = await createFixture()
  const frames: unknown[] = []
  let turn: ActiveInteractionProductTurn | undefined
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => turn,
    uiAdapter: { publish: (frame) => frames.push(frame) },
  })
  const server = await listen(broker.router)

  try {
    const request = requestWithoutEvidence()
    assert.equal(
      (
        await postBroker(
          server,
          broker,
          capabilityCall(request),
          { token: 'wrong' },
        )
      ).code,
      'forbidden',
    )
    assert.equal(
      (
        await postBroker(
          server,
          broker,
          capabilityCall(request),
          { binding: 'runtime_00000000000000000000000000000000' },
        )
      ).code,
      'forbidden',
    )
    assert.equal(
      (await postBroker(server, broker, capabilityCall(request))).code,
      'broker_unavailable',
    )
    await acceptHandshake(server, broker)
    assert.equal(
      (await postBroker(server, broker, capabilityCall(request))).code,
      'runtime_inactive',
    )
    turn = activeTurn()
    assert.equal(
      (
        await postRaw(
          server,
          broker,
          Buffer.from('{"kind":"capability_call","extra":true}'),
        )
      ).code,
      'invalid_request',
    )

    const first = postBroker(server, broker, capabilityCall(request))
    await waitFor(() => frames.length === 1)
    assert.equal(
      (await postBroker(server, broker, capabilityCall(request))).code,
      'busy',
    )
    const interactionId = (frames[0] as { interactionId: string }).interactionId
    const settled = broker.settle(interactionId, { outcome: 'reject' })
    assert.equal((await first).kind, 'capability_result')
    await settled
    await assert.rejects(
      broker.settle(interactionId, { outcome: 'accept' }),
      (error) =>
        error instanceof InteractionSettlementError &&
        error.code === 'conflict',
    )

    const staleCall = postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    await waitFor(() => frames.length === 3)
    const staleInteractionId = (
      frames[2] as { interactionId: string }
    ).interactionId
    turn = undefined
    await assert.rejects(
      broker.settle(staleInteractionId, { outcome: 'accept' }),
      (error) =>
        error instanceof InteractionSettlementError &&
        error.code === 'conflict',
    )
    assert.equal((await staleCall).kind, 'error')
    assert.equal((frames[3] as { type: string }).type, 'review.failed')
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

test('HTTP abort and terminal lifecycle never synthesize a user result', async () => {
  const fixture = await createFixture()
  const frames: unknown[] = []
  let interrupts = 0
  let teardowns = 0
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => activeTurn(),
    uiAdapter: { publish: (frame) => frames.push(frame) },
    interruptProductTurn: async () => {
      interrupts += 1
    },
    teardownRuntime: async () => {
      teardowns += 1
    },
  })
  const server = await listen(broker.router)

  try {
    await acceptHandshake(server, broker)
    const controller = new AbortController()
    const call = postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
      { signal: controller.signal },
    )
    await waitFor(() => frames.length === 1)
    controller.abort()
    await assert.rejects(call)
    await waitFor(() => frames.length === 2)
    assert.equal((frames[1] as { type: string }).type, 'review.failed')
    assert.equal(interrupts, 1)

    const next = postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    await waitFor(() => frames.length === 3)
    await broker.adapterLost()
    assert.equal((await next).kind, 'error')
    assert.equal(teardowns, 1)
    assert.equal(
      (await postBroker(server, broker, capabilityCall(requestWithoutEvidence())))
        .code,
      'forbidden',
    )
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

test('every continuity source closes the held call without a normal result', async () => {
  const callLevel = [
    'browserDisconnected',
    'turnInterrupted',
  ] as const
  const generationLevel = [
    'runtimeTerminal',
    'runtimeReplaced',
    'adapterLost',
    'appShutdown',
  ] as const

  for (const event of [...callLevel, ...generationLevel]) {
    const fixture = await createFixture()
    const frames: unknown[] = []
    let teardowns = 0
    const broker = await createInteractionBroker({
      workspaceRoot: fixture.workspaceRoot,
      activeProductTurn: () => activeTurn(),
      uiAdapter: { publish: (frame) => frames.push(frame) },
      teardownRuntime: async () => {
        teardowns += 1
      },
    })
    const server = await listen(broker.router)
    try {
      await acceptHandshake(server, broker)
      const call = postBroker(
        server,
        broker,
        capabilityCall(requestWithoutEvidence()),
      )
      await waitFor(() => frames.length === 1)
      await broker[event]()
      const response = await call
      assert.equal(response.kind, 'error', event)
      assert.equal(response.code, 'interaction_interrupted', event)
      assert.equal(
        (frames[1] as { type: string }).type,
        'review.failed',
        event,
      )
      assert.equal(
        teardowns,
        event === 'runtimeReplaced' ||
          event === 'adapterLost' ||
          event === 'appShutdown'
          ? 1
          : 0,
        event,
      )
      if (generationLevel.includes(event as (typeof generationLevel)[number])) {
        assert.equal(
          (
            await postBroker(
              server,
              broker,
              capabilityCall(requestWithoutEvidence()),
            )
          ).code,
          'forbidden',
          event,
        )
      }
    } finally {
      await broker.appShutdown()
      await close(server)
    }
  }
})

test('stalled UI cleanup cannot delay interrupt, credential revoke, or teardown', async () => {
  const fixture = await createFixture()
  const frames: unknown[] = []
  let interrupts = 0
  let teardowns = 0
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => activeTurn(),
    uiAdapter: {
      publish(frame) {
        frames.push(frame)
        if (frame.type === 'review.failed') {
          return new Promise<void>(() => undefined)
        }
      },
    },
    interruptProductTurn: async () => {
      interrupts += 1
    },
    teardownRuntime: async () => {
      teardowns += 1
    },
    lifecycleDeadlineMs: 10,
  })
  const server = await listen(broker.router)

  try {
    await acceptHandshake(server, broker)
    const firstCall = postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    await waitFor(() => frames.length === 1)
    await broker.browserDisconnected()
    assert.equal((await firstCall).kind, 'error')
    assert.equal(interrupts, 1)

    const secondCall = postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    await waitFor(() => frames.length === 3)
    const closing = broker.runtimeReplaced()
    assert.equal(
      (
        await postBroker(
          server,
          broker,
          capabilityCall(requestWithoutEvidence()),
        )
      ).code,
      'forbidden',
    )
    await closing
    assert.equal((await secondCall).kind, 'error')
    assert.equal(teardowns, 1)
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

test('a requested-card publish timeout fails without creating an invisible pending slot', async () => {
  const fixture = await createFixture()
  const frames: unknown[] = []
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => activeTurn(),
    uiAdapter: {
      publish(frame) {
        frames.push(frame)
        return new Promise<void>(() => undefined)
      },
    },
    lifecycleDeadlineMs: 10,
  })
  const server = await listen(broker.router)

  try {
    await acceptHandshake(server, broker)
    const first = await postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    assert.equal(first.code, 'broker_unavailable')
    const second = await postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    assert.equal(second.code, 'broker_unavailable')
    assert.equal(frames.length, 2)
    await assert.rejects(
      broker.settle(
        (frames[0] as { interactionId: string }).interactionId,
        { outcome: 'accept' },
      ),
      (error) =>
        error instanceof InteractionSettlementError &&
        error.code === 'conflict',
    )
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

test('settlement racing generation close converges without replay or a pending slot', async () => {
  const fixture = await createFixture()
  const frames: unknown[] = []
  const broker = await createInteractionBroker({
    workspaceRoot: fixture.workspaceRoot,
    activeProductTurn: () => activeTurn(),
    uiAdapter: { publish: (frame) => frames.push(frame) },
  })
  const server = await listen(broker.router)

  try {
    await acceptHandshake(server, broker)
    const call = postBroker(
      server,
      broker,
      capabilityCall(requestWithoutEvidence()),
    )
    await waitFor(() => frames.length === 1)
    const interactionId = (frames[0] as { interactionId: string })
      .interactionId
    const outcomes = await Promise.allSettled([
      broker.settle(interactionId, { outcome: 'accept' }),
      broker.runtimeReplaced(),
      call,
    ])
    assert.equal(outcomes[1].status, 'fulfilled')
    assert.equal(frames.length, 2)
    const terminalType = (frames[1] as { type: string }).type
    if (terminalType === 'review.resolved') {
      assert.equal(outcomes[0].status, 'fulfilled')
      assert.equal(outcomes[2].status, 'fulfilled')
      assert.equal(
        (outcomes[2] as PromiseFulfilledResult<Record<string, any>>)
          .value.kind,
        'capability_result',
      )
    } else {
      assert.equal(terminalType, 'review.failed')
      assert.equal(outcomes[0].status, 'rejected')
      if (outcomes[2].status === 'fulfilled') {
        assert.notEqual(outcomes[2].value.kind, 'capability_result')
      }
    }
    await assert.rejects(
      broker.settle(interactionId, { outcome: 'accept' }),
      (error) =>
        error instanceof InteractionSettlementError &&
        error.code === 'conflict',
    )
    assert.equal(
      (
        await postBroker(
          server,
          broker,
          capabilityCall(requestWithoutEvidence()),
        )
      ).code,
      'forbidden',
    )
  } finally {
    await broker.appShutdown()
    await close(server)
  }
})

function activeTurn(): ActiveInteractionProductTurn {
  return { operationId, nativeThreadId, nativeTurnId }
}

function requestWithoutEvidence() {
  return {
    summary: '요약',
    question: '적용할까요?',
    changes: [
      {
        label: '제목',
        description: '제목을 바꿉니다.',
        before: '이전',
        after: '이후',
      },
    ],
  } as const
}

function requestWithEvidence(input: {
  relativePath: string
  contentDigest: string
  quote: string
}) {
  return {
    ...requestWithoutEvidence(),
    changes: [
      {
        ...requestWithoutEvidence().changes[0],
        evidence: [
          {
            relativePath: input.relativePath,
            contentDigest: input.contentDigest,
            locator: {
              type: 'text_quote',
              quote: input.quote,
              occurrence: 1,
            },
          },
        ],
      },
    ],
  } as const
}

function capabilityCall(request: ReturnType<typeof requestWithoutEvidence>) {
  return {
    protocolVersion: 1,
    kind: 'capability_call',
    capability: 'propose_state_patch',
    request,
  } as const
}

async function createFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-broker-'))
  const workspaceRoot = path.join(root, 'workspace')
  const outsideRoot = path.join(root, 'outside')
  await mkdir(workspaceRoot)
  await mkdir(outsideRoot)
  return {
    workspaceRoot: await realpath(workspaceRoot),
    outsideRoot: await realpath(outsideRoot),
  }
}

async function listen(
  router: express.Router,
): Promise<Server & { readonly testPort: number }> {
  const app = express()
  app.use('/api/_private/interaction-mcp', router)
  const server = createServer(app) as Server & { testPort: number }
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  Object.defineProperty(server, 'testPort', { value: address.port })
  return server
}

async function postBroker(
  server: Server & { readonly testPort: number },
  broker: Awaited<ReturnType<typeof createInteractionBroker>>,
  body: unknown,
  overrides: {
    binding?: string
    token?: string
    signal?: AbortSignal
  } = {},
) {
  return postRaw(
    server,
    broker,
    Buffer.from(JSON.stringify(body)),
    overrides,
  )
}

async function acceptHandshake(
  server: Server & { readonly testPort: number },
  broker: Awaited<ReturnType<typeof createInteractionBroker>>,
): Promise<void> {
  assert.deepEqual(
    await postBroker(server, broker, {
      protocolVersion: 1,
      kind: 'handshake',
      serverName: 'ay_ple_interaction',
      capabilities: ['propose_state_patch'],
    }),
    {
      protocolVersion: 1,
      kind: 'handshake_accepted',
    },
  )
}

async function postRaw(
  server: Server & { readonly testPort: number },
  broker: Awaited<ReturnType<typeof createInteractionBroker>>,
  body: Buffer,
  overrides: {
    binding?: string
    token?: string
    signal?: AbortSignal
  } = {},
) {
  const credentials = broker.credentials()
  const response = await fetch(
    `http://127.0.0.1:${server.testPort}/api/_private/interaction-mcp`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${overrides.token ?? credentials.token}`,
        'content-type': 'application/json',
        'x-ay-ple-runtime-binding':
          overrides.binding ?? credentials.binding,
      },
      body,
      signal: overrides.signal,
    },
  )
  return response.json() as Promise<Record<string, any>>
}

function sha256(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 2_000
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error('Timed out waiting for state')
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
    server.closeAllConnections()
  })
}
