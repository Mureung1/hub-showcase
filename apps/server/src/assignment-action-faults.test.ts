import assert from 'node:assert/strict'
import {
  mkdir,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import {
  CodexChatRuntimeError,
  type AnswerUserInput,
  type CancelUserInput,
  type CodexAccountReadiness,
  type CodexProductActivity,
  type CodexProductCapableRuntime,
  type CodexProductTurn,
  type InterruptTurnInput,
  type ReleaseThreadInput,
  type StartProductTurnInput,
  type StartThreadInput,
  type StartTurnInput,
} from '@ay-ple/codex-chat-runtime'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
} from '@ay-ple/product-contract'

import { createSemesterWorkspaceController } from './semester-workspace.js'
import {
  codexChatIdentity,
  configuredBootstrap,
  parseNdjson,
  postJson,
} from './testing/codex-chat-test-support.js'
import { withTestServer } from './testing/test-server.js'
import { materializeE2eSemesterWorkspace } from '../../../scripts/semester-workspace-materializer.mjs'

test('a stale selected digest admits no Run and starts no native Thread or Turn', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime()

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const stale = selected.map((material, index) =>
          index === 0
            ? {
                ...material,
                digest:
                  material.digest === '0'.repeat(64)
                    ? '1'.repeat(64)
                    : '0'.repeat(64),
              }
            : material,
        )

        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, stale),
        )

        assert.equal(response.status, 400)
        assert.deepEqual(await response.json(), {
          code: 'action_invalid',
          displayMessage: '학기 작업공간과 선택 자료를 확인해 주세요.',
        })
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        assert.equal(runtime.accountReadinessCalls, 1)
        assert.equal(runtime.startThreadCalls, 0)
        assert.equal(runtime.startProductTurnCalls, 0)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a bootstrap Account read excludes a concurrent product operation', async () => {
  const fixture = await createFaultFixture()
  const accountReadEntered = deferred<void>()
  const releaseAccountRead = deferred<void>()
  const runtime = new FaultRuntime({
    readAccountReadiness: async () => {
      accountReadEntered.resolve()
      await releaseAccountRead.promise
      return { state: 'ready' }
    },
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const bootstrap = fetch(`${baseUrl}/api/product/bootstrap`)
        await accountReadEntered.promise

        const action = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(action.status, 409)
        assert.equal((await action.json() as { code: string }).code, 'action_busy')
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        assert.equal(runtime.startThreadCalls, 0)

        releaseAccountRead.resolve()
        assert.equal((await bootstrap).status, 200)
      },
    )
  } finally {
    releaseAccountRead.resolve()
    await fixture.cleanup()
  }
})

test('a known pre-accept failure settles the one durable Run as not accepted without an accepted frame', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    startProductTurn: async () => {
      throw runtimeFailure(false)
    },
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        const frames = await readFrames(response)
        const runs = application.semesterWorkspace?.modelingRuns() ?? []

        assert.equal(runs.length, 1)
        assert.equal(runs[0]?.status, 'not_accepted')
        assert.equal(runs[0]?.validationOutcome, 'failed')
        assert.equal(frames.some(({ type }) => type === 'operation.accepted'), false)
        assert.deepEqual(
          frames.map(({ type }) => type),
          ['operation.preparing', 'operation.terminal'],
        )
        assert.equal(frames[0]?.runId, runs[0]?.id)
        assert.equal(frames[1]?.runId, runs[0]?.id)
        assert.equal(frames[1]?.status, 'not_accepted')
        assert.equal(runtime.startThreadCalls, 1)
        assert.equal(runtime.startProductTurnCalls, 1)
        assertNoNativeIdentities(frames)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('an unknown pre-accept outcome is not retried and reopens as unknown on the same Run', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    startProductTurn: async () => {
      throw runtimeFailure(true)
    },
  })
  let runId = ''
  let actionId = ''

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        const frames = await readFrames(response)
        const runs = application.semesterWorkspace?.modelingRuns() ?? []

        assert.equal(runs.length, 1)
        assert.equal(runs[0]?.status, 'acceptance_unknown')
        assert.equal(runs[0]?.validationOutcome, 'unknown')
        runId = runs[0]!.id
        actionId = runs[0]!.actionId
        assert.equal(frames.some(({ type }) => type === 'operation.accepted'), false)
        assert.equal(terminalFrames(frames).length, 1)
        assert.equal(terminalFrames(frames)[0]?.status, 'acceptance_unknown')
        assert.equal(runtime.startThreadCalls, 1)
        assert.equal(runtime.startProductTurnCalls, 1)
        assertNoNativeIdentities(frames)
      },
    )

    const reopened = createSemesterWorkspaceController(fixture.bootstrap)
    await reopened.activate()
    const runs = reopened.modelingRuns()
    assert.equal(runs.length, 1)
    assert.equal(runs[0]?.id, runId)
    assert.equal(runs[0]?.actionId, actionId)
    assert.equal(runs[0]?.status, 'unknown')
    assert.equal(runs[0]?.validationOutcome, 'unknown')
    assert.equal(runs[0]?.failureCode, 'reconciled_after_restart')
  } finally {
    await fixture.cleanup()
  }
})

