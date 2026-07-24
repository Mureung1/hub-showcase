import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  CodexAccountLifecycle,
  CodexBrowserLoginCancellation,
  CodexBrowserLoginStartResult,
  CodexFreshAccount,
} from '@ay-ple/codex-chat-runtime'
import {
  DeterministicCodexChatRuntime,
  type DeterministicCodexChatRuntimeOptions,
} from '@ay-ple/codex-chat-runtime/testing'
import {
  decodePublicPreviewAccountProjection,
  type PublicPreviewAccountProjection,
} from '@ay-ple/product-contract'
import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
} from '@ay-ple/product-contract/testing'

import { createAccountRuntimeCoordinator } from './coordinator.js'
import {
  AccountRuntimeCommandError,
  createAccountRuntimeRouteAdapter,
  type AccountRuntimeRouteAdapter,
} from './route-adapter.js'
import {
  guardProductOperationCoordinatorWithAccountRuntimeLease,
  type ProductOperationCoordinator,
} from '../product-operation-coordinator.js'

type Workspace = { readonly workspaceId: string }
type Ready = { readonly state: 'ready' }

test('checking and fresh signed-out observations exactly match frozen Browser fixtures', async () => {
  const accountRead = deferred<{
    readonly status: 'ok'
    readonly account: { readonly state: 'signed_out' }
  }>()
  const harness = createHarness({
    accountReads: [accountRead.promise],
  })
  const firstObserve = harness.adapter.observe({ signal: signal() })
  await waitForCall(harness.runtime, 'readAccount')

  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.checking,
  )
  accountRead.resolve({
    status: 'ok',
    account: { state: 'signed_out' },
  })
  assertProjection(
    await firstObserve,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )
})

test('duplicate login start joins one native attempt and exposes exact starting and pending fixtures', async () => {
  const loginStart = deferred<CodexBrowserLoginStartResult>()
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
    browserLoginStarts: [loginStart.promise],
  })
  await expectInitialAccount(
    harness.adapter,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )

  const first = harness.adapter.dispatch({
    command: { command: 'account.login.start' },
    signal: signal(),
  })
  const duplicate = harness.adapter.dispatch({
    command: { command: 'account.login.start' },
    signal: signal(),
  })
  await waitForCall(harness.runtime, 'startBrowserLogin')
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginStarting,
  )
  assert.equal(harness.adapter.hasPendingAttempt(), true)

  loginStart.resolve({
    status: 'pending',
    attemptId: 'account_attempt_primary',
    authUrl: 'https://auth.openai.com/codex',
    expiresAt: '2026-07-23T12:00:00.000Z',
  })
  assertProjection(
    await first,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
  )
  assertProjection(
    await duplicate,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
  )
  assertProjection(
    await harness.adapter.dispatch({
      command: { command: 'account.login.start' },
      signal: signal(),
    }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
  )
  assert.deepEqual(
    harness.runtime.calls.filter(
      ({ operation }) => operation === 'startBrowserLogin',
    ),
    [
      {
        operation: 'startBrowserLogin',
        input: {
          attemptId: 'account_attempt_primary',
          expiresAt: '2026-07-23T12:00:00.000Z',
        },
      },
    ],
  )
})

test('login start waits behind an active product operation on the same app-wide lease', async () => {
  const finishProduct = deferred<void>()
  let productStarted = false
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
    browserLoginStarts: [pendingLoginStart()],
  })
  await expectInitialAccount(
    harness.adapter,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )
  const product = guardProductOperationCoordinatorWithAccountRuntimeLease(
    fakeProductOperationCoordinator(async () => {
      productStarted = true
      await finishProduct.promise
    }),
    harness.coordinator,
  )
  const runningProduct = product.sendChat(
    { text: '학기 상태를 확인해 줘.', materials: [] },
    {
      disconnected: () => false,
      mcpUrl: 'http://127.0.0.1:43123',
      sink: {
        write: async () => true,
        end: () => undefined,
      },
    },
  )
  await waitFor(() => productStarted)
  const login = harness.adapter.dispatch({
    command: { command: 'account.login.start' },
    signal: signal(),
  })
  await Promise.resolve()

  assert.deepEqual(
    harness.runtime.calls.map(({ operation }) => operation),
    ['readAccount'],
  )
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginStarting,
  )
  finishProduct.resolve()
  await runningProduct
  assertProjection(await login, PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending)
})

