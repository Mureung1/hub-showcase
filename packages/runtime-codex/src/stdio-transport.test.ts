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
      assert.deepEqual(
        await initialize,
        expectedInitializeResponse({
          userAgent: 'fake-bidirectional-codex',
        }),
      )

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

      assert.deepEqual(
        await string,
        expectedInitializeResponse({ identity: 'string' }),
      )
      assert.deepEqual(
        await numeric,
        expectedInitializeResponse({ identity: 'number' }),
      )
    },
  )
})

test('CodexStdioTransport accepts exact safe integer values across JSON number representations', async (t) => {
  const cases = [
    { id: 1, expected: { identity: 'decimal' } },
    { id: 2, expected: { identity: 'zero-padded-exponent' } },
    { id: 1000, expected: { identity: 'exponent' } },
  ] as const

  for (const fixtureCase of cases) {
    await t.test(String(fixtureCase.id), async () => {
      await withFakeCodexStdioTransport(
        { scenario: 'safe_numeric_id_representations' },
        async ({ transport }) => {
          assert.deepEqual(
            await transport.sendRequest(
              createInitializeRequest(fixtureCase.id),
            ),
            expectedInitializeResponse(fixtureCase.expected),
          )
        },
      )
    })
  }
})

test('CodexStdioTransport preserves an exponent-form Server request identity through its response', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'safe_numeric_server_request_representation' },
    async ({ transport }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))
      const observation = await nextObservation(observations)

      assert.equal(observation.kind, 'server_request')

      if (
        observation.kind !== 'server_request' ||
        observation.request.method !==
          'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected exponent-form command approval request')
      }

      assert.equal(observation.request.id, 1000)
      await observation.request.respond({ decision: 'accept' })
      assert.deepEqual(
        await initialize,
        expectedInitializeResponse({
          userAgent: 'fake-numeric-server-codex',
        }),
      )
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

        assert.deepEqual(
          await firstRequest,
          expectedInitializeResponse({ request: 1 }),
        )
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
      | 'duplicate_protocol_key'
      | 'invalid_server_request_params'
      | 'unsafe_numeric_id'
      | 'unsafe_numeric_id_underflow'
      | 'unsafe_numeric_id_precision_loss'
      | 'unsafe_numeric_id_negative_zero'
    >
    code: 'malformed_json' | 'ambiguous_message' | 'invalid_message'
  }> = [
    { scenario: 'malformed_json', code: 'malformed_json' },
    { scenario: 'ambiguous_message', code: 'ambiguous_message' },
    { scenario: 'duplicate_protocol_key', code: 'ambiguous_message' },
    {
      scenario: 'invalid_server_request_params',
      code: 'invalid_message',
    },
    { scenario: 'unsafe_numeric_id', code: 'invalid_message' },
    {
      scenario: 'unsafe_numeric_id_underflow',
      code: 'invalid_message',
    },
    {
      scenario: 'unsafe_numeric_id_precision_loss',
      code: 'invalid_message',
    },
    {
      scenario: 'unsafe_numeric_id_negative_zero',
      code: 'invalid_message',
    },
  ]

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.scenario, async () => {
      await withFakeCodexStdioTransport(
        { scenario: fixtureCase.scenario },
        async ({ transport }) => {
          const observations = transport.observations()[Symbol.asyncIterator]()
          const pending = transport.sendRequest(
            createInitializeRequest(
              fixtureCase.scenario === 'unsafe_numeric_id_underflow' ||
                fixtureCase.scenario === 'unsafe_numeric_id_negative_zero'
                ? 0
                : fixtureCase.scenario === 'duplicate_protocol_key'
                  ? '1'
                  : 1,
            ),
          )
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

test('CodexStdioTransport publishes nothing after a terminal protocol failure', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'protocol_failure_then_messages' },
    async ({ transport }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const pending = transport.sendRequest(createInitializeRequest(1))
      const rejection = assert.rejects(
        pending,
        isProtocolFailure('malformed_json'),
      )

      assert.deepEqual(await nextObservation(observations), {
        kind: 'protocol_error',
        code: 'malformed_json',
        message: 'Codex app-server emitted malformed JSON',
      })
      assert.deepEqual(await observations.next(), {
        done: true,
        value: undefined,
      })
      await rejection
    },
  )
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
    const firstStart = transport.start()
    const secondStart = transport.start()
    assert.strictEqual(firstStart, secondStart)
    const rejection = assert.rejects(
      firstStart,
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

test('CodexStdioTransport exposes one coalesced successful-spawn promise before requests', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'hang' },
    async ({ transport, readJournal }) => {
      const firstStart = transport.start()
      const secondStart = transport.start()

      assert.ok(firstStart instanceof Promise)
      assert.strictEqual(firstStart, secondStart)
      await firstStart

      const journal = await readJournal({ minimumEntries: 1 })
      assert.equal(
        journal.filter((entry) => entry.kind === 'spawn').length,
        1,
      )
      assert.equal(
        journal.filter((entry) => entry.kind === 'client_message').length,
        0,
      )
    },
  )
})