test('an explicit retry after known rejection creates a distinct Run and only the retry reaches an accepted Turn', async () => {
  const fixture = await createFaultFixture()
  let attempts = 0
  const runtime = new FaultRuntime({
    startProductTurn: async (input) => {
      attempts += 1
      if (attempts === 1) throw runtimeFailure(false)
      return completedTurn(input, 'turn-native-retry')
    },
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const request = actionRequest(workspace.course!.id, selected)

        const firstFrames = await readFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            request,
          ),
        )
        const secondFrames = await readFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            request,
          ),
        )
        const runs = application.semesterWorkspace?.modelingRuns() ?? []

        assert.equal(runs.length, 2)
        assert.equal(runs[0]?.status, 'not_accepted')
        assert.equal(runs[1]?.status, 'completed')
        assert.notEqual(runs[0]?.id, runs[1]?.id)
        assert.notEqual(runs[0]?.actionId, runs[1]?.actionId)
        assert.equal(
          firstFrames.some(({ type }) => type === 'operation.accepted'),
          false,
        )
        assert.equal(
          secondFrames.filter(({ type }) => type === 'operation.accepted').length,
          1,
        )
        assert.equal(runtime.startThreadCalls, 1)
        assert.equal(runtime.startProductTurnCalls, 2)
        assert.equal(runtime.acceptedTurns, 1)
        assertNoNativeIdentities([...firstFrames, ...secondFrames])
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('an explicit retry binds one new Run and Turn to the interrupted receipt while a duplicate race starts no second Turn', async () => {
  const fixture = await createFaultFixture()
  const retryStarted = deferred<void>()
  const releaseRetry = deferred<void>()
  let attempts = 0
  const runtime = new FaultRuntime({
    startProductTurn: async (input) => {
      attempts += 1
      if (attempts === 1) {
        return {
          threadId: input.threadId,
          turnId: 'turn-native-interrupted',
          events: activities([
            {
              type: 'turn.completed',
              threadId: input.threadId,
              turnId: 'turn-native-interrupted',
              status: 'interrupted',
            },
          ]),
        }
      }
      retryStarted.resolve()
      return {
        threadId: input.threadId,
        turnId: 'turn-native-explicit-retry',
        events: (async function* (): AsyncIterable<CodexProductActivity> {
          await releaseRetry.promise
          yield {
            type: 'turn.completed',
            threadId: input.threadId,
            turnId: 'turn-native-explicit-retry',
            status: 'completed',
          }
        })(),
      }
    },
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const request = actionRequest(workspace.course!.id, selected)
        await readFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            request,
          ),
        )
        const interrupted = application.semesterWorkspace?.modelingRuns()[0]
        assert.ok(interrupted)
        assert.equal(interrupted.status, 'interrupted')

        const retryRequest = {
          ...request,
          retryOfRunId: interrupted.id,
        }
        const retryResponse = await postJson(
          `${baseUrl}/api/product/actions/first-assignment/retry`,
          retryRequest,
        )
        assert.equal(retryResponse.status, 200)
        await retryStarted.promise

        const duplicate = await postJson(
          `${baseUrl}/api/product/actions/first-assignment/retry`,
          retryRequest,
        )
        assert.equal(duplicate.status, 409)
        releaseRetry.resolve()
        await readFrames(retryResponse)

        const lateDuplicate = await postJson(
          `${baseUrl}/api/product/actions/first-assignment/retry`,
          retryRequest,
        )
        assert.equal(lateDuplicate.status, 409)

        const runs = application.semesterWorkspace?.modelingRuns() ?? []
        assert.equal(runs.length, 2)
        assert.equal(runs[0]?.id, interrupted.id)
        assert.equal(runs[0]?.status, 'interrupted')
        assert.equal(runs[1]?.retryOfRunId, interrupted.id)
        assert.equal(runs[1]?.status, 'completed')
        assert.notEqual(runs[1]?.id, interrupted.id)
        assert.notEqual(runs[1]?.actionId, interrupted.actionId)
        assert.equal(runtime.startProductTurnCalls, 2)
        assert.equal(runtime.acceptedTurns, 2)
      },
    )
  } finally {
    releaseRetry.resolve()
    await fixture.cleanup()
  }
})