test('aborted Browser observation does not synthesize login cancellation or discard the pending attempt', async () => {
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
    browserLoginStarts: [pendingLoginStart()],
    browserLoginAttempts: [
      { status: 'pending', attemptId: 'account_attempt_primary' },
    ],
  })
  await startPendingLogin(harness.adapter)
  const closedTab = new AbortController()
  closedTab.abort()

  assertProjection(
    await harness.adapter.observe({ signal: closedTab.signal }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assert.equal(
    harness.runtime.calls.some(
      ({ operation }) => operation === 'cancelBrowserLogin',
    ),
    false,
  )
  assert.equal(harness.adapter.hasPendingAttempt(), true)
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
  )
})

test('matching pending status is idempotent and completion verifies fresh ChatGPT before release', async () => {
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'chatgpt' } },
    ],
    browserLoginStarts: [pendingLoginStart()],
    browserLoginAttempts: [
      { status: 'pending', attemptId: 'account_attempt_primary' },
      { status: 'completed', attemptId: 'account_attempt_primary' },
    ],
    browserLoginReleases: [
      { status: 'released', attemptId: 'account_attempt_primary' },
    ],
  })
  await startPendingLogin(harness.adapter)

  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
  )
  await Promise.resolve()
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.verifying,
  )
  await waitForCall(harness.runtime, 'releaseBrowserLoginAttempt')
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )
  assert.equal(harness.adapter.hasPendingAttempt(), false)

  const completionIndex = callIndex(
    harness.runtime,
    'readBrowserLoginAttempt',
    1,
  )
  const freshReadIndex = callIndex(harness.runtime, 'readAccount', 2)
  const releaseIndex = callIndex(
    harness.runtime,
    'releaseBrowserLoginAttempt',
  )
  assert.ok(completionIndex < freshReadIndex)
  assert.ok(freshReadIndex < releaseIndex)
  assert.equal(harness.readyInvalidations.count, 2)
})

test('cancel versus matching completion race lets fresh ChatGPT connection win', async () => {
  const harness = createHarness(
    {
      accountReads: [
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'chatgpt' } },
      ],
      browserLoginStarts: [pendingLoginStart()],
      browserLoginCancellations: [
        {
          status: 'already_settled',
          attemptId: 'account_attempt_primary',
        },
      ],
      browserLoginAttempts: [
        { status: 'completed', attemptId: 'account_attempt_primary' },
      ],
      browserLoginReleases: [
        { status: 'released', attemptId: 'account_attempt_primary' },
      ],
    },
    { verificationAttempts: 1 },
  )
  await startPendingLogin(harness.adapter)

  assertProjection(
    await harness.adapter.dispatch({
      command: {
        command: 'account.login.cancel',
        attemptId: 'account_attempt_primary',
      },
      signal: signal(),
    }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )
  assert.deepEqual(
    harness.runtime.calls.slice(-4).map(({ operation }) => operation),
    [
      'cancelBrowserLogin',
      'readBrowserLoginAttempt',
      'readAccount',
      'releaseBrowserLoginAttempt',
    ],
  )
})

test('cancelled attempt requires fresh signed-out read and exact safe cancellation copy before release', async () => {
  const harness = createHarness(
    {
      accountReads: [
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
      ],
      browserLoginStarts: [pendingLoginStart()],
      browserLoginCancellations: [
        { status: 'cancelled', attemptId: 'account_attempt_primary' },
      ],
      browserLoginAttempts: [
        { status: 'cancelled', attemptId: 'account_attempt_primary' },
      ],
      browserLoginReleases: [
        { status: 'released', attemptId: 'account_attempt_primary' },
      ],
    },
    { verificationAttempts: 1 },
  )
  await startPendingLogin(harness.adapter)

  assertProjection(
    await harness.adapter.dispatch({
      command: {
        command: 'account.login.cancel',
        attemptId: 'account_attempt_primary',
      },
      signal: signal(),
    }),
    {
      state: 'login_required',
      displayMessage:
        '로그인이 취소되었습니다. 준비되면 다시 연결해 주세요.',
      allowedCommands: ['account.login.start', 'account.retry'],
    },
  )
  assert.equal(harness.adapter.hasPendingAttempt(), false)
})

