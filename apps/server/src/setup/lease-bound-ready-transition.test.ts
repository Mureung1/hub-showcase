import assert from 'node:assert/strict'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  captureCanonicalWorkspaceBundleSource,
  createLeaseBoundSemesterSetupJourney,
  createSetupEnvelopeStore,
  SemesterReadyValidationError,
} from '@ay-ple/semester-workspace'
import type {
  ActiveReadyPointer,
  AdmittedSemesterWorkspace,
  LaunchBinding,
  SetupEnvelopeRead,
  WorkspaceActionAdmission,
  WorkspaceParentAuthority,
} from '@ay-ple/semester-workspace'
import type {
  CodexFreshAccount,
  CodexNativeContextPort,
} from '@ay-ple/codex-chat-runtime'
import {
  DeterministicCodexChatRuntime,
} from '@ay-ple/codex-chat-runtime/testing'

import { createAccountRuntimeCoordinator } from '../account-runtime/coordinator.js'
import {
  createAccountRuntimeRouteAdapter,
} from '../account-runtime/route-adapter.js'
import {
  createLeaseBoundReadyTransition,
} from './lease-bound-ready-transition.js'
import {
  createSetupEnvelopeActionReadiness,
} from './setup-envelope-action-readiness.js'
import {
  createWorkspaceActionAdmission,
} from './workspace-action-admission.js'
import type {
  WorkspaceNativeProjectBoundary,
} from './native-project-boundary.js'
import {
  createWorkspaceNativeProjectBoundary,
} from './native-project-boundary.js'

const workspace = {
  canonicalRoot: '/workspace/semester',
  workspaceId: `workspace_${'1'.repeat(32)}`,
  formatVersion: 3,
  manifest: {
    workspaceId: `workspace_${'1'.repeat(32)}`,
    semester: {
      yearLevel: 2,
      term: { key: '2', displayName: '2학기' },
    },
    courses: [],
  },
} as const satisfies AdmittedSemesterWorkspace