test('interrupt acknowledgement is nonterminal and the Run stays running until the interrupted terminal arrives', async () => {
  const fixture = await createFaultFixture()
  const interruptRequested = deferred<void>()
  const releaseTerminal = deferred<void>()
  const runtime = new FaultRuntime({
    interrupt: async () => {
      interruptRequested.resolve()
    },
    startProductTurn: async (input) => ({
      threadId: input.threadId,
      turnId: 'turn-native-interrupt',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        await interruptRequested.promise
        yield {
          type: 'turn.interrupt_acknowledged',
          threadId: input.threadId,
          turnId: 'turn-native-interrupt',
        }
        await releaseTerminal.promise
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-native-interrupt',
          status: 'interrupted',
        }
      })(),
    }),
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        assert.equal(response.status, 200)
        const reader = response.body?.getReader()
        assert.ok(reader)
        const trace = new NdjsonTrace(reader)
        const accepted = await trace.until(
          ({ type }) => type === 'operation.accepted',
        )
        const operationId = String(accepted.operationId)

        const interruptResponse = await postJson(
          `${baseUrl}/api/product/operations/${operationId}/interrupt`,
          {},
        )
        assert.equal(interruptResponse.status, 202)
        const acknowledgement = await trace.until(
          ({ type }) => type === 'interrupt.acknowledged',
        )
        assert.equal(acknowledgement.operationId, operationId)
        const running = application.semesterWorkspace?.modelingRuns()[0]
        assert.equal(running?.status, 'running')
        assert.equal(terminalFrames(trace.current()).length, 0)

        releaseTerminal.resolve()
        const frames = await trace.rest()
        const terminals = terminalFrames(frames)
        assert.equal(terminals.length, 1)
        assert.equal(terminals[0]?.status, 'interrupted')
        assert.equal(
          application.semesterWorkspace?.modelingRuns()[0]?.status,
          'interrupted',
        )
        assert.equal(runtime.interruptCalls, 1)
        assertNoNativeIdentities(frames)
      },
    )
  } finally {
    releaseTerminal.resolve()
    await fixture.cleanup()
  }
})

for (const scenario of ['runtime.failed', 'EOF'] as const) {
  test(`an accepted ${scenario} stream settles unknown exactly once`, async () => {
    const fixture = await createFaultFixture()
    const runtime = new FaultRuntime({
      startProductTurn: async (input) => ({
        threadId: input.threadId,
        turnId: `turn-native-${scenario === 'EOF' ? 'eof' : 'failed'}`,
        events:
          scenario === 'EOF'
            ? emptyActivities()
            : activities([
                {
                  type: 'runtime.failed',
                  code: 'runtime_lost',
                  displayMessage: 'Private runtime failure detail.',
                  mutationOutcomeKnown: false,
                },
              ]),
      }),
    })

    try {
      await withTestServer(
        {
          codexChat: configuredBootstrap(runtime),
          semesterWorkspace: fixture.bootstrap,
        },
        async (baseUrl, application) => {
          const workspace = await activateCourse(application)
          const selected = selectCanonicalMaterials(workspace.materials)
          const frames = await readFrames(
            await postJson(
              `${baseUrl}/api/product/actions/first-assignment`,
              actionRequest(workspace.course!.id, selected),
            ),
          )
          const runs = application.semesterWorkspace?.modelingRuns() ?? []
          const terminals = terminalFrames(frames)

          assert.equal(runs.length, 1)
          assert.equal(runs[0]?.status, 'unknown')
          assert.equal(runs[0]?.validationOutcome, 'unknown')
          assert.equal(terminals.length, 1)
          assert.equal(terminals[0]?.status, 'unknown')
          assert.equal(
            frames.filter(({ type }) => type === 'operation.accepted').length,
            1,
          )
          assert.equal(runtime.startProductTurnCalls, 1)
          assertNoNativeIdentities(frames)
        },
      )
    } finally {
      await fixture.cleanup()
    }
  })
}

