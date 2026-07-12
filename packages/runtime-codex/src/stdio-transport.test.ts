import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  CodexStdioProtocolError,
  CodexStdioRequestError,
  CodexStdioTransport,
  CodexStdioTransportError,
  type CodexStdioObservation,
} from './stdio-transport.js'
import {
  withFakeCodexStdioTransport,
  type FakeCodexStdioScenario,
} from './testing/fake-codex-stdio-transport.js'

test('CodexStdioTransport round-trips all four protocol directions with exact request identities', async () => {
  let cleanedTempDir = ''
  let childPid = 0

  await withFakeCodexStdioTransport(
    { scenario: 'bidirectional' },
    async ({ transport, tempDir, readJournal }) => {
      cleanedTempDir = tempDir
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))

      const numericRequest = await nextObservation(observations)
      assert.equal(numericRequest.kind, 'server_request')

      if (numericRequest.kind !== 'server_request') {
        assert.fail('expected numeric Server request')
      }

      assert.equal(numericRequest.request.id, 1)
      assert.equal(
        numericRequest.request.method,
        'item/commandExecution/requestApproval',
      )

      if (
        numericRequest.request.method !==
        'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected command approval request')
      }

      await numericRequest.request.respond({ decision: 'accept' })
      await assert.rejects(
        numericRequest.request.respond({ decision: 'decline' }),
        (error: unknown) =>
          error instanceof CodexStdioProtocolError &&
          error.code === 'duplicate_response',
      )

      const stringRequest = await nextObservation(observations)
      assert.equal(stringRequest.kind, 'server_request')

      if (stringRequest.kind !== 'server_request') {
        assert.fail('expected string Server request')
      }

      assert.equal(stringRequest.request.id, '1')
      await stringRequest.request.respondError({
        code: -32601,
        message: 'unsupported by fixture caller',
      })

      assert.deepEqual(await nextObservation(observations), {
        kind: 'server_notification',
        method: 'warning',
        params: {
          message: 'fixture warning',
        },
      })
      assert.deepEqual(await initialize, {
        userAgent: 'fake-bidirectional-codex',
      })

      await transport.sendNotification({ method: 'initialized' })

      const journal = await readJournal({ minimumEntries: 5 })
      const spawnEntry = journal.find((entry) => entry.kind === 'spawn')
      assert.ok(spawnEntry && spawnEntry.kind === 'spawn')
      childPid = spawnEntry.pid

      const clientMessages = journal
        .filter((entry) => entry.kind === 'client_message')
        .map((entry) => entry.message)

      assert.deepEqual(clientMessages, [
        createInitializeRequest(1),
        {
          id: 1,
          result: { decision: 'accept' },
        },
        {
          id: '1',
          error: {
            code: -32601,
            message: 'unsupported by fixture caller',
          },
        },
        {
          method: 'initialized',
        },
      ])
    },
  )

  await assertPathMissing(cleanedTempDir)
  assertProcessMissing(childPid)
})

test('CodexStdioTransport keeps numeric and string Client request IDs distinct', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'typed_client_responses' },
    async ({ transport }) => {
      const numeric = transport.sendRequest(createInitializeRequest(1))
      const string = transport.sendRequest(createInitializeRequest('1'))

      assert.deepEqual(await string, { identity: 'string' })
      assert.deepEqual(await numeric, { identity: 'number' })
    },
  )
})

test('CodexStdioTransport rejects duplicate and unknown responses without resolving another request', async (t) => {
  await t.test('duplicate response', async () => {
    await withFakeCodexStdioTransport(
      { scenario: 'duplicate_responses' },
      async ({ transport }) => {
        const observations = transport.observations()[Symbol.asyncIterator]()
        const secondRequest = transport.sendRequest(createInitializeRequest(2))
        const secondRejection = assert.rejects(
          secondRequest,
          isProtocolFailure('duplicate_response'),
        )
        const firstRequest = transport.sendRequest(createInitializeRequest(1))

        assert.deepEqual(await firstRequest, { request: 1 })
        assert.deepEqual(await nextObservation(observations), {
          kind: 'protocol_error',
          code: 'duplicate_response',
          message: 'Codex app-server emitted a duplicate Client response',
        })
        await secondRejection
      },
    )
  })

  await t.test('unknown response', async () => {
    await withFakeCodexStdioTransport(
      { scenario: 'unknown_response' },
      async ({ transport }) => {
        const observations = transport.observations()[Symbol.asyncIterator]()
        const pending = transport.sendRequest(createInitializeRequest(1))
        const rejection = assert.rejects(
          pending,
          isProtocolFailure('unknown_response'),
        )

        assert.deepEqual(await nextObservation(observations), {
          kind: 'protocol_error',
          code: 'unknown_response',
          message:
            'Codex app-server emitted a response for an unknown Client request',
        })
        await rejection
      },
    )
  })
})