const ready = {
  setupId: 'setup_transition_test',
  release: {
    application: {
      packageName: 'ay-ple',
      packageVersion: '0.0.1',
    },
    runtime: {
      releaseDescriptorSha256: '1'.repeat(64),
      manifestSha256: '2'.repeat(64),
      releaseId: 'release_transition_test',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    bundle: {
      descriptorSha256: '3'.repeat(64),
      completeTreeSha256: '4'.repeat(64),
    },
  },
  workspace: {
    canonicalRoot: workspace.canonicalRoot,
    workspaceId: workspace.workspaceId,
    formatVersion: 3,
  },
} as const satisfies ActiveReadyPointer

test('real setup journey reaches one action-eligible Ready only after the A1 and native lease closes', async () => {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-ready-seam-')),
  )
  const appDataRoot = path.join(root, 'app-data')
  const parent = path.join(root, 'semester-parent')
  const controlledHome = path.join(root, 'controlled-home')
  const controlledCodexHome = path.join(root, 'controlled-codex-home')
  const allowReadyReturn = deferred<void>()
  let approval: Promise<unknown> | undefined
  try {
    await mkdir(appDataRoot, { mode: 0o700 })
    await chmod(appDataRoot, 0o700)
    await mkdir(parent, { mode: 0o700 })
    await mkdir(controlledHome, { mode: 0o700 })
    await mkdir(controlledCodexHome, { mode: 0o700 })
    const canonicalParent = await realpath(parent)
    const canonicalHome = await realpath(controlledHome)
    const canonicalCodexHome = await realpath(controlledCodexHome)
    const parentStats = await lstat(canonicalParent, {
      bigint: true,
    })
    const authority: WorkspaceParentAuthority = {
      selectionId: 'parent_selection_ready_seam',
      canonicalParent,
      parentDevice: parentStats.dev.toString(),
      parentInode: parentStats.ino.toString(),
    }
    const bundleSource =
      await captureCanonicalWorkspaceBundleSource()
    const release: LaunchBinding = {
      application: {
        packageName: 'ay-ple',
        packageVersion: '0.0.1',
      },
      runtime: {
        releaseDescriptorSha256: '1'.repeat(64),
        manifestSha256: '2'.repeat(64),
        releaseId: 'release_ready_seam',
        target: 'darwin-arm64',
        runtimeContractVersion: 1,
      },
      bundle: {
        descriptorSha256: bundleSource.descriptorSha256,
        completeTreeSha256: bundleSource.completeTreeSha256,
      },
    }
    const events: string[] = []
    let activeWorkspace: AdmittedSemesterWorkspace | undefined
    const coordinator = createAccountRuntimeCoordinator<
      CodexFreshAccount,
      AdmittedSemesterWorkspace,
      ActiveReadyPointer
    >({
      closeAuthOnlyRuntime: async () => {
        events.push('auth.close')
        return { status: 'closed', processTreeGone: true }
      },
      startWorkspaceRuntime: async ({ workspace }) => {
        activeWorkspace = workspace
        events.push('workspace.start')
      },
      readFreshWorkspaceAccount: async () => {
        events.push('account.read')
        return { state: 'chatgpt' }
      },
      logoutAndReadFreshAccount: async () => ({
        state: 'signed_out',
      }),
      closeCurrentRuntime: async () => ({
        status: 'closed',
        processTreeGone: true,
      }),
      sameWorkspace,
    })
    const nativeContext: CodexNativeContextPort = {
      async readEffectiveConfig({ signal }) {
        assert.equal(signal.aborted, false)
        events.push('native.config.read')
        return {
          projectRootMarkers: [],
          globalInstructionsFile: null,
        }
      },
      async listEffectiveSkills({ signal }) {
        assert.equal(signal.aborted, false)
        events.push('native.skills.list')
        assert.ok(activeWorkspace)
        return [
          {
            name: 'ay-ple-first-assignment',
            enabled: true,
            sourceRoot: path.join(
              activeWorkspace.canonicalRoot,
              '.agents/skills/ay-ple-first-assignment',
            ),
          },
        ]
      },
    }
    const transition = createLeaseBoundReadyTransition({
      lease: coordinator,
      createNativeBoundary: (candidate) =>
        createWorkspaceNativeProjectBoundary({
          workspace: candidate,
          controlledHome: canonicalHome,
          controlledCodexHome: canonicalCodexHome,
          nativeContext,
        }),
    })
    const accountObservationRuntime =
      new DeterministicCodexChatRuntime({
        role: {
          role: 'workspace',
          workspaceRoot: canonicalParent,
        },
        accountReads: [
          { status: 'ok', account: { state: 'chatgpt' } },
          { status: 'ok', account: { state: 'chatgpt' } },
        ],
      })
    const accountRoutes = createAccountRuntimeRouteAdapter({
      coordinator,
      currentAccountRuntime: async () => accountObservationRuntime,
      attemptId: () => 'account_attempt_ready_seam',
      now: () => new Date('2026-07-24T00:00:00.000Z'),
      wait: async () => undefined,
      invalidateReadyAttestation: () =>
        transition.attestation.invalidateAll(),
    })
    const store = createSetupEnvelopeStore({ appDataRoot })
    const readiness = createSetupEnvelopeActionReadiness({
      stateStore: store,
      release,
      transitionAttestation: transition.attestation,
    })
    const actionCalls = createActionCallProbe()
    const readyCommitted = deferred<void>()
    const journey = createLeaseBoundSemesterSetupJourney({
      stateStore: store,
      release,
      bundleSource,
      resolveParent: async (selectionId) =>
        selectionId === authority.selectionId
          ? {
              authority,
              presentation: {
                selectionId,
                displayName: '문서',
                safeDisplayLocation: 'Home › Documents',
              },
            }
          : null,
      createSetupId: () => 'setup_ready_seam',
      readyTransition: transition,
      async fault(point) {
        if (point !== 'after_ready_commit') return
        events.push('ready.cas')
        readyCommitted.resolve()
        await allowReadyReturn.promise
      },
    })
    const prepared = await journey.reconcile({
      kind: 'prepare',
      input: {
        yearLevel: 2,
        term: { key: '2', displayName: '2학기' },
        parentSelectionId: authority.selectionId,
        leafName: '2026-2학기',
      },
    })
    assert.equal(
      prepared.projection.state,
      'confirmation_required',
    )
    if (prepared.projection.state !== 'confirmation_required') {
      assert.fail('confirmation projection required')
    }

    approval = journey.reconcile({
      kind: 'approve',
      setupPlanId: prepared.projection.setupPlanId,
    })
    await readyCommitted.promise
    assert.ok(activeWorkspace)
    const actionAdmission = createWorkspaceActionAdmission({
      source: bundleSource,
      readiness,
      nativeBoundary: createWorkspaceNativeProjectBoundary({
        workspace: activeWorkspace,
        controlledHome: canonicalHome,
        controlledCodexHome: canonicalCodexHome,
        nativeContext,
      }),
    })
    assert.equal(
      await readiness.read(activeWorkspace),
      'setup_transition_active',
    )
    const duringCommit = await store.read()
    assert.equal(duringCommit.status, 'current')
    if (duringCommit.status !== 'current') {
      assert.fail('current setup envelope required')
    }
    assert.equal(
      duringCommit.envelope.state.kind,
      'active_ready',
    )
    assert.deepEqual(
      await attemptAcademicAction({
        admission: actionAdmission,
        workspace: activeWorkspace,
        mode: 'start',
        calls: actionCalls,
      }),
      {
        status: 'blocked',
        reason: 'setup_transition_active',
      },
    )
    assert.deepEqual(
      await attemptAcademicAction({
        admission: actionAdmission,
        workspace: activeWorkspace,
        mode: 'resume',
        calls: actionCalls,
      }),
      {
        status: 'blocked',
        reason: 'setup_transition_active',
      },
    )
    assertNoAcademicActionCalls(actionCalls)

    allowReadyReturn.resolve()
    const result = await approval
    approval = undefined
    assert.deepEqual(result, {
      outcome: 'ready_created',
      projection: {
        state: 'ready',
        workspace: activeWorkspace,
      },
    })
    assert.equal(await readiness.read(activeWorkspace), 'ready')
    assert.deepEqual(events, [
      'auth.close',
      'workspace.start',
      'account.read',
      'native.config.read',
      'native.skills.list',
      'ready.cas',
    ])

    assert.equal(
      (
        await accountRoutes.observe({
          signal: new AbortController().signal,
        })
      ).state,
      'connected',
    )
    const durableReady = await store.read()
    assert.equal(durableReady.status, 'current')
    if (
      durableReady.status !== 'current' ||
      durableReady.envelope.state.kind !== 'active_ready'
    ) {
      assert.fail('durable Ready required')
    }
    assert.equal(
      (
        await accountRoutes.dispatch({
          command: { command: 'account.logout' },
          signal: new AbortController().signal,
        })
      ).state,
      'login_required',
    )
    assert.equal(
      transition.attestation.read(activeWorkspace).state,
      'unconfirmed',
    )
    assert.equal(
      await readiness.read(activeWorkspace),
      'workspace_not_ready',
    )
    assert.deepEqual(
      await attemptAcademicAction({
        admission: actionAdmission,
        workspace: activeWorkspace,
        mode: 'start',
        calls: actionCalls,
      }),
      {
        status: 'blocked',
        reason: 'workspace_not_ready',
      },
    )
    assert.deepEqual(
      await attemptAcademicAction({
        admission: actionAdmission,
        workspace: activeWorkspace,
        mode: 'resume',
        calls: actionCalls,
      }),
      {
        status: 'blocked',
        reason: 'workspace_not_ready',
      },
    )
    assertNoAcademicActionCalls(actionCalls)
    assert.deepEqual(await store.read(), durableReady)

    assert.equal(
      (
        await accountRoutes.dispatch({
          command: { command: 'account.retry' },
          signal: new AbortController().signal,
        })
      ).state,
      'connected',
    )
    assert.equal(
      transition.attestation.read(activeWorkspace).state,
      'unconfirmed',
    )
    assert.equal(
      await readiness.read(activeWorkspace),
      'workspace_not_ready',
    )
    assert.deepEqual(await store.read(), durableReady)

    const resumed = await journey.reconcile({
      kind: 'recover',
      recoveryId: durableReady.envelope.state.pointer.setupId,
      action: 'resume',
    })
    assert.equal(resumed.outcome, 'ready_relaunch')
    assert.equal(resumed.projection.state, 'ready')
    assert.equal(
      transition.attestation.read(activeWorkspace).state,
      'confirmed',
    )
    assert.equal(await readiness.read(activeWorkspace), 'ready')
    assert.deepEqual(await store.read(), durableReady)
    assert.equal(
      (
        await attemptAcademicAction({
          admission: actionAdmission,
          workspace: activeWorkspace,
          mode: 'start',
          calls: actionCalls,
        })
      ).status,
      'admitted',
    )
    assert.equal(
      (
        await attemptAcademicAction({
          admission: actionAdmission,
          workspace: activeWorkspace,
          mode: 'resume',
          calls: actionCalls,
        })
      ).status,
      'admitted',
    )
    assert.deepEqual(actionCalls, {
      'thread/start': 1,
      'thread/resume': 1,
      'turn/start': 2,
      SkillInput: 2,
    })
  } finally {
    allowReadyReturn.resolve()
    await approval?.catch(() => undefined)
    await rm(root, { force: true, recursive: true })
  }
})