test('a bind-store failure after native acceptance records acceptance unknown without publishing accepted', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    startProductTurn: async (input) => completedTurn(input, 'turn-native-bind-fault'),
  })
  const faultingBootstrap = {
    ...fixture.bootstrap,
    beforeActionStoreWrite(point: string) {
      if (point === 'bind') throw new Error('injected bind write failure')
    },
  }

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: faultingBootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const frames = await readFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            actionRequest(workspace.course!.id, selected),
          ),
        )
        const runs = application.semesterWorkspace?.modelingRuns() ?? []

        assert.equal(runs.length, 1)
        assert.equal(runs[0]?.status, 'acceptance_unknown')
        assert.equal(runs[0]?.validationOutcome, 'unknown')
        assert.deepEqual(runs[0]?.nativeCorrelation, {
          threadId: 'thread-native-fault',
          turnId: 'turn-native-bind-fault',
        })
        assert.equal(frames.some(({ type }) => type === 'operation.accepted'), false)
        assert.equal(terminalFrames(frames).length, 1)
        assert.equal(terminalFrames(frames)[0]?.status, 'acceptance_unknown')
        assert.equal(runtime.startProductTurnCalls, 1)
        assert.equal(runtime.interruptCalls, 1)
        assertNoNativeIdentities(frames)
      },
    )
    const reopened = createSemesterWorkspaceController(fixture.bootstrap)
    await reopened.activate()
    assert.equal(reopened.modelingRuns()[0]?.status, 'unknown')
    assert.deepEqual(reopened.modelingRuns()[0]?.nativeCorrelation, {
      threadId: 'thread-native-fault',
      turnId: 'turn-native-bind-fault',
    })
  } finally {
    await fixture.cleanup()
  }
})