test('completion reconciliation retries bounded fresh reads before declaring connected', async () => {
  const waits: number[] = []
  const harness = createHarness(
    {
      accountReads: [
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'chatgpt' } },
      ],
      browserLoginStarts: [pendingLoginStart()],
      browserLoginAttempts: [
        { status: 'completed', attemptId: 'account_attempt_primary' },
      ],
      browserLoginReleases: [
        { status: 'released', attemptId: 'account_attempt_primary' },
      ],
    },
    {
      verificationAttempts: 3,
      wait: async (milliseconds) => {
        waits.push(milliseconds)
      },
    },
  )
  await startPendingLogin(harness.adapter)

  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.verifying,
  )
  await waitForCall(harness.runtime, 'releaseBrowserLoginAttempt')
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )
  assert.deepEqual(waits, [100])
  assert.equal(harness.readyInvalidations.count, 3)
})

test('explicit logout is lease-bound, confirms fresh signed-out, and preserves workspace state', async () => {
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'chatgpt' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
    logouts: [{ status: 'signed_out' }],
  })
  const workspaceBefore = structuredClone(harness.workspaceState)
  await expectInitialAccount(
    harness.adapter,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )

  assertProjection(
    await harness.adapter.dispatch({
      command: { command: 'account.logout' },
      signal: signal(),
    }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )
  assert.deepEqual(
    harness.runtime.calls.map(({ operation }) => operation),
    ['readAccount', 'logout', 'readAccount'],
  )
  assert.deepEqual(harness.workspaceState, workspaceBefore)
  assert.equal(harness.readyInvalidations.count, 1)
})

test('unsupported and account failure observations exactly match frozen safe fixtures', async () => {
  const unsupported = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'unsupported' } },
    ],
  })
  assertProjection(
    await unsupported.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unsupportedAccount,
  )
  assert.equal(unsupported.readyInvalidations.count, 1)

  const unavailable = createHarness({
    accountReads: [
      {
        status: 'error',
        error: { code: 'account_read_failed', retryable: true },
      },
    ],
  })
  assertProjection(
    await unavailable.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assert.equal(unavailable.readyInvalidations.count, 0)

  const aborted = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
    ],
  })
  const controller = new AbortController()
  controller.abort()
  assertProjection(
    await aborted.adapter.observe({ signal: controller.signal }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assert.equal(aborted.readyInvalidations.count, 0)
  assert.equal(aborted.runtime.calls.length, 0)
})

test('account retry performs another fresh managed read through the shared lease', async () => {
  const harness = createHarness({
    accountReads: [
      {
        status: 'error',
        error: { code: 'account_read_failed', retryable: true },
      },
      { status: 'ok', account: { state: 'chatgpt' } },
    ],
  })
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assertProjection(
    await harness.adapter.dispatch({
      command: { command: 'account.retry' },
      signal: signal(),
    }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )
  assert.deepEqual(
    harness.runtime.calls.map(({ operation }) => operation),
    ['readAccount', 'readAccount'],
  )
})

test('private refresh bypasses the cached projection and invalidates Ready from a fresh signed-out read', async () => {
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'chatgpt' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
  })
  assertProjection(
    await harness.adapter.observe({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )

  assertProjection(
    await harness.adapter.refresh({ signal: signal() }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )
  assert.deepEqual(
    harness.runtime.calls.map(({ operation }) => operation),
    ['readAccount', 'readAccount'],
  )
  assert.equal(harness.readyInvalidations.count, 1)
})

test('wrong attempt and disallowed account commands fail closed without native calls', async () => {
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
    browserLoginStarts: [pendingLoginStart()],
  })
  await expectInitialAccount(
    harness.adapter,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )
  await assert.rejects(
    harness.adapter.dispatch({
      command: { command: 'account.logout' },
      signal: signal(),
    }),
    AccountRuntimeCommandError,
  )
  await startPendingLogin(harness.adapter, false)
  const callsBeforeWrongCancel = harness.runtime.calls.length
  await assert.rejects(
    harness.adapter.dispatch({
      command: {
        command: 'account.login.cancel',
        attemptId: 'account_attempt_private_mismatch',
      },
      signal: signal(),
    }),
    AccountRuntimeCommandError,
  )
  assert.equal(harness.runtime.calls.length, callsBeforeWrongCancel)
})