test('lease adapter preserves A1 order and holds the lease through native guard and Ready readback', async () => {
  const events: string[] = []
  const coordinator = createCoordinator(events)
  const transition = createLeaseBoundReadyTransition({
    lease: coordinator,
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async ({ signal }) => {
        assert.equal(signal.aborted, false)
        events.push('native.verify')
        return { status: 'verified' }
      }),
  })

  const first = await transition.transition({
    workspace,
    expectedReady: ready,
    commitReady: async () => {
      events.push('ready.commit')
      return ready
    },
    readReady: async () => {
      events.push('ready.read')
      return ready
    },
  })
  const second = await transition.transition({
    workspace: structuredClone(workspace),
    expectedReady: ready,
    commitReady: async () => {
      events.push('ready.commit.relaunch')
      return ready
    },
    readReady: async () => {
      events.push('ready.read.relaunch')
      return ready
    },
  })

  assert.deepEqual(first, { status: 'ready', ready })
  assert.deepEqual(second, { status: 'ready', ready })
  assert.deepEqual(events, [
    'auth.close',
    'workspace.start',
    'account.read',
    'native.verify',
    'ready.commit',
    'ready.read',
    'account.read',
    'native.verify',
    'ready.commit.relaunch',
    'ready.read.relaunch',
  ])
})

