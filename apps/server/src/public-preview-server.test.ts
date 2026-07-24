import assert from 'node:assert/strict'
import { createServer as createHttpServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import {
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import express from 'express'

import {
  DeterministicCodexChatRuntime,
} from '@ay-ple/codex-chat-runtime/testing'
import {
  decodePublicPreviewResponse,
  type PublicPreviewCommand,
  type PublicPreviewResponse,
} from '@ay-ple/product-contract'
import {
  PUBLIC_PREVIEW_ACCOUNT_FIXTURES,
  PUBLIC_PREVIEW_SETUP_FIXTURES,
} from '@ay-ple/product-contract/testing'
import {
  captureCanonicalWorkspaceBundleSource,
  type LaunchBinding,
  type RecoverableSetupEnvelopeStore,
} from '@ay-ple/semester-workspace'

import {
  createPublicPreviewFeatureComposition,
  type PublicPreviewFeatureComposition,
  type PublicPreviewServerBootstrap,
} from './public-preview-composition.js'
import type {
  PublicPreviewCommandAdapter,
} from './public-preview-command-adapter.js'
import { createPublicPreviewRouter } from './public-preview-http.js'
import {
  createPublicPreviewRuntimeOwner,
  type PublicPreviewRuntimeOwner,
} from './public-preview-runtime-owner.js'
import {
  createServerApplicationForTesting,
} from './server-application.js'
import { listenToServerApplication } from './server-listener.js'
import {
  ServerStartupCleanupError,
} from './server-startup-cleanup.js'

test('listener-independent public preview composes account, setup, reauth and explicit Ready resume without private leaks', async () => {
  const fixture = await createFixture()
  let feature: PublicPreviewFeatureComposition | undefined
  try {
    const port = await freePort()
    const origin = `http://127.0.0.1:${port}`
    const bootstrap = fixture.bootstrap(origin)
    const application = await createServerApplicationForTesting(
      { publicPreview: bootstrap },
      {
        createPublicPreviewFeature: async (input) => {
          feature = await fixture.createFeature(input)
          return feature
        },
      },
    )
    const started = await listenToServerApplication(application, {
      host: '127.0.0.1',
      port,
    })
    const baseUrl = `http://127.0.0.1:${started.port}`
    try {
      const beforeObserve = await snapshotEntries(fixture.appDataRoot)
      const beforeGuardCalls = fixture.allRuntimeCalls()
      const guarded = await postPreview(
        baseUrl,
        'http://127.0.0.1:1',
        { command: 'account.login.start' },
        403,
      )
      assert.equal(guarded.status, 'error')
      const malformed = await rawPostPreview(
        baseUrl,
        origin,
        JSON.stringify({
          command: 'account.login.start',
          privateRuntimeId: 'runtime_private',
        }),
        400,
      )
      assert.equal(malformed.status, 'error')
      const oversized = await rawPostPreview(
        baseUrl,
        origin,
        JSON.stringify({
          command: 'account.retry',
          padding: 'x'.repeat(2 * 1024 * 1024),
        }),
        413,
      )
      assert.equal(oversized.status, 'error')
      assert.deepEqual(fixture.allRuntimeCalls(), beforeGuardCalls)
      assert.equal(fixture.pickerCalls.count, 0)
      assert.deepEqual(
        await snapshotEntries(fixture.appDataRoot),
        beforeObserve,
      )

      const signedOut = await getPreview(baseUrl)
      assert.equal(signedOut.status, 'ok')
      assert.equal(signedOut.projection.account.state, 'login_required')
      assert.equal(
        signedOut.projection.setup.state,
        'account_required',
      )
      assert.deepEqual(
        await snapshotEntries(fixture.appDataRoot),
        beforeObserve,
      )
      assert.equal(fixture.pickerCalls.count, 0)

      const noAction = await fetch(
        `${baseUrl}/api/product/chat/messages`,
        {
          method: 'POST',
          headers: jsonHeaders(origin),
          body: '{}',
        },
      )
      assert.equal(noAction.status, 503)
      assert.equal(
        fixture.allRuntimeCalls().some(
          (call) =>
            call === 'startThread' ||
            call === 'startProductTurn' ||
            call === 'startTurn',
        ),
        false,
      )
      assert.deepEqual(
        await feature!.admitAcademicAction(),
        { status: 'blocked', reason: 'workspace_not_ready' },
      )

      await postPreview(baseUrl, origin, {
        command: 'account.login.start',
      })
      const connected = await pollAccount(baseUrl, 'connected')
      assert.equal(connected.projection.setup.state, 'input_required')

      const pickerFailure = await postPreview(
        baseUrl,
        origin,
        { command: 'workspace.parent.select' },
        503,
      )
      assert.equal(pickerFailure.status, 'error')
      if (pickerFailure.status === 'error') {
        assert.equal(pickerFailure.error.code, 'setup_unavailable')
      }
      const selected = await postPreview(baseUrl, origin, {
        command: 'workspace.parent.select',
      })
      assert.equal(selected.status, 'ok')
      assert.equal(selected.projection.setup.state, 'input_required')
      if (selected.projection.setup.state !== 'input_required') {
        assert.fail('input projection required')
      }
      const parentSelection =
        selected.projection.setup.parentSelection
      assert.ok(parentSelection)

      const confirmation = await postPreview(baseUrl, origin, {
        command: 'setup.prepare',
        input: {
          yearLevel: 2,
          term: '2',
          parentSelectionId: parentSelection.selectionId,
          leafName: '2026-2학기',
        },
      })
      assert.equal(
        confirmation.projection.setup.state,
        'confirmation_required',
      )
      if (
        confirmation.projection.setup.state !==
        'confirmation_required'
      ) {
        assert.fail('confirmation required')
      }
      const setupPlanId =
        confirmation.projection.setup.setupPlanId

      const stale = await postPreview(
        baseUrl,
        origin,
        {
          command: 'setup.approve',
          setupPlanId: `${setupPlanId}_stale`,
        },
        409,
      )
      assert.equal(stale.status, 'error')
      if (stale.status === 'error') {
        assert.equal(stale.error.code, 'command_not_allowed')
      }

      const beforeParentChange = await snapshotEntries(
        fixture.appDataRoot,
      )
      const changedParent = await postPreview(baseUrl, origin, {
        command: 'workspace.parent.select',
      })
      assert.equal(changedParent.projection.setup.state, 'input_required')
      if (changedParent.projection.setup.state !== 'input_required') {
        assert.fail('new parent selection must return setup to input')
      }
      const changedParentSelection =
        changedParent.projection.setup.parentSelection
      assert.ok(changedParentSelection)
      assert.notEqual(
        changedParentSelection.selectionId,
        parentSelection.selectionId,
      )
      assert.deepEqual(
        await snapshotEntries(fixture.appDataRoot),
        beforeParentChange,
      )

      const discardedDraft = await postPreview(
        baseUrl,
        origin,
        {
          command: 'setup.approve',
          setupPlanId,
        },
        409,
      )
      assert.equal(discardedDraft.status, 'error')
      if (discardedDraft.status === 'error') {
        assert.equal(
          discardedDraft.error.code,
          'command_not_allowed',
        )
      }

      const replacementConfirmation = await postPreview(
        baseUrl,
        origin,
        {
          command: 'setup.prepare',
          input: {
            yearLevel: 2,
            term: '2',
            parentSelectionId:
              changedParentSelection.selectionId,
            leafName: '2026-2학기',
          },
        },
      )
      assert.equal(
        replacementConfirmation.projection.setup.state,
        'confirmation_required',
      )
      if (
        replacementConfirmation.projection.setup.state !==
        'confirmation_required'
      ) {
        assert.fail('replacement confirmation required')
      }
      const replacementSetupPlanId =
        replacementConfirmation.projection.setup.setupPlanId
      assert.notEqual(replacementSetupPlanId, setupPlanId)

      const reauth = await postPreview(baseUrl, origin, {
        command: 'setup.approve',
        setupPlanId: replacementSetupPlanId,
      })
      assert.equal(reauth.projection.account.state, 'login_required')
      assertWorkspaceReauth(reauth, 'awaiting_account')
      const recoveryId = requireRecoveryId(reauth)

      await postPreview(baseUrl, origin, {
        command: 'account.login.start',
      })
      const reconnected = await pollAccount(baseUrl, 'connected')
      assertWorkspaceReauth(reconnected, 'available')
      assert.notEqual(reconnected.projection.setup.state, 'ready')

      const ready = await postPreview(baseUrl, origin, {
        command: 'setup.resume',
        recoveryId,
      })
      assert.equal(ready.status, 'ok')
      assert.equal(ready.projection.setup.state, 'ready')
      if (ready.projection.setup.state !== 'ready') {
        assert.fail('Ready projection required')
      }
      assert.equal(ready.projection.setup.nextJourney.state, 'coming_next')
      assert.equal(
        ready.projection.setup.safeDisplayLocation,
        'Home › Documents › 2026-2학기',
      )
      assert.equal(
        (await feature!.admitAcademicAction()).status,
        'admitted',
      )
      const callsAfterFutureAdmission = fixture.allRuntimeCalls()
      for (const route of [
        '/api/product/courses',
        '/api/product/materials/refresh',
        '/api/product/actions/first-assignment',
        '/api/product/actions/first-assignment/retry',
        '/api/product/chat/messages',
        '/api/product/reviews/interaction_12345678',
      ]) {
        const unavailable = await fetch(`${baseUrl}${route}`, {
          method: 'POST',
          headers: jsonHeaders(origin),
          body: '{}',
        })
        assert.equal(unavailable.status, 503, route)
      }
      assert.deepEqual(
        fixture.allRuntimeCalls(),
        callsAfterFutureAdmission,
      )
      assert.equal(
        fixture.allRuntimeCalls().some(
          (call) =>
            call === 'startThread' ||
            call === 'startProductTurn' ||
            call === 'startTurn',
        ),
        false,
      )

      const loggedOut = await postPreview(baseUrl, origin, {
        command: 'account.logout',
      })
      assertWorkspaceReauth(loggedOut, 'awaiting_account')
      assert.equal(requireRecoveryId(loggedOut), recoveryId)
      await postPreview(baseUrl, origin, {
        command: 'account.login.start',
      })
      const connectedAgain = await pollAccount(baseUrl, 'connected')
      assertWorkspaceReauth(connectedAgain, 'available')
      assert.notEqual(connectedAgain.projection.setup.state, 'ready')

      const resumed = await postPreview(baseUrl, origin, {
        command: 'setup.resume',
        recoveryId,
      })
      assert.equal(resumed.projection.setup.state, 'ready')

      const activate = await fetch(
        `${baseUrl}/api/product/workspaces/activate`,
        {
          method: 'POST',
          headers: jsonHeaders(origin),
          body: '{}',
        },
      )
      assert.equal(activate.status, 404)
      assert.equal(
        (await fetch(`${baseUrl}/api/product-mcp`)).status,
        404,
      )
      assert.equal(
        (await fetch(`${baseUrl}/api/codex-chat/status`)).status,
        404,
      )

      assertNoPrivateFields(
        [
          signedOut,
          connected,
          pickerFailure,
          selected,
          confirmation,
          stale,
          changedParent,
          discardedDraft,
          replacementConfirmation,
          reauth,
          reconnected,
          ready,
          loggedOut,
          connectedAgain,
          resumed,
          guarded,
          malformed,
          oversized,
        ],
        fixture,
      )
    } finally {
      await started.application.close()
    }
    assert.equal(
      fixture.allRuntimeCalls().filter((call) => call === 'closeAccount')
        .length,
      2,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('shutdown aborts an in-flight native parent picker before waiting for command drain', async () => {
  const fixture = await createFixture({
    authInitiallyConnected: true,
    pickerWaitsForAbort: true,
  })
  try {
    const feature = await fixture.createFeature(
      fixture.bootstrap('http://127.0.0.1:43123'),
    )
    await feature.adapter.observe({ signal: signal() })
    const selecting = feature.adapter.dispatch({
      command: { command: 'workspace.parent.select' },
      signal: signal(),
    })
    await fixture.pickerStarted.promise

    const closing = feature.close({ signal: signal() })
    assert.equal(await settlesWithin(closing, 1_000), true)
    assert.equal((await selecting).status, 'ok')
    assert.equal(fixture.pickerAborts.count, 1)
  } finally {
    await fixture.cleanup()
  }
})

test('composition close shares one attempt, retries ambiguity, and latches only proven cleanup', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  let feature: PublicPreviewFeatureComposition | undefined
  try {
    let closeCalls = 0
    const closeSignals: AbortSignal[] = []
    const runtimeOwner = withCloseCurrent(
      fixture.runtimeOwner,
      async (input) => {
        closeCalls += 1
        closeSignals.push(input.signal)
        if (closeCalls === 1) {
          return {
            status: 'ambiguous',
            processTreeGone: false,
          }
        }
        return fixture.runtimeOwner.closeCurrent(input)
      },
    )
    feature = await createPublicPreviewFeatureComposition(
      fixture.bootstrap('http://127.0.0.1:43123'),
      { runtimeOwner },
    )
    const firstSignal = signal()
    const ignoredConcurrentSignal = signal()
    const retrySignal = signal()

    const first = feature.close({ signal: firstSignal })
    const concurrent = feature.close({
      signal: ignoredConcurrentSignal,
    })
    assert.equal(concurrent, first)
    assert.deepEqual(await first, {
      status: 'ambiguous',
      processTreeGone: false,
    })

    const retry = feature.close({ signal: retrySignal })
    assert.notEqual(retry, first)
    assert.deepEqual(await retry, {
      status: 'closed',
      processTreeGone: true,
    })
    assert.equal(feature.close({ signal: signal() }), retry)
    assert.equal(closeCalls, 2)
    assert.deepEqual(closeSignals, [firstSignal, retrySignal])
  } finally {
    if (feature) {
      await feature.close({ signal: signal() })
    } else {
      await fixture.runtimeOwner.closeCurrent({ signal: signal() })
    }
    await fixture.cleanup()
  }
})

test('listener bind cleanup exposes one retryable high-level authority that converges after Runtime ambiguity', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  const blocker = createNetServer()
  let feature: PublicPreviewFeatureComposition | undefined
  let application:
    | Awaited<ReturnType<typeof createServerApplicationForTesting>>
    | undefined
  await new Promise<void>((resolve, reject) => {
    blocker.once('error', reject)
    blocker.listen(0, '127.0.0.1', resolve)
  })
  const address = blocker.address()
  assert.ok(address && typeof address === 'object')
  try {
    let closeCalls = 0
    const closeSignals: AbortSignal[] = []
    const runtimeOwner = withCloseCurrent(
      fixture.runtimeOwner,
      async (input) => {
        closeCalls += 1
        closeSignals.push(input.signal)
        if (closeCalls === 1) {
          return {
            status: 'ambiguous',
            processTreeGone: false,
          }
        }
        return fixture.runtimeOwner.closeCurrent(input)
      },
    )
    const bootstrap = fixture.bootstrap(
      `http://127.0.0.1:${address.port}`,
    )
    application = await createServerApplicationForTesting(
      { publicPreview: bootstrap },
      {
        createPublicPreviewFeature: async (input) => {
          feature = await createPublicPreviewFeatureComposition(
            input,
            { runtimeOwner },
          )
          return feature
        },
      },
    )
    let startupError: ServerStartupCleanupError | undefined

    await assert.rejects(
      listenToServerApplication(application, {
        host: '127.0.0.1',
        port: address.port,
      }),
      (error) => {
        assert.ok(error instanceof ServerStartupCleanupError)
        assert.equal(
          error.code,
          'server_startup_cleanup_ambiguous',
        )
        startupError = error
        return true
      },
    )
    assert.equal(closeCalls, 1)
    assert.ok(startupError)
    const retrySignal = signal()
    assert.deepEqual(
      await startupError.close({ signal: retrySignal }),
      { status: 'closed', processTreeGone: true },
    )
    assert.equal(closeCalls, 2)
    assert.equal(closeSignals[1], retrySignal)
    assert.deepEqual(
      await startupError.close({ signal: signal() }),
      { status: 'closed', processTreeGone: true },
    )
    assert.equal(closeCalls, 2)
    await application.close()
    await assert.rejects(
      listenToServerApplication(application, {
        host: '127.0.0.1',
        port: 0,
      }),
      /Server application is closing/u,
    )
  } finally {
    if (feature) {
      await feature.close({ signal: signal() }).catch(() => undefined)
    }
    await new Promise<void>((resolve, reject) => {
      blocker.close((error) => error ? reject(error) : resolve())
    })
    await fixture.cleanup()
  }
})

test('composition failure after Runtime ownership closes the active generation', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  try {
    await assert.rejects(
      createPublicPreviewFeatureComposition(
        fixture.bootstrap('http://127.0.0.1:43123'),
        {
          runtimeOwner: fixture.runtimeOwner,
          stateStore: failingStateStore(),
        },
      ),
      /synthetic launch failure/,
    )
    assert.equal(
      fixture.authRuntime.calls.at(-1)?.operation,
      'closeAccount',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('composition surfaces ambiguous post-spawn cleanup with a stable start error', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  try {
    let closeCalls = 0
    const runtimeOwner = withCloseCurrent(
      fixture.runtimeOwner,
      async (input) => {
        closeCalls += 1
        if (closeCalls === 1) {
          return {
            status: 'ambiguous',
            processTreeGone: false,
          }
        }
        return fixture.runtimeOwner.closeCurrent(input)
      },
    )
    let startupError: ServerStartupCleanupError | undefined
    await assert.rejects(
      createPublicPreviewFeatureComposition(
        fixture.bootstrap('http://127.0.0.1:43123'),
        {
          runtimeOwner,
          stateStore: failingStateStore(),
        },
      ),
      (error) => {
        assert.ok(error instanceof ServerStartupCleanupError)
        assert.equal(
          error.code,
          'server_startup_cleanup_ambiguous',
        )
        startupError = error
        return true
      },
    )
    assert.equal(closeCalls, 1)
    assert.ok(startupError)
    assert.deepEqual(
      await startupError.close({ signal: signal() }),
      { status: 'closed', processTreeGone: true },
    )
    assert.equal(closeCalls, 2)
  } finally {
    await fixture.cleanup()
  }
})

test('composition surfaces rejected post-spawn cleanup with a stable start error', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  try {
    let closeCalls = 0
    const runtimeOwner = withCloseCurrent(
      fixture.runtimeOwner,
      async (input) => {
        closeCalls += 1
        if (closeCalls === 1) {
          throw new Error('synthetic close failure')
        }
        return fixture.runtimeOwner.closeCurrent(input)
      },
    )
    let startupError: ServerStartupCleanupError | undefined
    await assert.rejects(
      createPublicPreviewFeatureComposition(
        fixture.bootstrap('http://127.0.0.1:43123'),
        {
          runtimeOwner,
          stateStore: failingStateStore(),
        },
      ),
      (error) => {
        assert.ok(error instanceof ServerStartupCleanupError)
        assert.equal(
          error.code,
          'server_startup_cleanup_ambiguous',
        )
        startupError = error
        return true
      },
    )
    assert.equal(closeCalls, 1)
    assert.ok(startupError)
    assert.deepEqual(
      await startupError.close({ signal: signal() }),
      { status: 'closed', processTreeGone: true },
    )
    assert.equal(closeCalls, 2)
  } finally {
    await fixture.cleanup()
  }
})

test('release bootstrap mismatches fail before owner creation, Runtime spawn or setup state access', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  try {
    await fixture.runtimeOwner.closeCurrent({ signal: signal() })
    const beforeRuntimeCalls = fixture.allRuntimeCalls()
    const beforeState = await snapshotEntries(fixture.appDataRoot)
    const base = fixture.bootstrap('http://127.0.0.1:43123')
    const mismatches: readonly PublicPreviewServerBootstrap[] = [
      {
        ...base,
        applicationVersion: '0.0.2',
      },
      {
        ...base,
        setup: {
          ...base.setup,
          requiredApplicationCommand: 'npx ay-ple',
        },
      },
      {
        ...base,
        setup: {
          ...base.setup,
          release: {
            ...base.setup.release,
            bundle: {
              ...base.setup.release.bundle,
              descriptorSha256: 'f'.repeat(64),
            },
          },
        },
      },
      {
        ...base,
        setup: {
          ...base.setup,
          bundleSource: {
            ...base.setup.bundleSource,
            completeTreeSha256: 'e'.repeat(64),
          },
        },
      },
    ]
    let ownerCreations = 0
    let spawnCapabilityCalls = 0
    let nativeRuntimeSpawns = 0
    let stateStoreCalls = 0
    const stateStore = unreachableStateStore(() => {
      stateStoreCalls += 1
    })

    for (const mismatch of mismatches) {
      const runtime = {
        ...mismatch.runtime,
        spawn: {
          verifyRuntimeForSpawn: async (input: {
            readonly signal: AbortSignal
          }) => {
            spawnCapabilityCalls += 1
            return mismatch.runtime.spawn.verifyRuntimeForSpawn(input)
          },
        },
      }
      await assert.rejects(
        createPublicPreviewFeatureComposition(
          { ...mismatch, runtime },
          {
            stateStore,
            async createRuntimeOwner(input, expected) {
              ownerCreations += 1
              return createPublicPreviewRuntimeOwner(
                input,
                expected,
                async () => {
                  nativeRuntimeSpawns += 1
                  throw new Error('unexpected native Runtime spawn')
                },
              )
            },
          },
        ),
        /release bootstrap is inconsistent/,
      )
    }

    assert.equal(ownerCreations, 0)
    assert.equal(spawnCapabilityCalls, 0)
    assert.equal(nativeRuntimeSpawns, 0)
    assert.equal(stateStoreCalls, 0)
    assert.deepEqual(fixture.allRuntimeCalls(), beforeRuntimeCalls)
    assert.deepEqual(
      await snapshotEntries(fixture.appDataRoot),
      beforeState,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('composition snapshots validated route and display scalars before Runtime creation awaits', async () => {
  const fixture = await createFixture({ authInitiallyConnected: true })
  let feature: PublicPreviewFeatureComposition | undefined
  try {
    const origin = 'http://127.0.0.1:43123'
    const suggestedLeafName = '2026-2학기'
    const requiredApplicationCommand = 'npx ay-ple@0.0.1'
    const bootstrap = fixture.bootstrap(origin)
    let originReads = 0
    let commandReads = 0
    let suggestedLeaf = suggestedLeafName
    Object.defineProperty(bootstrap, 'origin', {
      get() {
        originReads += 1
        if (originReads > 1) {
          throw new Error('origin was reread after Runtime creation')
        }
        return origin
      },
    })
    Object.defineProperty(
      bootstrap.setup,
      'requiredApplicationCommand',
      {
        get() {
          commandReads += 1
          if (commandReads > 1) {
            throw new Error(
              'application command was reread after Runtime creation',
            )
          }
          return requiredApplicationCommand
        },
      },
    )
    Object.defineProperty(bootstrap.setup, 'suggestedLeafName', {
      get() {
        return suggestedLeaf
      },
    })

    feature = await createPublicPreviewFeatureComposition(
      bootstrap,
      {
        async createRuntimeOwner() {
          suggestedLeaf = ''
          await Promise.resolve()
          return fixture.runtimeOwner
        },
      },
    )
    const observed = await feature.adapter.observe({
      signal: signal(),
    })

    assert.equal(feature.origin, origin)
    assert.equal(originReads, 1)
    assert.equal(commandReads, 1)
    assert.equal(observed.status, 'ok')
    assert.equal(observed.projection.setup.state, 'input_required')
    if (observed.projection.setup.state !== 'input_required') {
      assert.fail('input-required setup projection expected')
    }
    assert.equal(
      observed.projection.setup.suggestedLeafName,
      suggestedLeafName,
    )
  } finally {
    if (feature) {
      await feature.close({ signal: signal() })
    } else {
      await fixture.runtimeOwner.closeCurrent({ signal: signal() })
    }
    await fixture.cleanup()
  }
})

test('unexpected adapter failures stay inside a strict safe 500 response', async () => {
  const origin = 'http://127.0.0.1:43123'
  let guardFailureCalls = 0
  const adapter: PublicPreviewCommandAdapter = {
    async observe() {
      throw new Error('private observe failure')
    },
    async dispatch() {
      throw new Error('private dispatch failure')
    },
    guardFailure(code) {
      guardFailureCalls += 1
      return decodePublicPreviewResponse({
        status: 'error',
        error: {
          code,
          displayMessage: '학기 공간 준비 상태를 확인할 수 없습니다.',
          retryable: true,
        },
        projection: {
          account: PUBLIC_PREVIEW_ACCOUNT_FIXTURES.unavailable,
          setup: PUBLIC_PREVIEW_SETUP_FIXTURES.firstConnection,
        },
      })
    },
    currentReadyWorkspace: () => null,
    beginShutdown: () => undefined,
    whenIdle: async () => undefined,
  }
  const app = express()
  app.use(
    '/api/product/public-preview',
    createPublicPreviewRouter({ adapter, origin }),
  )
  const listener = createHttpServer(app)
  await new Promise<void>((resolve, reject) => {
    listener.once('error', reject)
    listener.listen(0, '127.0.0.1', resolve)
  })
  const address = listener.address()
  assert.ok(address && typeof address === 'object')
  const baseUrl = `http://127.0.0.1:${address.port}`
  try {
    for (const request of [
      () => fetch(`${baseUrl}/api/product/public-preview`),
      () => fetch(`${baseUrl}/api/product/public-preview`, {
        method: 'POST',
        headers: jsonHeaders(origin),
        body: JSON.stringify({ command: 'account.retry' }),
      }),
    ]) {
      const response = await request()
      assert.equal(response.status, 500)
      const decoded = decodePublicPreviewResponse(await response.json())
      assert.equal(decoded.status, 'error')
      if (decoded.status === 'error') {
        assert.equal(decoded.error.code, 'setup_unavailable')
      }
    }
    assert.equal(guardFailureCalls, 2)
  } finally {
    await new Promise<void>((resolve, reject) => {
      listener.close((error) => error ? reject(error) : resolve())
    })
  }
})

async function createFixture(options: {
  readonly authInitiallyConnected?: boolean
  readonly pickerWaitsForAbort?: boolean
} = {}) {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-public-preview-server-')),
  )
  const appDataRoot = path.join(root, 'app-data')
  const displayUserHome = path.join(root, 'student-home')
  const parent = path.join(displayUserHome, 'Documents')
  const runtimeHome = path.join(root, 'runtime-home')
  const codexHome = path.join(root, 'runtime-codex-home')
  const codexSqliteHome = path.join(root, 'runtime-sqlite-home')
  const tempDirectory = path.join(root, 'runtime-temp')
  const bootstrapCwd = path.join(root, 'runtime-bootstrap')
  for (const directory of [
    appDataRoot,
    displayUserHome,
    parent,
    runtimeHome,
    codexHome,
    codexSqliteHome,
    tempDirectory,
    bootstrapCwd,
  ]) {
    await mkdir(directory, { mode: 0o700, recursive: true })
  }
  const canonicalParent = await realpath(parent)
  const canonicalDisplayHome = await realpath(displayUserHome)
  const workspaceRoot = path.join(canonicalParent, '2026-2학기')
  const source = await captureCanonicalWorkspaceBundleSource()
  const release: LaunchBinding = {
    application: {
      packageName: 'ay-ple',
      packageVersion: '0.0.1',
    },
    runtime: {
      releaseDescriptorSha256: '1'.repeat(64),
      manifestSha256: '2'.repeat(64),
      releaseId: '0.144.4',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    bundle: {
      descriptorSha256: source.descriptorSha256,
      completeTreeSha256: source.completeTreeSha256,
    },
  }
  const authRuntime = new DeterministicCodexChatRuntime({
    role: { role: 'auth-only', bootstrapCwd },
    accountReads: options.authInitiallyConnected
      ? [{ status: 'ok', account: { state: 'chatgpt' } }]
      : [
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'chatgpt' } },
        ],
    browserLoginStarts: options.authInitiallyConnected
      ? []
      : [
          {
            status: 'pending',
            attemptId: 'account_attempt_1',
            authUrl: 'https://auth.openai.com/codex',
            expiresAt: '2026-07-24T00:10:00.000Z',
          },
        ],
    browserLoginAttempts: options.authInitiallyConnected
      ? []
      : [{ status: 'completed', attemptId: 'account_attempt_1' }],
    browserLoginReleases: options.authInitiallyConnected
      ? []
      : [{ status: 'released', attemptId: 'account_attempt_1' }],
  })
  const exactConfig = {
    projectRootMarkers: [],
    globalInstructionsFile: null,
  } as const
  const exactSkills = [
    {
      name: 'ay-ple-first-assignment',
      enabled: true,
      sourceRoot: path.join(
        workspaceRoot,
        '.agents/skills/ay-ple-first-assignment',
      ),
    },
  ] as const
  let workspaceRuntime: DeterministicCodexChatRuntime | undefined
  const runtimeOwner = await createPublicPreviewRuntimeOwner(
    {
      authOnlyBootstrapCwd: bootstrapCwd,
      environment: {
        home: runtimeHome,
        codexHome,
        codexSqliteHome,
        tempDirectory,
      },
      spawn: {
        verifyRuntimeForSpawn: async () => ({
          runtimeRoot: path.join(root, 'verified-runtime'),
          identity: {
            releaseDescriptorSha256:
              release.runtime.releaseDescriptorSha256,
            manifestSha256: release.runtime.manifestSha256,
            releaseId: release.runtime.releaseId,
            target: release.runtime.target,
            runtimeContractVersion:
              release.runtime.runtimeContractVersion,
          },
        }),
      },
    },
    {
      applicationVersion: release.application.packageVersion,
      runtime: {
        releaseDescriptorSha256:
          release.runtime.releaseDescriptorSha256,
        manifestSha256: release.runtime.manifestSha256,
        releaseId: release.runtime.releaseId,
        target: release.runtime.target,
        runtimeContractVersion: release.runtime.runtimeContractVersion,
      },
    },
    async ({ role }) => {
      if (role.role === 'auth-only') return authRuntime
      workspaceRuntime = new DeterministicCodexChatRuntime({
        role,
        accountReads: [
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'chatgpt' } },
          { status: 'ok', account: { state: 'chatgpt' } },
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'signed_out' } },
          { status: 'ok', account: { state: 'chatgpt' } },
          { status: 'ok', account: { state: 'chatgpt' } },
        ],
        browserLoginStarts: [
          {
            status: 'pending',
            attemptId: 'account_attempt_2',
            authUrl: 'https://auth.openai.com/codex',
            expiresAt: '2026-07-24T00:10:00.000Z',
          },
          {
            status: 'pending',
            attemptId: 'account_attempt_3',
            authUrl: 'https://auth.openai.com/codex',
            expiresAt: '2026-07-24T00:10:00.000Z',
          },
        ],
        browserLoginAttempts: [
          { status: 'completed', attemptId: 'account_attempt_2' },
          { status: 'completed', attemptId: 'account_attempt_3' },
        ],
        browserLoginReleases: [
          { status: 'released', attemptId: 'account_attempt_2' },
          { status: 'released', attemptId: 'account_attempt_3' },
        ],
        logouts: [{ status: 'signed_out' }],
        effectiveConfigs: [
          exactConfig,
          exactConfig,
          exactConfig,
          exactConfig,
        ],
        effectiveSkills: [
          exactSkills,
          exactSkills,
          exactSkills,
          exactSkills,
        ],
      })
      return workspaceRuntime
    },
  )
  const pickerCalls = { count: 0 }
  const pickerAborts = { count: 0 }
  const pickerStarted = deferred<void>()
  const attemptIds = [
    'account_attempt_1',
    'account_attempt_2',
    'account_attempt_3',
  ]
  let parentSelection = 0
  let setupTransaction = 0
  const bootstrap = (
    origin: string,
  ): PublicPreviewServerBootstrap => ({
    applicationVersion: '0.0.1',
    origin,
    runtime: {
      authOnlyBootstrapCwd: bootstrapCwd,
      environment: {
        home: runtimeHome,
        codexHome,
        codexSqliteHome,
        tempDirectory,
      },
      spawn: {
        verifyRuntimeForSpawn: async () => ({
          runtimeRoot: path.join(root, 'unused-runtime'),
          identity: {
            releaseDescriptorSha256:
              release.runtime.releaseDescriptorSha256,
            manifestSha256: release.runtime.manifestSha256,
            releaseId: release.runtime.releaseId,
            target: release.runtime.target,
            runtimeContractVersion:
              release.runtime.runtimeContractVersion,
          },
        }),
      },
    },
    setup: {
      appDataRoot,
      bundleSource: source,
      displayUserHome: canonicalDisplayHome,
      release,
      requiredApplicationCommand: 'npx ay-ple@0.0.1',
      suggestedLeafName: '2026-2학기',
      async pickParentDirectory({ signal }) {
        pickerCalls.count += 1
        if (options.pickerWaitsForAbort) {
          pickerStarted.resolve()
          await new Promise<void>((resolve) => {
            const abort = () => {
              pickerAborts.count += 1
              resolve()
            }
            signal.addEventListener('abort', abort, { once: true })
            if (signal.aborted) abort()
          })
          return null
        }
        if (pickerCalls.count === 1) {
          throw new Error('synthetic picker failure')
        }
        return canonicalParent
      },
    },
  })
  return {
    appDataRoot,
    authRuntime,
    bootstrap,
    pickerAborts,
    pickerCalls,
    pickerStarted,
    runtimeOwner,
    async createFeature(input: PublicPreviewServerBootstrap) {
      return createPublicPreviewFeatureComposition(input, {
        runtimeOwner,
        accountAttemptId: () =>
          attemptIds.shift() ?? 'account_attempt_exhausted',
        createParentSelectionId: () =>
          `parent_selection_${++parentSelection}`,
        createSetupId: () =>
          `setup_transaction_${++setupTransaction}`,
        now: () => new Date('2026-07-24T00:00:00.000Z'),
        wait: async () => undefined,
      })
    },
    allRuntimeCalls() {
      return [
        ...authRuntime.calls,
        ...(workspaceRuntime?.calls ?? []),
      ].map(({ operation }) => operation)
    },
    privateValues: [
      root,
      appDataRoot,
      canonicalParent,
      workspaceRoot,
      runtimeHome,
      codexHome,
      source.descriptorSha256,
      source.completeTreeSha256,
      release.runtime.releaseDescriptorSha256,
      release.runtime.manifestSha256,
    ],
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

async function getPreview(baseUrl: string): Promise<PublicPreviewResponse> {
  const response = await fetch(`${baseUrl}/api/product/public-preview`)
  assert.equal(response.status, 200)
  return decodePublicPreviewResponse(await response.json())
}

async function postPreview(
  baseUrl: string,
  origin: string,
  command: PublicPreviewCommand,
  expectedStatus = 200,
): Promise<PublicPreviewResponse> {
  return rawPostPreview(
    baseUrl,
    origin,
    JSON.stringify(command),
    expectedStatus,
  )
}

async function rawPostPreview(
  baseUrl: string,
  origin: string,
  body: string,
  expectedStatus: number,
): Promise<PublicPreviewResponse> {
  const response = await fetch(
    `${baseUrl}/api/product/public-preview`,
    {
      method: 'POST',
      headers: jsonHeaders(origin),
      body,
    },
  )
  assert.equal(response.status, expectedStatus)
  return decodePublicPreviewResponse(await response.json())
}

function jsonHeaders(origin: string): Record<string, string> {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    origin,
  }
}

async function pollAccount(
  baseUrl: string,
  state: 'connected',
): Promise<PublicPreviewResponse> {
  for (let index = 0; index < 50; index += 1) {
    const response = await getPreview(baseUrl)
    if (response.projection.account.state === state) return response
    await new Promise<void>((resolve) => setImmediate(resolve))
  }
  throw new Error(`Timed out waiting for account ${state}`)
}

function assertWorkspaceReauth(
  response: PublicPreviewResponse,
  resume: 'available' | 'awaiting_account',
): void {
  assert.equal(response.projection.setup.state, 'account_required')
  if (response.projection.setup.state !== 'account_required') {
    assert.fail('account-required setup projection expected')
  }
  assert.equal(response.projection.setup.reason, 'workspace_reauth')
  if (response.projection.setup.reason !== 'workspace_reauth') {
    assert.fail('workspace reauthentication expected')
  }
  assert.equal(response.projection.setup.resume, resume)
}

function requireRecoveryId(response: PublicPreviewResponse): string {
  assertWorkspaceReauth(
    response,
    response.projection.account.state === 'connected'
      ? 'available'
      : 'awaiting_account',
  )
  if (
    response.projection.setup.state !== 'account_required' ||
    response.projection.setup.reason !== 'workspace_reauth'
  ) {
    assert.fail('workspace reauthentication required')
  }
  return response.projection.setup.recoveryId
}

function assertNoPrivateFields(
  responses: readonly PublicPreviewResponse[],
  fixture: Awaited<ReturnType<typeof createFixture>>,
): void {
  const serialized = JSON.stringify(responses)
  for (const privateValue of fixture.privateValues) {
    assert.equal(
      serialized.includes(privateValue),
      false,
      privateValue,
    )
  }
  for (const privateField of [
    'canonicalRoot',
    'workspaceId',
    'parentDevice',
    'parentInode',
    'receipt',
    'runtimeRoot',
    'releaseDescriptorSha256',
    'manifestSha256',
    'access_token',
    'refresh_token',
  ]) {
    assert.equal(serialized.includes(privateField), false, privateField)
  }
}

async function snapshotEntries(root: string): Promise<readonly string[]> {
  const entries = await readdir(root, { recursive: true })
  return [...entries].sort()
}

async function freePort(): Promise<number> {
  const server = createNetServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const port = address.port
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
  return port
}

function signal(): AbortSignal {
  return new AbortController().signal
}

function failingStateStore(): RecoverableSetupEnvelopeStore {
  return unreachableStateStore(() => {
    throw new Error('synthetic launch failure')
  })
}

function unreachableStateStore(
  onAccess: () => void,
): RecoverableSetupEnvelopeStore {
  return {
    async read() {
      onAccess()
      throw new Error('unexpected setup state read')
    },
    async compareAndReplace() {
      onAccess()
      throw new Error('unexpected setup state write')
    },
    async reconcileAbandonedWrite() {
      onAccess()
      throw new Error('unexpected setup state recovery')
    },
  }
}

function withCloseCurrent(
  runtimeOwner: PublicPreviewRuntimeOwner,
  closeCurrent: PublicPreviewRuntimeOwner['closeCurrent'],
): PublicPreviewRuntimeOwner {
  return {
    ...runtimeOwner,
    closeCurrent,
  }
}

async function settlesWithin(
  promise: Promise<unknown>,
  milliseconds: number,
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise.then(() => true, () => true),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => resolve(false), milliseconds)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
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