test('native start correlation mismatch stays protected until matching status and release reconcile it', async () => {
  const harness = createHarness(
    {
      accountReads: [
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'chatgpt' } },
      ],
      browserLoginStarts: [
        {
          status: 'pending',
          attemptId: 'native_private_mismatch',
          authUrl: 'https://auth.openai.com/codex',
          expiresAt: '2026-07-23T12:00:00.000Z',
        },
      ],
      browserLoginAttempts: [
        {
          status: 'failed',
          attemptId: 'account_attempt_primary',
          error: { code: 'login_attempt_not_found', retryable: true },
        },
      ],
      browserLoginReleases: [
        { status: 'released', attemptId: 'account_attempt_primary' },
      ],
    },
    { verificationAttempts: 1 },
  )
  await expectInitialAccount(
    harness.adapter,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
  )

  const protectedProjection = await harness.adapter.dispatch({
      command: { command: 'account.login.start' },
      signal: signal(),
    })
  assertProjection(
    protectedProjection,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assert.equal(harness.adapter.hasPendingAttempt(), true)
  assert.deepEqual(
    await harness.coordinator.transitionToWorkspace({
      workspace: { workspaceId: 'workspace_primary' },
      signal: signal(),
      commitReady: async () => ({ state: 'ready' }),
      readReady: async () => ({ state: 'ready' }),
    }),
    {
      status: 'failed',
      error: {
        code: 'account_operation_active',
        retryable: true,
        restartRequired: false,
      },
    },
  )

  assertProjection(
    await harness.adapter.dispatch({
      command: { command: 'account.retry' },
      signal: signal(),
    }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
  )
  assert.equal(harness.adapter.hasPendingAttempt(), false)
  assert.equal(
    JSON.stringify(protectedProjection).includes('native_private_mismatch'),
    false,
  )
})

test('release failure keeps transition protected, returns exact unavailable, and leaks no private fields', async () => {
  const harness = createHarness(
    {
      accountReads: [
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'signed_out' } },
        { status: 'ok', account: { state: 'chatgpt' } },
      ],
      browserLoginStarts: [pendingLoginStart()],
      browserLoginAttempts: [
        {
          status: 'failed',
          attemptId: 'account_attempt_primary',
          error: { code: 'login_failed', retryable: true },
        },
      ],
      browserLoginReleases: [
        {
          status: 'error',
          attemptId: 'account_attempt_primary',
          error: { code: 'runtime_unavailable', retryable: true },
        },
      ],
    },
    { verificationAttempts: 1 },
  )
  await startPendingLogin(harness.adapter)
  const verifying = await harness.adapter.observe({ signal: signal() })
  assertProjection(verifying, PUBLIC_PREVIEW_ACCOUNT_FIXTURES.verifying)
  await waitForCall(harness.runtime, 'releaseBrowserLoginAttempt')
  const projection = await harness.adapter.observe({ signal: signal() })

  assertProjection(projection, PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable)
  assert.equal(harness.adapter.hasPendingAttempt(), true)
  assert.deepEqual(
    await harness.coordinator.transitionToWorkspace({
      workspace: { workspaceId: 'workspace_primary' },
      signal: signal(),
      commitReady: async () => ({ state: 'ready' }),
      readReady: async () => ({ state: 'ready' }),
    }),
    {
      status: 'failed',
      error: {
        code: 'account_operation_active',
        retryable: true,
        restartRequired: false,
      },
    },
  )
  assert.deepEqual(harness.transitionCalls, { close: 0, start: 0 })
  assertNoPrivateAccountFields([
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.checking,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginStarting,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
    verifying,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.connected,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unsupportedAccount,
    projection,
  ])
})