test('adapter restores native and Ready callback failures hidden by A1 account_unavailable flattening', async (t) => {
  await t.test('native conflict', async () => {
    const events: string[] = []
    const transition = createLeaseBoundReadyTransition({
      lease: createCoordinator(events),
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => {
          events.push('native.blocked')
          return { status: 'blocked', reason: 'skill_conflict' }
        }),
    })
    let commits = 0

    const result = await transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => {
        commits += 1
        return ready
      },
      readReady: async () => ready,
    })

    assert.deepEqual(result, { status: 'context_conflict' })
    assert.equal(commits, 0)
  })

  await t.test('typed missing bundle validation', async () => {
    const transition = createLeaseBoundReadyTransition({
      lease: createCoordinator([]),
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => ({
          status: 'verified',
        })),
    })

    assert.deepEqual(
      await transition.transition({
        workspace,
        expectedReady: ready,
        commitReady: async () => {
          throw new SemesterReadyValidationError('bundle_missing')
        },
        readReady: async () => {
          throw new Error('Ready is not durable')
        },
      }),
      { status: 'bundle_missing' },
    )
  })

  await t.test('commit response loss joins durable readback inside the lease', async () => {
    const events: string[] = []
    const transition = createLeaseBoundReadyTransition({
      lease: createCoordinator(events),
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => ({
          status: 'verified',
        })),
    })

    const result = await transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => {
        throw new Error('durable commit response lost')
      },
      readReady: async () => ready,
    })

    assert.deepEqual(result, { status: 'ready', ready })
  })

  await t.test('one readback response loss retries inside the lease', async () => {
    const events: string[] = []
    const transition = createLeaseBoundReadyTransition({
      lease: createCoordinator(events),
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => ({
          status: 'verified',
        })),
    })

    let readCount = 0
    const result = await transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => ready,
      readReady: async () => {
        readCount += 1
        if (readCount === 1) {
          throw new Error('readback response lost')
        }
        return ready
      },
    })

    assert.deepEqual(result, { status: 'ready', ready })
    assert.equal(readCount, 2)
  })

  await t.test('unrecoverable readback remains protected unknown', async () => {
    const events: string[] = []
    const transition = createLeaseBoundReadyTransition({
      lease: createCoordinator(events),
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => ({
          status: 'verified',
        })),
    })

    const result = await transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => {
        throw new Error('commit response lost')
      },
      readReady: async () => {
        throw new Error('readback unavailable')
      },
    })

    assert.deepEqual(result, { status: 'ready_commit_unknown' })
    assert.equal(
      transition.attestation.read(workspace).state,
      'unconfirmed',
    )
  })
})

test('durable recovery readback blocks concurrent account operations until it settles', async () => {
  const events: string[] = []
  const coordinator = createCoordinator(events)
  const recovery = deferred<ActiveReadyPointer>()
  let readyReads = 0
  const transition = createLeaseBoundReadyTransition({
    lease: coordinator,
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async () => ({
        status: 'verified',
      })),
  })
  const inFlight = transition.transition({
    workspace,
    expectedReady: ready,
    commitReady: async () => {
      events.push('ready.commit.lost')
      throw new Error('response lost after durable commit')
    },
    readReady: async () => {
      readyReads += 1
      events.push(`ready.read.${readyReads}`)
      return readyReads === 1 ? recovery.promise : ready
    },
  })
  await waitFor(() => events.includes('ready.read.1'))

  const logout = coordinator.logout({
    signal: new AbortController().signal,
  })
  await Promise.resolve()
  assert.equal(events.includes('logout'), false)
  recovery.resolve(ready)

  assert.deepEqual(await inFlight, { status: 'ready', ready })
  assert.deepEqual(await logout, {
    status: 'completed',
    result: { state: 'signed_out' },
  })
  assert.deepEqual(events, [
    'auth.close',
    'workspace.start',
    'account.read',
    'ready.commit.lost',
    'ready.read.1',
    'ready.read.2',
    'logout',
  ])
})