test('CodexStdioTransport fails closed on malformed and ambiguous messages', async (t) => {
  const cases: Array<{
    scenario: Extract<
      FakeCodexStdioScenario,
      | 'malformed_json'
      | 'ambiguous_message'
      | 'invalid_server_request_params'
      | 'unsafe_numeric_id'
    >
    code: 'malformed_json' | 'ambiguous_message' | 'invalid_message'
  }> = [
    { scenario: 'malformed_json', code: 'malformed_json' },
    { scenario: 'ambiguous_message', code: 'ambiguous_message' },
    {
      scenario: 'invalid_server_request_params',
      code: 'invalid_message',
    },
    { scenario: 'unsafe_numeric_id', code: 'invalid_message' },
  ]

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.scenario, async () => {
      await withFakeCodexStdioTransport(
        { scenario: fixtureCase.scenario },
        async ({ transport }) => {
          const observations = transport.observations()[Symbol.asyncIterator]()
          const pending = transport.sendRequest(createInitializeRequest(1))
          const rejection = assert.rejects(
            pending,
            isProtocolFailure(fixtureCase.code),
          )
          const observation = await nextObservation(observations)

          assert.equal(observation.kind, 'protocol_error')

          if (observation.kind === 'protocol_error') {
            assert.equal(observation.code, fixtureCase.code)
          }

          await rejection
        },
      )
    })
  }
})

test('CodexStdioTransport distinguishes child exit, stdout EOF, and stdin failure', async (t) => {
  const lossCases: Array<{
    scenario: Extract<
      FakeCodexStdioScenario,
      'exit_after_request' | 'stdout_eof'
    >
    code: 'child_exit' | 'stdout_eof'
  }> = [
    { scenario: 'exit_after_request', code: 'child_exit' },
    { scenario: 'stdout_eof', code: 'stdout_eof' },
  ]

  for (const lossCase of lossCases) {
    await t.test(lossCase.scenario, async () => {
      let cleanedTempDir = ''
      let childPid = 0

      await withFakeCodexStdioTransport(
        { scenario: lossCase.scenario },
        async ({ transport, tempDir, readJournal }) => {
          cleanedTempDir = tempDir
          const observations = transport.observations()[Symbol.asyncIterator]()
          const pending = transport.sendRequest(createInitializeRequest(1))
          const rejection = assert.rejects(
            pending,
            isTransportFailure(lossCase.code),
          )
          const journal = await readJournal({ minimumEntries: 2 })
          const spawnEntry = journal.find((entry) => entry.kind === 'spawn')
          assert.ok(spawnEntry && spawnEntry.kind === 'spawn')
          childPid = spawnEntry.pid
          const observation = await nextObservation(observations)

          assert.equal(observation.kind, 'transport_lost')

          if (observation.kind === 'transport_lost') {
            assert.equal(observation.code, lossCase.code)
          }

          await rejection
        },
      )

      await assertPathMissing(cleanedTempDir)
      assertProcessMissing(childPid)
    })
  }

  await t.test('stdin_failure', async () => {
    let cleanedTempDir = ''
    let childPid = 0

    await withFakeCodexStdioTransport(
      { scenario: 'stdin_failure' },
      async ({ transport, tempDir, readJournal }) => {
        cleanedTempDir = tempDir
        const observations = transport.observations()[Symbol.asyncIterator]()
        const pending = transport.sendRequest(createInitializeRequest(1))
        let pendingError: unknown
        const pendingSettled = pending.catch((error: unknown) => {
          pendingError = error
        })
        const journal = await readJournal({ minimumEntries: 2 })
        const spawnEntry = journal.find((entry) => entry.kind === 'spawn')
        assert.ok(spawnEntry && spawnEntry.kind === 'spawn')
        childPid = spawnEntry.pid
        await delay(20)

        await assert.rejects(
          transport.sendNotification({ method: 'initialized' }),
          isTransportFailure('stdin_error'),
        )
        const observation = await nextObservation(observations)
        assert.equal(observation.kind, 'transport_lost')

        if (observation.kind === 'transport_lost') {
          assert.equal(observation.code, 'stdin_error')
        }

        await pendingSettled
        assert.equal(isTransportFailure('stdin_error')(pendingError), true)
      },
    )

    await assertPathMissing(cleanedTempDir)
    assertProcessMissing(childPid)
  })
})

