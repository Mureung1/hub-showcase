import assert from 'node:assert/strict'
import test from 'node:test'

import { createAccountRuntimeCoordinator } from './coordinator.js'
import {
  guardProductOperationCoordinatorWithAccountRuntimeLease,
  ProductOperationError,
  type ProductOperationCoordinator,
} from '../product-operation-coordinator.js'

type Account = { readonly state: 'chatgpt' | 'signed_out' }
type Workspace = { readonly workspaceId: string }
type Ready = { readonly state: 'ready'; readonly revision: number }

test('workspace transition holds the app-wide lease through B Ready readback', async () => {
  const events: string[] = []
  const closeAuthOnly = deferred<{
    readonly status: 'closed'
    readonly processTreeGone: true
  }>()
  const allowReadyReadback = deferred<void>()
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => {
      events.push('auth.close.started')
      const result = await closeAuthOnly.promise
      events.push('auth.close.finished')
      return result
    },
    startWorkspaceRuntime: async () => {
      events.push('workspace.started')
    },
    readFreshWorkspaceAccount: async () => {
      events.push('account.read')
      return { state: 'chatgpt' }
    },
    logoutAndReadFreshAccount: async () => {
      events.push('logout')
      return { state: 'signed_out' }
    },
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
  })
  const signal = new AbortController().signal

  const transition = coordinator.transitionToWorkspace({
    workspace: { workspaceId: 'workspace_primary' },
    signal,
    commitReady: async () => {
      events.push('ready.commit')
      return { state: 'ready', revision: 1 }
    },
    readReady: async () => {
      events.push('ready.read.started')
      await allowReadyReadback.promise
      events.push('ready.read.finished')
      return { state: 'ready', revision: 1 }
    },
  })
  await waitFor(() => events.includes('auth.close.started'))

  const logout = coordinator.logout({ signal })
  await Promise.resolve()
  assert.deepEqual(events, ['auth.close.started'])

  closeAuthOnly.resolve({ status: 'closed', processTreeGone: true })
  await waitFor(() => events.includes('ready.read.started'))
  assert.equal(events.includes('logout'), false)

  allowReadyReadback.resolve()
  assert.deepEqual(await transition, {
    status: 'ready',
    ready: { state: 'ready', revision: 1 },
  })
  assert.deepEqual(await logout, {
    status: 'completed',
    result: { state: 'signed_out' },
  })
  assert.deepEqual(events, [
    'auth.close.started',
    'auth.close.finished',
    'workspace.started',
    'account.read',
    'ready.commit',
    'ready.read.started',
    'ready.read.finished',
    'logout',
  ])
})

test('product operation reserve-to-release lifetime atomically excludes Runtime transition', async () => {
  const events: string[] = []
  const finishProductOperation = deferred<void>()
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => {
      events.push('auth.close')
      return { status: 'closed', processTreeGone: true }
    },
    startWorkspaceRuntime: async () => {
      events.push('workspace.start')
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
  })
  const product = guardProductOperationCoordinatorWithAccountRuntimeLease(
    fakeProductOperationCoordinator(async () => {
      events.push('product.start')
      await finishProductOperation.promise
      events.push('product.finish')
    }),
    coordinator,
  )
  const signal = new AbortController().signal

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
  await waitFor(() => events.includes('product.start'))
  const transition = coordinator.transitionToWorkspace({
    workspace: { workspaceId: 'workspace_primary' },
    signal,
    commitReady: async () => ({ state: 'ready', revision: 1 }),
    readReady: async () => ({ state: 'ready', revision: 1 }),
  })
  await Promise.resolve()

  assert.deepEqual(events, ['product.start'])
  finishProductOperation.resolve()
  await runningProduct
  assert.equal((await transition).status, 'ready')
  assert.deepEqual(events, [
    'product.start',
    'product.finish',
    'auth.close',
    'workspace.start',
  ])
})

test('shared account lease preserves the original product operation failure', async () => {
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => undefined,
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
  })
  const expected = new ProductOperationError(
    'action_invalid',
    400,
    'Assignment action 입력을 확인해 주세요.',
  )
  const product = guardProductOperationCoordinatorWithAccountRuntimeLease(
    fakeProductOperationCoordinator(async () => {
      throw expected
    }),
    coordinator,
  )

  await assert.rejects(
    product.sendChat(
      { text: '학기 상태를 확인해 줘.', materials: [] },
      {
        disconnected: () => false,
        mcpUrl: 'http://127.0.0.1:43123',
        sink: {
          write: async () => true,
          end: () => undefined,
        },
      },
    ),
    (error) => error === expected,
  )
})