test('real store CAS crossed before abort is read back inside the lease before queued logout', async () => {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-ready-cas-abort-')),
  )
  const appDataRoot = path.join(root, 'app-data')
  await mkdir(appDataRoot, { mode: 0o700 })
  await chmod(appDataRoot, 0o700)
  try {
    const store = createSetupEnvelopeStore({ appDataRoot })
    assert.equal(
      (
        await store.compareAndReplace({
          expectedRevisionToken: null,
          envelope: {
            formatVersion: 1,
            revision: 1,
            state: { kind: 'empty' },
          },
        })
      ).status,
      'written',
    )
    const events: string[] = []
    const controller = new AbortController()
    const allowReadback = deferred<void>()
    const coordinator = createCoordinator(events)
    const transition = createLeaseBoundReadyTransition({
      lease: coordinator,
      transitionSignal: () => controller.signal,
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => ({
          status: 'verified',
        })),
    })
    let readbacks = 0
    const inFlight = transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => {
        const observed = await store.read()
        assert.equal(observed.status, 'current')
        if (observed.status !== 'current') assert.fail()
        assert.equal(
          (
            await store.compareAndReplace({
              expectedRevisionToken: observed.revisionToken,
              envelope: {
                formatVersion: 1,
                revision: 2,
                state: {
                  kind: 'active_ready',
                  pointer: ready,
                },
              },
            })
          ).status,
          'written',
        )
        controller.abort()
        throw new Error('response lost after real CAS')
      },
      readReady: async () => {
        readbacks += 1
        events.push(`store.readback.${readbacks}`)
        if (readbacks === 1) await allowReadback.promise
        const observed = await store.read()
        if (
          observed.status !== 'current' ||
          observed.envelope.state.kind !== 'active_ready'
        ) {
          throw new Error('Ready pointer unavailable')
        }
        return observed.envelope.state.pointer
      },
    })
    await waitFor(() => events.includes('store.readback.1'))
    const logout = coordinator.logout({
      signal: new AbortController().signal,
    })
    await Promise.resolve()
    assert.equal(events.includes('logout'), false)
    allowReadback.resolve()

    assert.deepEqual(await inFlight, { status: 'ready', ready })
    assert.deepEqual(await logout, {
      status: 'completed',
      result: { state: 'signed_out' },
    })
    assert.equal(readbacks, 2)
    assert.equal(
      transition.attestation.read(workspace).state,
      'confirmed',
    )
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('native cancellation keeps the lease until both public reads clean up', async () => {
  const events: string[] = []
  const controller = new AbortController()
  const configCleanup = deferred<void>()
  const skillsCleanup = deferred<void>()
  const coordinator = createCoordinator(events)
  const transition = createLeaseBoundReadyTransition({
    lease: coordinator,
    transitionSignal: () => controller.signal,
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async ({ signal } = {}) => {
        assert.ok(signal)
        const config = (async () => {
          events.push('config.started')
          await aborted(signal)
          events.push('config.aborted')
          await configCleanup.promise
          events.push('config.cleaned')
        })()
        const skills = (async () => {
          events.push('skills.started')
          await aborted(signal)
          events.push('skills.aborted')
          await skillsCleanup.promise
          events.push('skills.cleaned')
        })()
        await Promise.all([config, skills])
        return { status: 'blocked', reason: 'config_conflict' }
      }),
  })
  let commits = 0
  const inFlight = transition.transition({
    workspace,
    expectedReady: ready,
    commitReady: async () => {
      commits += 1
      return ready
    },
    readReady: async () => ready,
  })
  await waitFor(() => events.includes('skills.started'))

  controller.abort()
  await waitFor(() => events.includes('skills.aborted'))
  const logout = coordinator.logout({
    signal: new AbortController().signal,
  })
  await Promise.resolve()
  assert.equal(events.includes('logout'), false)
  configCleanup.resolve()
  await waitFor(() => events.includes('config.cleaned'))
  assert.equal(events.includes('logout'), false)
  skillsCleanup.resolve()

  assert.deepEqual(await inFlight, { status: 'cancelled' })
  assert.deepEqual(await logout, {
    status: 'completed',
    result: { state: 'signed_out' },
  })
  assert.equal(commits, 0)
  assert.equal(
    transition.attestation.read(workspace).state,
    'unconfirmed',
  )
  assert.deepEqual(events.slice(-3), [
    'config.cleaned',
    'skills.cleaned',
    'logout',
  ])
})