test('a Runtime close failure cannot suppress bind-failure Run settlement or its terminal frame', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    close: async () => {
      throw new Error('injected Runtime close failure')
    },
    startProductTurn: async (input) =>
      completedTurn(input, 'turn-native-bind-close-fault'),
  })
  const faultingBootstrap = {
    ...fixture.bootstrap,
    beforeActionStoreWrite(point: string) {
      if (point === 'bind') throw new Error('injected bind write failure')
    },
  }

  try {
    await assert.rejects(
      withTestServer(
        {
          codexChat: configuredBootstrap(runtime),
          semesterWorkspace: faultingBootstrap,
        },
        async (baseUrl, application) => {
          const workspace = await activateCourse(application)
          const selected = selectCanonicalMaterials(workspace.materials)
          const frames = await readFrames(
            await postJson(
              `${baseUrl}/api/product/actions/first-assignment`,
              actionRequest(workspace.course!.id, selected),
            ),
          )
          const runs = application.semesterWorkspace?.modelingRuns() ?? []
          const terminals = terminalFrames(frames)
          const run = runs[0]
          const terminal = terminals[0]

          assert.equal(runs.length, 1)
          assert.equal(terminals.length, 1)
          assert.equal(run?.status, 'acceptance_unknown')
          assert.equal(run?.validationOutcome, 'unknown')
          assert.equal(terminal?.status, run?.status)
          assert.equal(terminal?.validationOutcome, run?.validationOutcome)
          assert.equal(runtime.closeCalls, 1)
          assertNoNativeIdentities(frames)
        },
      ),
      /injected Runtime close failure/,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a Runtime close failure cannot strand a Run when private MCP binding fails', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    close: async () => {
      throw new Error('injected Runtime close failure')
    },
    startProductTurn: async (input) =>
      completedTurn(input, 'turn/native-mcp-bind-fault'),
  })

  try {
    await assert.rejects(
      withTestServer(
        {
          codexChat: configuredBootstrap(runtime),
          semesterWorkspace: fixture.bootstrap,
        },
        async (baseUrl, application) => {
          const workspace = await activateCourse(application)
          const selected = selectCanonicalMaterials(workspace.materials)
          const frames = await readFrames(
            await postJson(
              `${baseUrl}/api/product/actions/first-assignment`,
              actionRequest(workspace.course!.id, selected),
            ),
          )
          const runs = application.semesterWorkspace?.modelingRuns() ?? []
          const terminals = terminalFrames(frames)

          assert.equal(runs.length, 1)
          assert.equal(runs[0]?.status, 'unknown')
          assert.equal(runs[0]?.validationOutcome, 'unknown')
          assert.equal(terminals.length, 1)
          assert.equal(terminals[0]?.status, 'unknown')
          assert.equal(terminals[0]?.validationOutcome, 'unknown')
          assert.equal(runtime.closeCalls, 1)
          assertNoNativeIdentities(frames)
        },
      ),
      /injected Runtime close failure/,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('a start-failure store fault preserves recovery state and emits one honest unknown terminal', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    startProductTurn: async () => {
      throw runtimeFailure(false)
    },
  })
  const faultingBootstrap = {
    ...fixture.bootstrap,
    beforeActionStoreWrite(point: string) {
      if (point === 'start_failure') {
        throw new Error('injected start-failure write failure')
      }
    },
  }

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: faultingBootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const frames = await readFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            actionRequest(workspace.course!.id, selected),
          ),
        )
        const runs = application.semesterWorkspace?.modelingRuns() ?? []
        const terminals = terminalFrames(frames)

        assert.equal(runs.length, 1)
        assert.equal(runs[0]?.status, 'starting')
        assert.equal(terminals.length, 1)
        assert.equal(terminals[0]?.status, 'unknown')
        assert.equal(terminals[0]?.validationOutcome, 'unknown')
        assert.equal(terminals[0]?.failureCode, 'run_settlement_unknown')
        assertNoNativeIdentities(frames)
      },
    )

    const reopened = createSemesterWorkspaceController(fixture.bootstrap)
    await reopened.activate()
    assert.equal(reopened.modelingRuns()[0]?.status, 'unknown')
    assert.equal(
      reopened.modelingRuns()[0]?.failureCode,
      'reconciled_after_restart',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('an unregistered out-of-scratch TXT write does not invalidate the authoritative Run settlement', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime({
    startProductTurn: async (input) => ({
      threadId: input.threadId,
      turnId: 'turn-native-terminal-drift',
      events: (async function* (): AsyncIterable<CodexProductActivity> {
        await writeFile(
          path.join(fixture.workspaceRoot, 'native-output.txt'),
          'scratch 밖에 생성된 native 출력',
          'utf8',
        )
        yield {
          type: 'turn.completed',
          threadId: input.threadId,
          turnId: 'turn-native-terminal-drift',
          status: 'completed',
        }
      })(),
    }),
  })

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: fixture.bootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const frames = await readFrames(
          await postJson(
            `${baseUrl}/api/product/actions/first-assignment`,
            actionRequest(workspace.course!.id, selected),
          ),
        )
        const run = application.semesterWorkspace?.modelingRuns()[0]
        const terminal = terminalFrames(frames)[0]

        assert.equal(run?.status, 'completed')
        assert.equal(run?.validationOutcome, 'failed')
        assert.equal(run?.failureCode, 'proposal_not_observed')
        assert.equal(terminal?.status, run?.status)
        assert.equal(terminal?.validationOutcome, run?.validationOutcome)
        assert.equal(terminal?.failureCode, run?.failureCode)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('product operation coordinator keeps Chat busy until Assignment settlement and stream close finish', async () => {
  const fixture = await createFaultFixture()
  const settleEntered = deferred<void>()
  const releaseSettle = deferred<void>()
  const runtime = new FaultRuntime({
    startProductTurn: async (input) =>
      completedTurn(input, 'turn-native-settlement-race'),
  })
  const blockingBootstrap = {
    ...fixture.bootstrap,
    async beforeActionStoreWrite(point: string) {
      if (point !== 'settle') return
      settleEntered.resolve()
      await releaseSettle.promise
    },
  }

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: blockingBootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const request = actionRequest(workspace.course!.id, selected)
        const firstResponse = postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          request,
        )
        await settleEntered.promise

        const bootstrap = await fetch(`${baseUrl}/api/product/bootstrap`)
        assert.equal(bootstrap.status, 200)
        assert.equal(
          (await bootstrap.json() as {
            accountReadiness: { state: string }
          }).accountReadiness.state,
          'unavailable',
        )
        assert.equal(runtime.accountReadinessCalls, 1)

        const second = await postJson(
          `${baseUrl}/api/product/chat/messages`,
          { text: '이 작업과 동시에 대화해 줘.', materials: [] },
        )
        assert.equal(second.status, 409)
        assert.equal((await second.json() as { code: string }).code, 'action_busy')

        releaseSettle.resolve()
        await readFrames(await firstResponse)
      },
    )
  } finally {
    releaseSettle.resolve()
    await fixture.cleanup()
  }
})