test('beginShutdown aborts an active account read before coordinator close waits for idle', async () => {
  const accountRead = deferred<{
    readonly status: 'ok'
    readonly account: { readonly state: 'signed_out' }
  }>()
  const harness = createHarness({
    accountReads: [accountRead.promise],
  })
  const observing = harness.adapter.observe({ signal: signal() })
  await waitForCall(harness.runtime, 'readAccount')

  harness.adapter.beginShutdown()
  assertProjection(
    await observing,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assert.deepEqual(await harness.coordinator.close({ signal: signal() }), {
    status: 'closed',
    processTreeGone: true,
  })
  assert.equal(
    harness.runtime.calls.at(-1)?.operation,
    'closeAccount',
  )
})

test('beginShutdown aborts an active cancel settlement before coordinator close waits for idle', async () => {
  const cancellation = deferred<CodexBrowserLoginCancellation>()
  const harness = createHarness({
    accountReads: [
      { status: 'ok', account: { state: 'signed_out' } },
      { status: 'ok', account: { state: 'signed_out' } },
    ],
    browserLoginStarts: [pendingLoginStart()],
    browserLoginCancellations: [cancellation.promise],
  })
  await startPendingLogin(harness.adapter)
  const cancelling = harness.adapter.dispatch({
    command: {
      command: 'account.login.cancel',
      attemptId: 'account_attempt_primary',
    },
    signal: signal(),
  })
  await waitFor(() =>
    harness.runtime.calls.some(
      ({ operation }) => operation === 'cancelBrowserLogin',
    ),
  )

  harness.adapter.beginShutdown()
  assertProjection(
    await cancelling,
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
  )
  assert.deepEqual(await harness.coordinator.close({ signal: signal() }), {
    status: 'closed',
    processTreeGone: true,
  })
  assert.equal(
    harness.runtime.calls.at(-1)?.operation,
    'closeAccount',
  )
})

function createHarness(
  runtimeOptions: DeterministicCodexChatRuntimeOptions,
  adapterOptions: {
    readonly verificationAttempts?: number
    readonly verificationIntervalMs?: number
    readonly wait?: (
      milliseconds: number,
      signal: AbortSignal,
    ) => Promise<void>
  } = {},
) {
  const runtime = new DeterministicCodexChatRuntime({
    role: { role: 'auth-only', bootstrapCwd: '/deterministic/bootstrap' },
    ...runtimeOptions,
  })
  const transitionCalls = { close: 0, start: 0 }
  const workspaceState = {
    locator: 'workspace_locator_preserved',
    academicRevision: 7,
  }
  const readyInvalidations = { count: 0 }
  let adapter: AccountRuntimeRouteAdapter | undefined
  const coordinator = createAccountRuntimeCoordinator<
    CodexFreshAccount,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async (input) => {
      transitionCalls.close += 1
      return runtime.close(input)
    },
    startWorkspaceRuntime: async () => {
      transitionCalls.start += 1
    },
    readFreshWorkspaceAccount: async ({ signal: runtimeSignal }) =>
      requireAccount(
        await runtime.readAccount({
          refreshToken: true,
          signal: runtimeSignal,
        }),
      ),
    logoutAndReadFreshAccount: async ({ signal: runtimeSignal }) => {
      const logout = await runtime.logout({ signal: runtimeSignal })
      if (logout.status === 'error') throw new Error(logout.error.code)
      return requireAccount(
        await runtime.readAccount({
          refreshToken: true,
          signal: runtimeSignal,
        }),
      )
    },
    closeCurrentRuntime: (input) => runtime.close(input),
    hasPendingAccountAttempt: () => adapter?.hasPendingAttempt() ?? false,
    sameWorkspace: (left, right) =>
      left.workspaceId === right.workspaceId,
  })
  adapter = createAccountRuntimeRouteAdapter({
    coordinator,
    currentAccountRuntime: async () => runtime,
    attemptId: () => 'account_attempt_primary',
    now: () => new Date('2026-07-23T11:50:00.000Z'),
    wait: adapterOptions.wait ?? (async () => undefined),
    invalidateReadyAttestation: () => {
      readyInvalidations.count += 1
    },
    verificationAttempts: adapterOptions.verificationAttempts,
    verificationIntervalMs: adapterOptions.verificationIntervalMs,
  })
  return {
    adapter,
    coordinator,
    runtime,
    readyInvalidations,
    transitionCalls,
    workspaceState,
  }
}