test('action readiness stays transition-active after durable CAS until A1 readback releases the lease', async () => {
  const events: string[] = []
  const readback = deferred<void>()
  let durable: SetupEnvelopeRead = { status: 'absent' }
  const transition = createLeaseBoundReadyTransition({
    lease: createCoordinator(events),
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async () => ({
        status: 'verified',
      })),
  })
  const readiness = createSetupEnvelopeActionReadiness({
    stateStore: {
      async read() {
        return durable
      },
      async compareAndReplace() {
        return { status: 'conflict' }
      },
    },
    release: ready.release,
    transitionAttestation: transition.attestation,
  })
  const inFlight = transition.transition({
    workspace,
    expectedReady: ready,
    commitReady: async () => {
      durable = activeReadyRead()
      events.push('ready.cas')
      return ready
    },
    readReady: async () => {
      events.push('ready.read.blocked')
      await readback.promise
      return ready
    },
  })
  await waitFor(() => events.includes('ready.read.blocked'))
  let productThreadStarts = 0
  const actionReadiness = await readiness.read(workspace)
  if (actionReadiness === 'ready') productThreadStarts += 1

  assert.equal(actionReadiness, 'setup_transition_active')
  assert.equal(productThreadStarts, 0)
  assert.equal(
    transition.attestation.read(workspace).state,
    'active',
  )
  readback.resolve()
  assert.deepEqual(await inFlight, { status: 'ready', ready })
  assert.equal(
    transition.attestation.read(workspace).state,
    'confirmed',
  )
  assert.equal(await readiness.read(workspace), 'ready')
})

test('durable Ready without lease-bound attestation stays action-blocked until explicit transition succeeds', async () => {
  const events: string[] = []
  let durable: SetupEnvelopeRead = { status: 'absent' }
  const transition = createLeaseBoundReadyTransition({
    lease: createCoordinator(events),
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async () => ({
        status: 'verified',
      })),
  })
  const readiness = createSetupEnvelopeActionReadiness({
    stateStore: {
      async read() {
        return durable
      },
      async compareAndReplace() {
        return { status: 'conflict' }
      },
    },
    release: ready.release,
    transitionAttestation: transition.attestation,
  })
  const unknown = await transition.transition({
    workspace,
    expectedReady: ready,
    commitReady: async () => {
      durable = activeReadyRead()
      throw new Error('response lost after durable commit')
    },
    readReady: async () => {
      throw new Error('readback unavailable')
    },
  })

  assert.deepEqual(unknown, { status: 'ready_commit_unknown' })
  assert.equal(
    transition.attestation.read(workspace).state,
    'unconfirmed',
  )
  assert.equal(await readiness.read(workspace), 'workspace_not_ready')
  let productThreadStarts = 0
  if ((await readiness.read(workspace)) === 'ready') {
    productThreadStarts += 1
  }
  assert.equal(productThreadStarts, 0)

  assert.deepEqual(
    await transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => ready,
      readReady: async () => ready,
    }),
    { status: 'ready', ready },
  )
  assert.equal(await readiness.read(workspace), 'ready')
})

test('abort after durable CAS prioritizes bounded readback and keeps failed attestation unconfirmed', async () => {
  const events: string[] = []
  let currentController = new AbortController()
  let durable: SetupEnvelopeRead = { status: 'absent' }
  let readyReads = 0
  const transition = createLeaseBoundReadyTransition({
    lease: createCoordinator(events),
    transitionSignal: () => currentController.signal,
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async () => ({
        status: 'verified',
      })),
  })
  const readiness = createSetupEnvelopeActionReadiness({
    stateStore: {
      async read() {
        return durable
      },
      async compareAndReplace() {
        return { status: 'conflict' }
      },
    },
    release: ready.release,
    transitionAttestation: transition.attestation,
  })

  const unknown = await transition.transition({
    workspace,
    expectedReady: ready,
    commitReady: async () => {
      durable = activeReadyRead()
      currentController.abort()
      throw new Error('response lost after durable CAS')
    },
    readReady: async () => {
      readyReads += 1
      throw new Error('readback unavailable after abort')
    },
  })

  assert.deepEqual(unknown, { status: 'ready_commit_unknown' })
  assert.equal(readyReads, 2)
  assert.equal(
    transition.attestation.read(workspace).state,
    'unconfirmed',
  )
  assert.equal(await readiness.read(workspace), 'workspace_not_ready')

  currentController = new AbortController()
  assert.deepEqual(
    await transition.transition({
      workspace,
      expectedReady: ready,
      commitReady: async () => ready,
      readReady: async () => ready,
    }),
    { status: 'ready', ready },
  )
  assert.equal(await readiness.read(workspace), 'ready')
})