test('ambiguous auth-only close latches restart-required and never starts a workspace Runtime', async () => {
  let closeCalls = 0
  let startCalls = 0
  let readyCommits = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => {
      closeCalls += 1
      return { status: 'ambiguous', processTreeGone: false }
    },
    startWorkspaceRuntime: async () => {
      startCalls += 1
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'ambiguous',
      processTreeGone: false,
    }),
  })
  const input = transitionInput(() => {
    readyCommits += 1
  })

  const first = await coordinator.transitionToWorkspace(input)
  const retry = await coordinator.transitionToWorkspace(input)

  assert.deepEqual(first, {
    status: 'failed',
    error: {
      code: 'auth_runtime_close_ambiguous',
      retryable: false,
      restartRequired: true,
    },
  })
  assert.deepEqual(retry, first)
  assert.equal(closeCalls, 1)
  assert.equal(startCalls, 0)
  assert.equal(readyCommits, 0)
})

test('workspace Runtime start failure latches restart-required without a second start', async () => {
  let startCalls = 0
  let readyCommits = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => {
      startCalls += 1
      throw new Error('deterministic start failure')
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'ambiguous',
      processTreeGone: false,
    }),
  })
  const input = transitionInput(() => {
    readyCommits += 1
  })

  const first = await coordinator.transitionToWorkspace(input)
  const retry = await coordinator.transitionToWorkspace(input)

  assert.deepEqual(first, {
    status: 'failed',
    error: {
      code: 'workspace_runtime_start_failed',
      retryable: false,
      restartRequired: true,
    },
  })
  assert.deepEqual(retry, first)
  assert.equal(startCalls, 1)
  assert.equal(readyCommits, 0)
})

test('fresh workspace account failure produces no false Ready and retry reuses the same Runtime', async () => {
  let startCalls = 0
  let readCalls = 0
  let readyCommits = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => {
      startCalls += 1
    },
    readFreshWorkspaceAccount: async () => {
      readCalls += 1
      if (readCalls === 1) throw new Error('deterministic account failure')
      return { state: 'chatgpt' }
    },
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    sameWorkspace: (left, right) =>
      left.workspaceId === right.workspaceId,
  })

  const first = await coordinator.transitionToWorkspace(
    transitionInput(() => {
      readyCommits += 1
    }),
  )
  const retry = await coordinator.transitionToWorkspace(
    transitionInput(() => {
      readyCommits += 1
    }),
  )

  assert.deepEqual(first, {
    status: 'failed',
    error: {
      code: 'account_unavailable',
      retryable: true,
      restartRequired: false,
    },
  })
  assert.deepEqual(retry, {
    status: 'ready',
    ready: { state: 'ready', revision: 1 },
  })
  assert.equal(startCalls, 1)
  assert.equal(readCalls, 2)
  assert.equal(readyCommits, 1)
})

test('B Ready commit fault stays inside the lease and retry reuses the same Runtime', async () => {
  const allowCommitFailure = deferred<void>()
  const events: string[] = []
  let startCalls = 0
  let commitCalls = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => {
      startCalls += 1
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => {
      events.push('logout')
      return { state: 'signed_out' }
    },
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    sameWorkspace: (left, right) =>
      left.workspaceId === right.workspaceId,
  })
  const signal = new AbortController().signal
  const first = coordinator.transitionToWorkspace({
    ...transitionInput(),
    signal,
    commitReady: async () => {
      commitCalls += 1
      events.push('ready.commit.started')
      await allowCommitFailure.promise
      events.push('ready.commit.failed')
      throw new Error('deterministic B commit failure')
    },
  })
  await waitFor(() => events.includes('ready.commit.started'))
  const logout = coordinator.logout({ signal })
  await Promise.resolve()
  assert.deepEqual(events, ['ready.commit.started'])

  allowCommitFailure.resolve()
  assert.deepEqual(await first, {
    status: 'failed',
    error: {
      code: 'account_unavailable',
      retryable: true,
      restartRequired: false,
    },
  })
  assert.deepEqual(await logout, {
    status: 'completed',
    result: { state: 'signed_out' },
  })
  assert.deepEqual(events, [
    'ready.commit.started',
    'ready.commit.failed',
    'logout',
  ])

  assert.deepEqual(
    await coordinator.transitionToWorkspace(transitionInput()),
    {
      status: 'ready',
      ready: { state: 'ready', revision: 1 },
    },
  )
  assert.equal(startCalls, 1)
  assert.equal(commitCalls, 1)
})