test('CodexStdioTransport rejects coalesced start when close wins the spawn race', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'hang' },
    async ({ transport, readJournal }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const firstStart = transport.start()
      const secondStart = transport.start()
      const firstRejection = assert.rejects(
        firstStart,
        isTransportFailure('transport_closed'),
      )
      const secondRejection = assert.rejects(
        secondStart,
        isTransportFailure('transport_closed'),
      )
      const firstClose = transport.close()
      const secondClose = transport.close()

      assert.strictEqual(firstStart, secondStart)
      assert.strictEqual(firstClose, secondClose)
      await Promise.all([
        firstRejection,
        secondRejection,
        firstClose,
        secondClose,
      ])
      assert.deepEqual(await observations.next(), {
        done: true,
        value: undefined,
      })
      await assert.rejects(
        transport.start(),
        isTransportFailure('transport_closed'),
      )

      const journal = await readJournal({ minimumEntries: 0 })
      const spawnEntry = journal.find((entry) => entry.kind === 'spawn')

      if (spawnEntry?.kind === 'spawn') {
        assertProcessMissing(spawnEntry.pid)
      }
    },
  )
})

test('CodexStdioTransport rejects start after close without spawning a child', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'hang' },
    async ({ transport, readJournal }) => {
      await transport.close()
      await assert.rejects(
        transport.start(),
        isTransportFailure('transport_closed'),
      )
      assert.deepEqual(await readJournal({ minimumEntries: 0 }), [])
    },
  )
})

test('CodexStdioTransport coalesces concurrent close through child cleanup', async () => {
  await withFakeCodexStdioTransport(
    {
      scenario: 'hang',
      ignoreSigterm: true,
      closeTimeoutMs: 20,
    },
    async ({ transport, readJournal }) => {
      await transport.start()
      const journal = await readJournal({ minimumEntries: 1 })
      const spawnEntry = journal.find((entry) => entry.kind === 'spawn')
      assert.ok(spawnEntry && spawnEntry.kind === 'spawn')

      const firstClose = transport.close()
      const secondClose = transport.close()

      assert.strictEqual(firstClose, secondClose)
      await Promise.all([firstClose, secondClose])
      assertProcessMissing(spawnEntry.pid)
      await assert.rejects(
        transport.start(),
        isTransportFailure('transport_closed'),
      )
    },
  )
})

test('CodexStdioTransport allows only one observation consumer', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'hang' },
    async ({ transport }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()

      assert.throws(
        () => transport.observations(),
        isTransportFailure('observation_consumer_conflict'),
      )
      await transport.close()
      assert.deepEqual(await observations.next(), {
        done: true,
        value: undefined,
      })
    },
  )
})