test('CodexStdioTransport reports a child spawn error distinctly', async () => {
  const transport = new CodexStdioTransport({
    command: join(tmpdir(), 'missing-codex-app-server-binary'),
    cwd: tmpdir(),
    env: process.env,
    requestTimeoutMs: 100,
    closeTimeoutMs: 20,
  })

  try {
    const observations = transport.observations()[Symbol.asyncIterator]()
    const pending = transport.sendRequest(createInitializeRequest(1))
    const rejection = assert.rejects(
      pending,
      isTransportFailure('spawn_error'),
    )
    const observation = await nextObservation(observations)

    assert.equal(observation.kind, 'transport_lost')

    if (observation.kind === 'transport_lost') {
      assert.equal(observation.code, 'spawn_error')
    }

    await rejection
  } finally {
    await transport.close()
  }
})

test('CodexStdioTransport keeps an individual request timeout scoped to that request', async () => {
  await withFakeCodexStdioTransport(
    {
      scenario: 'hang',
      requestTimeoutMs: 20,
    },
    async ({ transport, readJournal }) => {
      await assert.rejects(
        transport.sendRequest(createInitializeRequest(1)),
        (error: unknown) =>
          error instanceof CodexStdioRequestError &&
          error.code === 'request_timeout',
      )
      await assert.rejects(
        transport.sendRequest(createInitializeRequest(1)),
        isProtocolFailure('duplicate_response'),
      )

      await transport.sendNotification({ method: 'initialized' })
      const journal = await readJournal({ minimumEntries: 3 })
      assert.deepEqual(
        journal
          .filter((entry) => entry.kind === 'client_message')
          .map((entry) => entry.message),
        [createInitializeRequest(1), { method: 'initialized' }],
      )
    },
  )
})

test('fake stdio fixture force-kills and removes its journal after assertion failure', async () => {
  let cleanedTempDir = ''
  let childPid = 0

  await assert.rejects(
    withFakeCodexStdioTransport(
      {
        scenario: 'hang',
        ignoreSigterm: true,
        closeTimeoutMs: 20,
      },
      async ({ transport, tempDir, readJournal }) => {
        cleanedTempDir = tempDir
        void transport.sendRequest(createInitializeRequest(1)).catch(() => {})
        const journal = await readJournal({ minimumEntries: 2 })
        const spawnEntry = journal.find((entry) => entry.kind === 'spawn')
        assert.ok(spawnEntry && spawnEntry.kind === 'spawn')
        childPid = spawnEntry.pid
        throw new Error('intentional fixture assertion failure')
      },
    ),
    /intentional fixture assertion failure/,
  )

  await assertPathMissing(cleanedTempDir)
  assertProcessMissing(childPid)
})

function createInitializeRequest(id: string | number) {
  return {
    method: 'initialize' as const,
    id,
    params: {
      clientInfo: {
        name: 'transport-test',
        title: 'Transport Test',
        version: '0.0.0',
      },
      capabilities: null,
    },
  }
}

async function nextObservation(
  iterator: AsyncIterator<CodexStdioObservation>,
): Promise<CodexStdioObservation> {
  const result = await iterator.next()

  assert.equal(result.done, false)
  assert.ok(result.value)

  return result.value
}

function isProtocolFailure(code: string) {
  return (error: unknown): boolean =>
    error instanceof CodexStdioProtocolError && error.code === code
}

function isTransportFailure(code: string) {
  return (error: unknown): boolean =>
    error instanceof CodexStdioTransportError && error.code === code
}

async function assertPathMissing(path: string): Promise<void> {
  await assert.rejects(access(path), (error: unknown) => {
    return (
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    )
  })
}

function assertProcessMissing(pid: number): void {
  assert.throws(
    () => process.kill(pid, 0),
    (error: unknown) =>
      error instanceof Error &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ESRCH',
  )
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}