test('a cleanup deadline closes the Runtime and leaves recovery blocking the next action', async () => {
  const fixture = await createFaultFixture()
  const closeStarted = deferred<void>()
  const releaseClose = deferred<void>()
  const runtime = new FaultRuntime({
    startProductTurn: async (input) =>
      completedTurn(input, 'turn-native-cleanup-deadline'),
    close: async () => {
      closeStarted.resolve()
      await releaseClose.promise
    },
  })
  const replacementRuntime = new FaultRuntime()
  let runtimeCreations = 0
  const cleanupBarrier = deferred<void>()
  const cleanupFaultBootstrap = {
    ...fixture.bootstrap,
    actionCleanupDeadlineMs: 5,
    beforeActionArtifactCleanup: () => cleanupBarrier.promise,
  }

  try {
    await withTestServer(
      {
        codexChat: {
          ...codexChatIdentity,
          createRuntime: async () => {
            runtimeCreations += 1
            return runtimeCreations === 1 ? runtime : replacementRuntime
          },
        },
        semesterWorkspace: cleanupFaultBootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const request = actionRequest(workspace.course!.id, selected)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          request,
        )
        assert.ok(response.body)
        const trace = new NdjsonTrace(response.body.getReader())
        const terminal = await trace.until(
          (frame) => frame.type === 'operation.terminal',
        )
        await closeStarted.promise

        assert.equal(terminal.status, 'completed')
        assert.equal(runtime.closeCalls, 1)
        const bootstrapDuringClose = await fetch(
          `${baseUrl}/api/product/bootstrap`,
        )
        assert.equal(bootstrapDuringClose.status, 200)
        assert.deepEqual(
          (await bootstrapDuringClose.json() as {
            accountReadiness: unknown
          }).accountReadiness,
          {
            state: 'unavailable',
            displayMessage:
              'Codex 상태를 확인할 수 없습니다. 자료 작업공간은 계속 사용할 수 있습니다.',
          },
        )
        assert.equal(runtime.accountReadinessCalls, 1)
        const second = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          request,
        )
        assert.equal(second.status, 409)
        assert.equal((await second.json() as { code: string }).code, 'action_busy')

        releaseClose.resolve()
        await trace.rest()
        const bootstrapAfterClose = await fetch(
          `${baseUrl}/api/product/bootstrap`,
        )
        assert.equal(bootstrapAfterClose.status, 200)
        assert.deepEqual(
          (await bootstrapAfterClose.json() as {
            accountReadiness: unknown
          }).accountReadiness,
          { state: 'ready' },
        )
        assert.equal(runtimeCreations, 2)
        assert.equal(replacementRuntime.accountReadinessCalls, 1)
      },
    )
  } finally {
    cleanupBarrier.resolve()
    releaseClose.resolve()
    await fixture.cleanup()
  }
})

test('a pre-commit staging failure leaves no Run and strictly rolls back its artifacts', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime()
  const stagingFaultBootstrap = {
    ...fixture.bootstrap,
    beforeActionStoreWrite(point: string) {
      if (point === 'prepare') {
        throw new Error('injected pre-commit staging failure')
      }
    },
  }

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: stagingFaultBootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )

        assert.equal(response.status, 503)
        assert.deepEqual(application.semesterWorkspace?.modelingRuns(), [])
        assert.equal(runtime.startThreadCalls, 0)
        assert.equal(runtime.startProductTurnCalls, 0)
        assert.deepEqual(
          await readdir(
            path.join(fixture.workspaceRoot, '.ay-ple', 'runtime-scratch'),
          ),
          [],
        )
        assert.deepEqual(
          await readdir(path.join(fixture.appDataRoot, 'assignment-runs')),
          [],
        )
        assert.equal(runtime.closeCalls, 0)
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