test('a queued same-workspace failure invalidates an earlier overlapping success attestation', async () => {
  const events: string[] = []
  let nativeChecks = 0
  const transition = createLeaseBoundReadyTransition({
    lease: createCoordinator(events),
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async () => {
        nativeChecks += 1
        return nativeChecks === 1
          ? { status: 'verified' }
          : { status: 'blocked', reason: 'skill_conflict' }
      }),
  })

  const first = transition.transition(callbacks())
  const second = transition.transition(callbacks())

  assert.equal(
    transition.attestation.read(workspace).state,
    'active',
  )
  assert.deepEqual(await first, { status: 'ready', ready })
  assert.equal(
    transition.attestation.read(workspace).state,
    'active',
  )
  assert.deepEqual(await second, { status: 'context_conflict' })
  assert.equal(
    transition.attestation.read(workspace).state,
    'unconfirmed',
  )
})

test('any workspace transition invalidates an earlier workspace attestation even when the new transition fails', async () => {
  const events: string[] = []
  const transition = createLeaseBoundReadyTransition({
    lease: createCoordinator(events),
    createNativeBoundary: (candidate) =>
      nativeBoundary(candidate, async () => ({ status: 'verified' })),
  })
  assert.deepEqual(await transition.transition(callbacks()), {
    status: 'ready',
    ready,
  })
  assert.equal(
    transition.attestation.read(workspace).state,
    'confirmed',
  )
  const otherWorkspace = {
    ...structuredClone(workspace),
    canonicalRoot: '/workspace/another-semester',
    workspaceId: `workspace_${'2'.repeat(32)}`,
    manifest: {
      ...structuredClone(workspace.manifest),
      workspaceId: `workspace_${'2'.repeat(32)}`,
    },
  } satisfies AdmittedSemesterWorkspace
  const otherReady = {
    ...structuredClone(ready),
    workspace: {
      canonicalRoot: otherWorkspace.canonicalRoot,
      workspaceId: otherWorkspace.workspaceId,
      formatVersion: 3,
    },
  } satisfies ActiveReadyPointer

  assert.deepEqual(
    await transition.transition({
      workspace: otherWorkspace,
      expectedReady: otherReady,
      commitReady: async () => otherReady,
      readReady: async () => otherReady,
    }),
    {
      status: 'transition_unavailable',
      retry: 'restart_required',
    },
  )
  assert.equal(
    transition.attestation.read(workspace).state,
    'unconfirmed',
  )
})