test('CodexStdioTransport fails closed when the observation queue reaches its bound', async () => {
  await withFakeCodexStdioTransport(
    {
      scenario: 'observation_flood',
      maxQueuedObservations: 1,
    },
    async ({ transport }) => {
      const pending = transport.sendRequest(createInitializeRequest(1))

      await assert.rejects(
        pending,
        isTransportFailure('observation_queue_limit'),
      )
      const observations = transport.observations()[Symbol.asyncIterator]()
      assert.deepEqual(await nextObservation(observations), {
        kind: 'transport_lost',
        code: 'observation_queue_limit',
        message:
          'Codex stdio transport observation queue reached its limit',
      })
      assert.deepEqual(await observations.next(), {
        done: true,
        value: undefined,
      })
    },
  )
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

test('CodexStdioTransport discards a known late response without terminating another request', async () => {
  await withFakeCodexStdioTransport(
    {
      scenario: 'late_response_after_timeout',
      requestTimeoutMs: 20,
    },
    async ({ transport }) => {
      await assert.rejects(
        transport.sendRequest(createInitializeRequest(1)),
        (error: unknown) =>
          error instanceof CodexStdioRequestError &&
          error.code === 'request_timeout',
      )

      assert.deepEqual(
        await transport.sendRequest(createInitializeRequest(2)),
        expectedInitializeResponse({ request: 2 }),
      )
      await transport.sendNotification({ method: 'initialized' })
    },
  )
})

test('CodexStdioTransport bounds settled Client identities without evicting routing tombstones', async () => {
  await withFakeCodexStdioTransport(
    {
      scenario: 'client_request_identity_limit',
      requestTimeoutMs: 50,
      maxClientRequestIdentities: 2,
    },
    async ({ transport, readJournal }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()

      assert.deepEqual(
        await transport.sendRequest(createInitializeRequest(1)),
        expectedInitializeResponse({ request: 1 }),
      )
      await assert.rejects(
        transport.sendRequest(createInitializeRequest(2)),
        (error: unknown) =>
          error instanceof CodexStdioRequestError &&
          error.code === 'request_timeout',
      )
      await assert.rejects(
        transport.sendRequest(createInitializeRequest(3)),
        isTransportFailure('request_identity_limit'),
      )

      const observation = await nextObservation(observations)
      assert.equal(observation.kind, 'transport_lost')

      if (observation.kind === 'transport_lost') {
        assert.equal(observation.code, 'request_identity_limit')
      }

      assert.deepEqual(
        (await readJournal({ minimumEntries: 3 }))
          .filter((entry) => entry.kind === 'client_message')
          .map((entry) => entry.message),
        [createInitializeRequest(1), createInitializeRequest(2)],
      )
    },
  )
})

test('CodexStdioTransport validates known Client success responses before resolving', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'invalid_client_response' },
    async ({ transport }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))
      const rejection = assert.rejects(
        initialize,
        isProtocolFailure('invalid_message'),
      )

      assert.deepEqual(await nextObservation(observations), {
        kind: 'protocol_error',
        code: 'invalid_message',
        message:
          'Codex app-server emitted a Client response that does not match the generated schema',
      })
      await rejection
    },
  )
})

test('CodexStdioTransport validates Server success responses before writing to the child', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'server_response_validation' },
    async ({ transport, readJournal }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))
      void initialize.catch(() => {})
      const observation = await nextObservation(observations)
      assert.equal(observation.kind, 'server_request')

      if (
        observation.kind !== 'server_request' ||
        observation.request.method !==
          'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected command approval Server request')
      }

      await assert.rejects(
        observation.request.respond({ decision: 'allow' } as never),
        isProtocolFailure('invalid_message'),
      )
      assert.deepEqual(
        (await readJournal({ minimumEntries: 2 }))
          .filter((entry) => entry.kind === 'client_message')
          .map((entry) => entry.message),
        [createInitializeRequest(1)],
      )

      await observation.request.respond({ decision: 'accept' })
      assert.deepEqual(
        await initialize,
        expectedInitializeResponse({
          userAgent: 'fake-response-validation-codex',
        }),
      )
      assert.deepEqual(
        (await readJournal({ minimumEntries: 3 }))
          .filter((entry) => entry.kind === 'client_message')
          .map((entry) => entry.message),
        [
          createInitializeRequest(1),
          {
            id: 'approval-response-validation',
            result: { decision: 'accept' },
          },
        ],
      )
    },
  )
})