test('recipe drift after admission settles not accepted before native start', async () => {
  const fixture = await createFaultFixture()
  const runtime = new FaultRuntime()
  const recipePath = path.join(
    fixture.appDataRoot,
    'modeling-recipes',
    'first-assignment',
    '1',
    'SKILL.md',
  )
  const externalRecipePath = path.join(
    path.dirname(fixture.appDataRoot),
    'external-SKILL.md',
  )
  let recipeReplaced = false
  const recipeDriftBootstrap = {
    ...fixture.bootstrap,
    async beforeActionStoreWrite(point: string) {
      if (point !== 'prepare' || recipeReplaced) return
      recipeReplaced = true
      const exactBytes = await readFile(recipePath)
      await writeFile(externalRecipePath, exactBytes)
      await rm(recipePath)
      await symlink(externalRecipePath, recipePath, 'file')
    },
  }

  try {
    await withTestServer(
      {
        codexChat: configuredBootstrap(runtime),
        semesterWorkspace: recipeDriftBootstrap,
      },
      async (baseUrl, application) => {
        const workspace = await activateCourse(application)
        const selected = selectCanonicalMaterials(workspace.materials)
        const response = await postJson(
          `${baseUrl}/api/product/actions/first-assignment`,
          actionRequest(workspace.course!.id, selected),
        )
        const frames = await readFrames(response)
        const runs = application.semesterWorkspace?.modelingRuns() ?? []

        assert.equal(recipeReplaced, true)
        assert.equal(runtime.startThreadCalls, 0)
        assert.equal(runtime.startProductTurnCalls, 0)
        assert.equal(runs.length, 1)
        assert.equal(runs[0]?.status, 'not_accepted')
        assert.equal(runs[0]?.validationOutcome, 'failed')
        assert.deepEqual(
          frames.map(({ type }) => type),
          ['operation.preparing', 'operation.terminal'],
        )
        assert.equal(frames[1]?.runId, runs[0]?.id)
        assert.equal(frames[1]?.status, 'not_accepted')
        assert.equal(frames[1]?.failureCode, 'recipe_invalid')
        assert.equal(
          frames.some(({ type }) => type === 'operation.accepted'),
          false,
        )
      },
    )
  } finally {
    await fixture.cleanup()
  }
})

type MaterialSelection = {
  readonly id: string
  readonly digest: string
}

async function createFaultFixture() {
  const materialized = await materializeE2eSemesterWorkspace()
  const packageRoot = path.join(materialized.runRoot, 'package')
  const appDataRoot = path.join(materialized.runRoot, 'app-data')
  await Promise.all([packageRoot, appDataRoot].map((root) => mkdir(root)))
  return {
    bootstrap: {
      packageRoot,
      appDataRoot,
      chooseDirectory: async () => materialized.workspaceRoot,
    },
    appDataRoot,
    workspaceRoot: materialized.workspaceRoot,
    cleanup: materialized.cleanup,
  }
}

async function activateCourse(application: {
  readonly semesterWorkspace?: {
    activate(): Promise<{ readonly status: 'activated' | 'cancelled' }>
    createCourse(displayName: string): Promise<{
      readonly course: { readonly id: string } | null
      readonly materials: readonly {
        readonly id: string
        readonly relativePath: string
        readonly digest: string
      }[]
    }>
  }
}) {
  const activation = await application.semesterWorkspace?.activate()
  assert.equal(activation?.status, 'activated')
  const workspace = await application.semesterWorkspace?.createCourse(
    '문제해결글쓰기',
  )
  assert.ok(workspace?.course)
  return workspace
}

function selectCanonicalMaterials(
  materials: readonly {
    readonly id: string
    readonly relativePath: string
    readonly digest: string
  }[],
): readonly MaterialSelection[] {
  return [
    requireMaterial(materials, 'lms-outline-notice.txt'),
    requireMaterial(materials, 'problem-solving-syllabus.txt'),
  ].map((material) => ({ id: material.id, digest: material.digest }))
}

function requireMaterial(
  materials: readonly {
    readonly id: string
    readonly relativePath: string
    readonly digest: string
  }[],
  relativePath: string,
) {
  const material = materials.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  assert.ok(material)
  return material
}

function actionRequest(
  courseId: string,
  materials: readonly MaterialSelection[],
): Record<string, unknown> {
  return {
    courseId,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials,
  }
}

async function readFrames(response: Response): Promise<Record<string, unknown>[]> {
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/x-ndjson')
  return parseNdjson(await response.text())
}

function terminalFrames(
  frames: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  return frames.filter(({ type }) => type === 'operation.terminal')
}

function assertNoNativeIdentities(
  frames: readonly Record<string, unknown>[],
): void {
  const trace = JSON.stringify(frames)
  assert.equal(trace.includes('thread-native'), false)
  assert.equal(trace.includes('turn-native'), false)
  assert.equal(trace.includes('threadId'), false)
  assert.equal(trace.includes('turnId'), false)
}

function runtimeFailure(unknownOutcome: boolean): CodexChatRuntimeError {
  return new CodexChatRuntimeError({
    code: unknownOutcome ? 'runtime_response_timeout' : 'turn_not_accepted',
    displayMessage: 'Private native admission detail.',
    unknownOutcome,
  })
}