test('B Ready readback fault returns no Ready and retry does not start a second Runtime', async () => {
  let startCalls = 0
  let readbackCalls = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => {
      startCalls += 1
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    sameWorkspace: (left, right) =>
      left.workspaceId === right.workspaceId,
  })
  const createInput = () => ({
    ...transitionInput(),
    readReady: async () => {
      readbackCalls += 1
      if (readbackCalls === 1) {
        throw new Error('deterministic B readback failure')
      }
      return { state: 'ready' as const, revision: 1 }
    },
  })

  assert.deepEqual(await coordinator.transitionToWorkspace(createInput()), {
    status: 'failed',
    error: {
      code: 'account_unavailable',
      retryable: true,
      restartRequired: false,
    },
  })
  assert.deepEqual(await coordinator.transitionToWorkspace(createInput()), {
    status: 'ready',
    ready: { state: 'ready', revision: 1 },
  })
  assert.equal(startCalls, 1)
  assert.equal(readbackCalls, 2)
})

test('cancellation after complete auth close starts no Runtime and a later retry starts exactly one', async () => {
  const authClosed = deferred<{
    readonly status: 'closed'
    readonly processTreeGone: true
  }>()
  let closeStarted = false
  let startCalls = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: () => {
      closeStarted = true
      return authClosed.promise
    },
    startWorkspaceRuntime: async () => {
      startCalls += 1
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    sameWorkspace: (left, right) =>
      left.workspaceId === right.workspaceId,
  })
  const abort = new AbortController()
  const transition = coordinator.transitionToWorkspace({
    ...transitionInput(),
    signal: abort.signal,
  })
  await waitFor(() => closeStarted)
  abort.abort()
  authClosed.resolve({ status: 'closed', processTreeGone: true })

  assert.deepEqual(await transition, {
    status: 'failed',
    error: {
      code: 'transition_cancelled',
      retryable: true,
      restartRequired: false,
    },
  })
  assert.equal(startCalls, 0)
  assert.equal(
    (
      await coordinator.transitionToWorkspace(transitionInput())
    ).status,
    'ready',
  )
  assert.equal(startCalls, 1)
})

test('close and logout racing B Ready readback wait or fail without releasing the transition lease early', async () => {
  const allowReadyReadback = deferred<void>()
  const events: string[] = []
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => undefined,
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => {
      events.push('logout')
      return { state: 'signed_out' }
    },
    closeCurrentRuntime: async () => {
      events.push('runtime.close')
      return { status: 'closed', processTreeGone: true }
    },
  })
  const signal = new AbortController().signal
  const transition = coordinator.transitionToWorkspace({
    ...transitionInput(),
    signal,
    readReady: async () => {
      events.push('ready.read')
      await allowReadyReadback.promise
      events.push('ready.done')
      return { state: 'ready', revision: 1 }
    },
  })
  await waitFor(() => events.includes('ready.read'))
  const logout = coordinator.logout({ signal })
  const close = coordinator.close({ signal })

  assert.deepEqual(await logout, {
    status: 'failed',
    error: {
      code: 'coordinator_closed',
      retryable: false,
      restartRequired: false,
    },
  })
  assert.deepEqual(events, ['ready.read'])
  allowReadyReadback.resolve()
  assert.deepEqual(await transition, {
    status: 'ready',
    ready: { state: 'ready', revision: 1 },
  })
  assert.deepEqual(await close, {
    status: 'closed',
    processTreeGone: true,
  })
  assert.deepEqual(events, [
    'ready.read',
    'ready.done',
    'runtime.close',
  ])
})

test('pending Browser login attempt blocks Runtime transition before auth close', async () => {
  let pendingAttempt = true
  let closeCalls = 0
  let startCalls = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => {
      closeCalls += 1
      return { status: 'closed', processTreeGone: true }
    },
    startWorkspaceRuntime: async () => {
      startCalls += 1
    },
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    hasPendingAccountAttempt: () => pendingAttempt,
  })

  assert.deepEqual(
    await coordinator.transitionToWorkspace(transitionInput()),
    {
      status: 'failed',
      error: {
        code: 'account_operation_active',
        retryable: true,
        restartRequired: false,
      },
    },
  )
  assert.equal(closeCalls, 0)
  assert.equal(startCalls, 0)

  pendingAttempt = false
  assert.equal(
    (
      await coordinator.transitionToWorkspace(transitionInput())
    ).status,
    'ready',
  )
  assert.equal(closeCalls, 1)
  assert.equal(startCalls, 1)
})