async function expectInitialAccount(
  adapter: AccountRuntimeRouteAdapter,
  expected: PublicPreviewAccountProjection,
): Promise<void> {
  assertProjection(await adapter.observe({ signal: signal() }), expected)
}

async function startPendingLogin(
  adapter: AccountRuntimeRouteAdapter,
  observeFirst = true,
): Promise<void> {
  if (observeFirst) {
    await expectInitialAccount(
      adapter,
      PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginRequired,
    )
  }
  assertProjection(
    await adapter.dispatch({
      command: { command: 'account.login.start' },
      signal: signal(),
    }),
    PUBLIC_PREVIEW_ACCOUNT_FIXTURES.loginPending,
  )
}

function pendingLoginStart(): CodexBrowserLoginStartResult {
  return {
    status: 'pending',
    attemptId: 'account_attempt_primary',
    authUrl: 'https://auth.openai.com/codex',
    expiresAt: '2026-07-23T12:00:00.000Z',
  }
}

function assertProjection(
  actual: PublicPreviewAccountProjection,
  expected: PublicPreviewAccountProjection,
): void {
  assert.deepEqual(decodePublicPreviewAccountProjection(actual), expected)
}

function assertNoPrivateAccountFields(
  projections: readonly PublicPreviewAccountProjection[],
): void {
  const serialized = JSON.stringify(projections)
  for (const forbidden of [
    'access_token',
    'refresh_token',
    'id_token',
    'loginId',
    'email',
    'runtimeId',
    'bootstrapCwd',
    '/deterministic/',
    '/Users/',
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden)
  }
}

function requireAccount(
  result: Awaited<ReturnType<CodexAccountLifecycle['readAccount']>>,
): CodexFreshAccount {
  if (result.status === 'error') throw new Error(result.error.code)
  return result.account
}

function signal(): AbortSignal {
  return new AbortController().signal
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value: T): void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

async function waitForCall(
  runtime: DeterministicCodexChatRuntime,
  operation:
    | 'readAccount'
    | 'startBrowserLogin'
    | 'releaseBrowserLoginAttempt',
): Promise<void> {
  await waitFor(() =>
    runtime.calls.some((call) => call.operation === operation),
  )
}

function callIndex(
  runtime: DeterministicCodexChatRuntime,
  operation:
    | 'readAccount'
    | 'readBrowserLoginAttempt'
    | 'releaseBrowserLoginAttempt',
  occurrence = 0,
): number {
  let seen = 0
  const index = runtime.calls.findIndex((call) => {
    if (call.operation !== operation) return false
    if (seen === occurrence) return true
    seen += 1
    return false
  })
  assert.notEqual(index, -1, `${operation} occurrence ${occurrence}`)
  return index
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error('Timed out waiting for deterministic account state')
}

function fakeProductOperationCoordinator(
  sendChat: ProductOperationCoordinator['sendChat'],
): ProductOperationCoordinator {
  return {
    operationStatus: () => 'idle',
    startAssignment: async () => undefined,
    sendChat,
    submitReview: async () => {
      throw new Error('not used')
    },
    respondToInteraction: async () => undefined,
    disconnect: () => undefined,
    interrupt: async () => undefined,
    beginShutdown: () => undefined,
  }
}