function completedTurn(
  input: StartProductTurnInput,
  turnId: string,
): CodexProductTurn {
  return {
    threadId: input.threadId,
    turnId,
    events: activities([
      {
        type: 'turn.completed',
        threadId: input.threadId,
        turnId,
        status: 'completed',
      },
    ]),
  }
}

function activities(
  values: readonly CodexProductActivity[],
): AsyncIterable<CodexProductActivity> {
  return (async function* () {
    yield* values
  })()
}

function emptyActivities(): AsyncIterable<CodexProductActivity> {
  return (async function* () {})()
}

type Deferred<T> = {
  readonly promise: Promise<T>
  resolve(value?: T): void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value?: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

class FaultRuntime implements CodexProductCapableRuntime {
  readonly terminal = new Promise<CodexChatRuntimeError>(() => undefined)
  accountReadinessCalls = 0
  startThreadCalls = 0
  startProductTurnCalls = 0
  acceptedTurns = 0
  interruptCalls = 0
  closeCalls = 0
  private readonly startProductTurnImplementation: (
    input: StartProductTurnInput,
  ) => Promise<CodexProductTurn>
  private readonly readAccountReadinessImplementation: () => Promise<CodexAccountReadiness>
  private readonly interruptImplementation: (
    input: InterruptTurnInput,
  ) => Promise<void>
  private readonly closeImplementation: () => Promise<void>

  constructor(options: {
    readonly readAccountReadiness?: () => Promise<CodexAccountReadiness>
    readonly startProductTurn?: (
      input: StartProductTurnInput,
    ) => Promise<CodexProductTurn>
    readonly interrupt?: (input: InterruptTurnInput) => Promise<void>
    readonly close?: () => Promise<void>
  } = {}) {
    this.readAccountReadinessImplementation =
      options.readAccountReadiness ?? (async () => ({ state: 'ready' }))
    this.startProductTurnImplementation =
      options.startProductTurn ??
      (async () => {
        throw new Error('startProductTurn was not expected')
      })
    this.interruptImplementation = options.interrupt ?? (async () => undefined)
    this.closeImplementation = options.close ?? (async () => undefined)
  }

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    this.accountReadinessCalls += 1
    return this.readAccountReadinessImplementation()
  }

  async startThread(_input?: StartThreadInput) {
    this.startThreadCalls += 1
    return { threadId: 'thread-native-fault' }
  }

  async startTurn(_input: StartTurnInput): Promise<never> {
    throw new Error('legacy startTurn was not expected')
  }

  async startProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    this.startProductTurnCalls += 1
    const turn = await this.startProductTurnImplementation(input)
    this.acceptedTurns += 1
    return turn
  }

  async answerUserInput(_input: AnswerUserInput): Promise<void> {
    throw new Error('answerUserInput was not expected')
  }

  async cancelUserInput(_input: CancelUserInput): Promise<void> {
    throw new Error('cancelUserInput was not expected')
  }

  async interrupt(input: InterruptTurnInput): Promise<void> {
    this.interruptCalls += 1
    await this.interruptImplementation(input)
  }

  async releaseThread(_input: ReleaseThreadInput): Promise<void> {}

  async close(): Promise<void> {
    this.closeCalls += 1
    await this.closeImplementation()
  }
}

class NdjsonTrace {
  private readonly frames: Record<string, unknown>[] = []
  private readonly decoder = new TextDecoder()
  private buffer = ''
  private done = false

  constructor(
    private readonly reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {}

  current(): Record<string, unknown>[] {
    return [...this.frames]
  }

  async until(
    predicate: (frame: Record<string, unknown>) => boolean,
  ): Promise<Record<string, unknown>> {
    while (true) {
      const existing = this.frames.find(predicate)
      if (existing) return existing
      await this.readNext()
      if (this.done) {
        throw new Error(
          `NDJSON stream ended before the target frame: ${JSON.stringify(this.frames)}`,
        )
      }
    }
  }

  async rest(): Promise<Record<string, unknown>[]> {
    while (!this.done) await this.readNext()
    return [...this.frames]
  }

  private async readNext(): Promise<void> {
    const chunk = await this.reader.read()
    if (chunk.done) {
      this.done = true
      this.buffer += this.decoder.decode()
      if (this.buffer.trim().length > 0) {
        this.frames.push(JSON.parse(this.buffer) as Record<string, unknown>)
      }
      return
    }
    this.buffer += this.decoder.decode(chunk.value, { stream: true })
    const lines = this.buffer.split('\n')
    this.buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (line.length > 0) {
        this.frames.push(JSON.parse(line) as Record<string, unknown>)
      }
    }
  }
}