test('coordinator close waits for the active lease, rejects queued work, and closes once', async () => {
  const allowAccountRead = deferred<void>()
  const events: string[] = []
  let closeCalls = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => undefined,
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => {
      closeCalls += 1
      events.push('runtime.close')
      return { status: 'closed', processTreeGone: true }
    },
  })
  const signal = new AbortController().signal
  const active = coordinator.runAccountOperation({
    signal,
    operation: async () => {
      events.push('account.active')
      await allowAccountRead.promise
      events.push('account.done')
      return 'fresh'
    },
  })
  await waitFor(() => events.includes('account.active'))
  const queued = coordinator.logout({ signal })
  const close = coordinator.close({ signal })
  const closeAgain = coordinator.close({ signal })
  const afterClose = coordinator.logout({ signal })

  assert.deepEqual(await queued, {
    status: 'failed',
    error: {
      code: 'coordinator_closed',
      retryable: false,
      restartRequired: false,
    },
  })
  assert.deepEqual(await afterClose, {
    status: 'failed',
    error: {
      code: 'coordinator_closed',
      retryable: false,
      restartRequired: false,
    },
  })
  assert.deepEqual(events, ['account.active'])

  allowAccountRead.resolve()
  assert.deepEqual(await active, {
    status: 'completed',
    result: 'fresh',
  })
  assert.deepEqual(await close, {
    status: 'closed',
    processTreeGone: true,
  })
  assert.deepEqual(await closeAgain, {
    status: 'closed',
    processTreeGone: true,
  })
  assert.deepEqual(events, [
    'account.active',
    'account.done',
    'runtime.close',
  ])
  assert.equal(closeCalls, 1)
})

test('coordinator close maps thrown process-tree cleanup to one stable ambiguous result', async () => {
  let closeCalls = 0
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => undefined,
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => {
      closeCalls += 1
      throw new Error('deterministic process-tree ambiguity')
    },
  })

  const first = await coordinator.close({ signal: signal() })
  const second = await coordinator.close({ signal: signal() })

  assert.deepEqual(first, {
    status: 'ambiguous',
    processTreeGone: false,
  })
  assert.deepEqual(second, first)
  assert.equal(closeCalls, 1)
  assert.deepEqual(await coordinator.logout({ signal: signal() }), {
    status: 'failed',
    error: {
      code: 'coordinator_closed',
      retryable: false,
      restartRequired: false,
    },
  })
})

test('aborted queued account operation leaves the FIFO lease without running', async () => {
  const allowFirst = deferred<void>()
  const events: string[] = []
  const coordinator = createAccountRuntimeCoordinator<
    Account,
    Workspace,
    Ready
  >({
    closeAuthOnlyRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
    startWorkspaceRuntime: async () => undefined,
    readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
    logoutAndReadFreshAccount: async () => ({ state: 'signed_out' }),
    closeCurrentRuntime: async () => ({
      status: 'closed',
      processTreeGone: true,
    }),
  })
  const signal = new AbortController().signal
  const first = coordinator.runAccountOperation({
    signal,
    operation: async () => {
      events.push('first')
      await allowFirst.promise
    },
  })
  await waitFor(() => events.includes('first'))
  const abort = new AbortController()
  const queued = coordinator.runAccountOperation({
    signal: abort.signal,
    operation: async () => {
      events.push('aborted-operation-ran')
    },
  })
  abort.abort()
  allowFirst.resolve()

  assert.equal((await first).status, 'completed')
  assert.deepEqual(await queued, {
    status: 'failed',
    error: {
      code: 'transition_cancelled',
      retryable: true,
      restartRequired: false,
    },
  })
  assert.deepEqual(events, ['first'])
})

function transitionInput(
  onCommit: () => void = () => undefined,
): {
  readonly workspace: Workspace
  readonly signal: AbortSignal
  readonly commitReady: () => Promise<Ready>
  readonly readReady: () => Promise<Ready>
} {
  return {
    workspace: { workspaceId: 'workspace_primary' },
    signal: new AbortController().signal,
    commitReady: async () => {
      onCommit()
      return { state: 'ready', revision: 1 }
    },
    readReady: async () => ({ state: 'ready', revision: 1 }),
  }
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

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error('Timed out waiting for deterministic test state')
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