test('adapter maps A1 failures without inventing Ready state', async (t) => {
  for (const testCase of [
    {
      name: 'fresh signed-out account',
      account: { state: 'signed_out' as const },
      expected: { status: 'reauth_required' as const },
    },
    {
      name: 'fresh unsupported account',
      account: { state: 'unsupported' as const },
      expected: { status: 'account_unavailable' as const },
    },
  ]) {
    await t.test(testCase.name, async () => {
      const coordinator = createAccountRuntimeCoordinator<
        CodexFreshAccount,
        AdmittedSemesterWorkspace,
        ActiveReadyPointer
      >({
        closeAuthOnlyRuntime: async () => ({
          status: 'closed',
          processTreeGone: true,
        }),
        startWorkspaceRuntime: async () => undefined,
        readFreshWorkspaceAccount: async () => testCase.account,
        logoutAndReadFreshAccount: async () => ({
          state: 'signed_out',
        }),
        closeCurrentRuntime: async () => ({
          status: 'closed',
          processTreeGone: true,
        }),
        sameWorkspace,
      })
      let nativeCalls = 0
      const transition = createLeaseBoundReadyTransition({
        lease: coordinator,
        createNativeBoundary: (candidate) =>
          nativeBoundary(candidate, async () => {
            nativeCalls += 1
            return { status: 'verified' }
          }),
      })

      assert.deepEqual(
        await transition.transition(callbacks()),
        testCase.expected,
      )
      assert.equal(nativeCalls, 0)
    })
  }

  await t.test('fresh account unavailable', async () => {
    const coordinator = createAccountRuntimeCoordinator<
      CodexFreshAccount,
      AdmittedSemesterWorkspace,
      ActiveReadyPointer
    >({
      closeAuthOnlyRuntime: async () => ({
        status: 'closed',
        processTreeGone: true,
      }),
      startWorkspaceRuntime: async () => undefined,
      readFreshWorkspaceAccount: async () => {
        throw new Error('account unavailable')
      },
      logoutAndReadFreshAccount: async () => ({
        state: 'signed_out',
      }),
      closeCurrentRuntime: async () => ({
        status: 'closed',
        processTreeGone: true,
      }),
      sameWorkspace,
    })
    let nativeCalls = 0
    const transition = createLeaseBoundReadyTransition({
      lease: coordinator,
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => {
          nativeCalls += 1
          return { status: 'verified' }
        }),
    })

    const result = await transition.transition(callbacks())

    assert.deepEqual(result, { status: 'account_unavailable' })
    assert.equal(nativeCalls, 0)
  })

  await t.test('ambiguous auth close', async () => {
    const coordinator = createAccountRuntimeCoordinator<
      CodexFreshAccount,
      AdmittedSemesterWorkspace,
      ActiveReadyPointer
    >({
      closeAuthOnlyRuntime: async () => ({
        status: 'ambiguous',
        processTreeGone: false,
      }),
      startWorkspaceRuntime: async () => undefined,
      readFreshWorkspaceAccount: async () => ({ state: 'chatgpt' }),
      logoutAndReadFreshAccount: async () => ({
        state: 'signed_out',
      }),
      closeCurrentRuntime: async () => ({
        status: 'closed',
        processTreeGone: true,
      }),
      sameWorkspace,
    })
    const transition = createLeaseBoundReadyTransition({
      lease: coordinator,
      createNativeBoundary: (candidate) =>
        nativeBoundary(candidate, async () => ({
          status: 'verified',
        })),
    })

    assert.deepEqual(await transition.transition(callbacks()), {
      status: 'transition_unavailable',
      retry: 'restart_required',
    })
  })
})

function createCoordinator(events: string[]) {
  return createAccountRuntimeCoordinator<
    CodexFreshAccount,
    AdmittedSemesterWorkspace,
    ActiveReadyPointer
  >({
    closeAuthOnlyRuntime: async () => {
      events.push('auth.close')
      return { status: 'closed', processTreeGone: true }
    },
    startWorkspaceRuntime: async () => {
      events.push('workspace.start')
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
    sameWorkspace,
  })
}

function callbacks() {
  return {
    workspace,
    expectedReady: ready,
    commitReady: async () => ready,
    readReady: async () => ready,
  }
}

function activeReadyRead(): SetupEnvelopeRead {
  return {
    status: 'current',
    revisionToken: 'ready',
    envelope: {
      formatVersion: 1,
      revision: 2,
      state: { kind: 'active_ready', pointer: ready },
    },
  }
}

function nativeBoundary(
  candidate: AdmittedSemesterWorkspace,
  verify: WorkspaceNativeProjectBoundary['verify'],
): WorkspaceNativeProjectBoundary {
  return { workspace: candidate, verify }
}

function sameWorkspace(
  left: AdmittedSemesterWorkspace,
  right: AdmittedSemesterWorkspace,
): boolean {
  return (
    left.canonicalRoot === right.canonicalRoot &&
    left.workspaceId === right.workspaceId
  )
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((settle) => {
    resolve = settle
  })
  return { promise, resolve }
}

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000
  while (Date.now() < deadline) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  assert.fail('condition was not reached')
}

function aborted(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

type ActionCallProbe = {
  'thread/start': number
  'thread/resume': number
  'turn/start': number
  SkillInput: number
}

function createActionCallProbe(): ActionCallProbe {
  return {
    'thread/start': 0,
    'thread/resume': 0,
    'turn/start': 0,
    SkillInput: 0,
  }
}

async function attemptAcademicAction(input: {
  readonly admission: WorkspaceActionAdmission
  readonly workspace: AdmittedSemesterWorkspace
  readonly mode: 'start' | 'resume'
  readonly calls: ActionCallProbe
}) {
  const admitted = await input.admission.admit({
    workspace: input.workspace,
    action: 'academic',
  })
  if (admitted.status !== 'admitted') return admitted
  if (input.mode === 'start') {
    input.calls['thread/start'] += 1
  } else {
    input.calls['thread/resume'] += 1
  }
  input.calls['turn/start'] += 1
  input.calls.SkillInput += 1
  return admitted
}

function assertNoAcademicActionCalls(calls: ActionCallProbe): void {
  assert.deepEqual(calls, {
    'thread/start': 0,
    'thread/resume': 0,
    'turn/start': 0,
    SkillInput: 0,
  })
}