test('CodexStdioTransport releases a Server request identity after its response', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'sequential_server_request_reuse' },
    async ({ transport }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))
      const first = await nextObservation(observations)

      assert.equal(first.kind, 'server_request')

      if (
        first.kind !== 'server_request' ||
        first.request.method !== 'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected first command approval Server request')
      }

      await first.request.respondError({
        code: -32601,
        message: 'first request dismissed by protocol response',
      })

      const second = await nextObservation(observations)
      assert.equal(second.kind, 'server_request')

      if (
        second.kind !== 'server_request' ||
        second.request.method !== 'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected reused command approval Server request')
      }

      assert.equal(second.request.id, first.request.id)
      await second.request.respond({ decision: 'accept' })
      assert.deepEqual(
        await initialize,
        expectedInitializeResponse({
          userAgent: 'fake-server-reuse-codex',
        }),
      )
    },
  )
})

test('CodexStdioTransport dismisses a Server request without writing and safely reuses its identity', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'dismissed_server_request_reuse' },
    async ({ transport, readJournal }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))
      const first = await nextObservation(observations)

      assert.equal(first.kind, 'server_request')

      if (
        first.kind !== 'server_request' ||
        first.request.method !== 'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected dismissible command approval Server request')
      }

      assert.equal(first.request.dismiss(), true)
      assert.equal(first.request.dismiss(), false)
      await assert.rejects(
        first.request.respond({ decision: 'accept' }),
        isProtocolFailure('duplicate_response'),
      )

      await transport.sendNotification({ method: 'initialized' })
      const second = await nextObservation(observations)
      assert.equal(second.kind, 'server_request')

      if (
        second.kind !== 'server_request' ||
        second.request.method !== 'item/commandExecution/requestApproval'
      ) {
        assert.fail('expected reused Server request after dismiss')
      }

      await second.request.respond({ decision: 'decline' })
      assert.deepEqual(
        await initialize,
        expectedInitializeResponse({
          userAgent: 'fake-server-dismiss-codex',
        }),
      )

      assert.deepEqual(
        (await readJournal({ minimumEntries: 3 }))
          .filter((entry) => entry.kind === 'client_message')
          .map((entry) => entry.message),
        [
          createInitializeRequest(1),
          { method: 'initialized' },
          {
            id: 'dismissed-server-request',
            result: { decision: 'decline' },
          },
        ],
      )
    },
  )
})

test('CodexStdioTransport rejects a duplicate concurrently active Server request identity', async () => {
  await withFakeCodexStdioTransport(
    { scenario: 'duplicate_active_server_requests' },
    async ({ transport }) => {
      const observations = transport.observations()[Symbol.asyncIterator]()
      const initialize = transport.sendRequest(createInitializeRequest(1))
      const rejection = assert.rejects(
        initialize,
        isProtocolFailure('duplicate_server_request'),
      )

      assert.equal((await nextObservation(observations)).kind, 'server_request')
      assert.deepEqual(await nextObservation(observations), {
        kind: 'protocol_error',
        code: 'duplicate_server_request',
        message: 'Codex app-server reused an active Server request identity',
      })
      await rejection
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

function expectedInitializeResponse(extra: Record<string, unknown> = {}) {
  return {
    userAgent: 'fake-codex',
    codexHome: '/fake/codex/home',
    platformFamily: 'unix',
    platformOs: 'linux',
    ...extra,
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
