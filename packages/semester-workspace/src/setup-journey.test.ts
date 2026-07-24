import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  createSemesterWorkspaceAdmissionForTesting,
} from './admission.js'
import type {
  LaunchBinding,
  SemesterSetupInput,
  SetupStateEnvelope,
  VerifiedBundleSource,
  WorkspaceParentAuthority,
} from './contract.js'
import {
  createSetupEnvelopeStore,
  type RecoverableSetupEnvelopeStore,
} from './setup-envelope-store.js'
import {
  createSemesterSetupJourney,
  type SemesterSetupJourneyOptions,
} from './setup-journey.js'
import {
  captureCanonicalWorkspaceBundleSource,
  verifyWorkspaceBundle,
} from './workspace-bundle.js'
import { verifyWorkspaceStaticContext } from './workspace-context.js'

test('prepare is write-free and approve durably commits approved before one admitted prepared workspace', async () => {
  const fixture = await createJourneyFixture('prepare-approve')
  try {
    let reservationCount = 0
    let approvedObservedBeforeAdmission = false
    const journey = fixture.createJourney({
      createAdmission: () =>
        createSemesterWorkspaceAdmissionForTesting({
          async fault(point) {
            if (point !== 'before_root_reservation') return
            reservationCount += 1
            const state = await fixture.store.read()
            approvedObservedBeforeAdmission =
              state.status === 'current' &&
              state.envelope.state.kind === 'pending' &&
              state.envelope.state.receipt.lifecycle.phase ===
                'approved'
          },
        }),
    })

    const beforeAppData = await readdir(fixture.appDataRoot)
    const beforeParent = await readdir(fixture.canonicalParent)
    const prepared = await journey.reconcile({
      kind: 'prepare',
      input: fixture.input,
    })

    assert.equal(prepared.outcome, 'awaiting_approval')
    assert.equal(prepared.projection.state, 'confirmation_required')
    assert.deepEqual(await readdir(fixture.appDataRoot), beforeAppData)
    assert.deepEqual(await readdir(fixture.canonicalParent), beforeParent)
    if (prepared.projection.state !== 'confirmation_required') {
      assert.fail('confirmation projection required')
    }
    assertProjectionIsBrowserSafe(
      prepared.projection,
      fixture.canonicalParent,
    )

    const approved = await journey.reconcile({
      kind: 'approve',
      setupPlanId: prepared.projection.setupPlanId,
    })

    assert.equal(approved.outcome, 'resumed')
    assert.deepEqual(approved.projection, {
      state: 'working',
      stage: 'verifying_environment',
    })
    assert.equal(reservationCount, 1)
    assert.equal(approvedObservedBeforeAdmission, true)
    const receipt = await preparedReceipt(fixture.store)
    assert.equal(receipt.lifecycle.phase, 'prepared')
    const reopened =
      await createSemesterWorkspaceAdmissionForTesting({}).inspect({
        kind: 'reopen',
        canonicalRoot: receipt.plan.target.canonicalTarget,
      })
    assert.equal(reopened.outcome, 'admitted')
    if (reopened.outcome !== 'admitted') {
      assert.fail('prepared state must point at an admitted workspace')
    }
    assert.deepEqual(
      await verifyWorkspaceBundle({
        workspace: reopened.workspace,
        source: fixture.source,
      }),
      {
        status: 'verified',
        descriptorSha256: fixture.source.descriptorSha256,
        completeTreeSha256: fixture.source.completeTreeSha256,
      },
    )
    assert.deepEqual(
      await verifyWorkspaceStaticContext(reopened.workspace),
      { status: 'verified' },
    )
    assertProjectionIsBrowserSafe(
      approved.projection,
      fixture.canonicalParent,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('same-plan concurrent duplicate approve joins one terminal promise and one scaffold reservation', async () => {
  const fixture = await createJourneyFixture('duplicate-approve')
  try {
    let reservationCount = 0
    let releaseGate = (): void => {}
    let reachedGate = (): void => {}
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve
    })
    const reached = new Promise<void>((resolve) => {
      reachedGate = resolve
    })
    const journey = fixture.createJourney({
      createAdmission: () =>
        createSemesterWorkspaceAdmissionForTesting({
          fault(point) {
            if (point === 'before_root_reservation') {
              reservationCount += 1
            }
          },
        }),
      async fault(point) {
        if (point !== 'after_approved_commit') return
        reachedGate()
        await gate
      },
    })
    const confirmation = await confirmationFor(journey, fixture.input)

    const first = journey.reconcile({
      kind: 'approve',
      setupPlanId: confirmation.setupPlanId,
    })
    const duplicate = journey.reconcile({
      kind: 'approve',
      setupPlanId: confirmation.setupPlanId,
    })

    assert.strictEqual(duplicate, first)
    await reached
    releaseGate()
    const [firstResult, duplicateResult] = await Promise.all([
      first,
      duplicate,
    ])
    assert.deepEqual(duplicateResult, firstResult)
    assert.equal(firstResult.outcome, 'resumed')
    assert.equal(reservationCount, 1)
    assert.equal(
      (await readdir(fixture.canonicalParent)).filter(
        (entry) => entry === fixture.input.leafName,
      ).length,
      1,
    )
    assert.equal(
      (await fixture.store.read()).status,
      'current',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('response loss at each transaction boundary converges on relaunch without a second workspace', async (t) => {
  const faultPoints = [
    'after_approved_commit',
    'after_workspace_admission',
    'after_bundle_materialization',
    'before_prepared_commit',
    'after_prepared_commit',
  ] as const

  for (const faultPoint of faultPoints) {
    await t.test(faultPoint, async () => {
      const fixture = await createJourneyFixture(`response-${faultPoint}`)
      try {
        let faulted = false
        const interrupted = fixture.createJourney({
          fault(point) {
            if (!faulted && point === faultPoint) {
              faulted = true
              throw new Error(`response-lost:${point}`)
            }
          },
        })
        const confirmation = await confirmationFor(
          interrupted,
          fixture.input,
        )

        await assert.rejects(
          interrupted.reconcile({
            kind: 'approve',
            setupPlanId: confirmation.setupPlanId,
          }),
          new RegExp(`response-lost:${faultPoint}`),
        )
        const relaunched = fixture.createJourney()
        const result = await relaunched.reconcile({ kind: 'launch' })

        assert.equal(result.outcome, 'resumed')
        const receipt = await preparedReceipt(fixture.store)
        assert.equal(receipt.lifecycle.phase, 'prepared')
        assert.deepEqual(await readdir(fixture.canonicalParent), [
          fixture.input.leafName,
        ])
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('same live journey retries after a durable-boundary rejection instead of retaining a stale promise', async (t) => {
  const faultPoints = [
    'after_approved_commit',
    'after_workspace_admission',
    'after_bundle_materialization',
    'before_prepared_commit',
    'after_prepared_commit',
  ] as const

  for (const faultPoint of faultPoints) {
    await t.test(faultPoint, async () => {
      const fixture = await createJourneyFixture(
        `same-host-retry-${faultPoint}`,
      )
      try {
        let faulted = false
        const journey = fixture.createJourney({
          fault(point) {
            if (!faulted && point === faultPoint) {
              faulted = true
              throw new Error(`response-lost:${point}`)
            }
          },
        })
        const confirmation = await confirmationFor(
          journey,
          fixture.input,
        )
        const command = {
          kind: 'approve',
          setupPlanId: confirmation.setupPlanId,
        } as const

        const rejected = journey.reconcile(command)
        await assert.rejects(
          rejected,
          new RegExp(`response-lost:${faultPoint}`),
        )
        const retried = journey.reconcile(command)

        assert.notStrictEqual(retried, rejected)
        assert.equal((await retried).outcome, 'resumed')
        assert.equal(
          (await preparedReceipt(fixture.store)).lifecycle.phase,
          'prepared',
        )
        assert.deepEqual(await readdir(fixture.canonicalParent), [
          fixture.input.leafName,
        ])
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('actual process death at each transaction boundary converges on the durable receipt', async (t) => {
  const faultPoints = [
    'after_approved_commit',
    'after_workspace_admission',
    'after_bundle_materialization',
    'before_prepared_commit',
    'after_prepared_commit',
  ] as const

  for (const faultPoint of faultPoints) {
    await t.test(faultPoint, async () => {
      const fixture = await createJourneyFixture(`crash-${faultPoint}`)
      try {
        await runCrashWorker({
          appDataRoot: fixture.appDataRoot,
          parent: fixture.canonicalParent,
          faultPoint,
        })

        const result = await fixture
          .createJourney()
          .reconcile({ kind: 'launch' })

        assert.equal(result.outcome, 'resumed')
        assert.equal(
          (await preparedReceipt(fixture.store)).lifecycle.phase,
          'prepared',
        )
        assert.deepEqual(await readdir(fixture.canonicalParent), [
          fixture.input.leafName,
        ])
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('different plans, expired parent authority, and target collision fail closed without overwriting bytes', async (t) => {
  await t.test('different plan', async () => {
    const fixture = await createJourneyFixture('different-plan')
    try {
      const journey = fixture.createJourney()
      const first = await confirmationFor(journey, fixture.input)
      const second = await confirmationFor(journey, {
        ...fixture.input,
        term: { key: 'summer', displayName: '여름학기' },
      })
      assert.notEqual(first.setupPlanId, second.setupPlanId)

      const result = await journey.reconcile({
        kind: 'approve',
        setupPlanId: first.setupPlanId,
      })

      assert.equal(result.outcome, 'setup_conflict')
      assert.deepEqual(await fixture.store.read(), { status: 'absent' })
      assert.deepEqual(await readdir(fixture.canonicalParent), [])
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('expired parent', async () => {
    const fixture = await createJourneyFixture('expired-parent')
    try {
      const journey = fixture.createJourney()
      const confirmation = await confirmationFor(journey, fixture.input)
      const displaced = `${fixture.canonicalParent}-displaced`
      await rename(fixture.canonicalParent, displaced)
      await mkdir(fixture.canonicalParent, { mode: 0o700 })

      const result = await journey.reconcile({
        kind: 'approve',
        setupPlanId: confirmation.setupPlanId,
      })

      assert.equal(result.outcome, 'recovery_required')
      assert.deepEqual(await readdir(displaced), [])
      assert.deepEqual(await readdir(fixture.canonicalParent), [])
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('existing target', async () => {
    const fixture = await createJourneyFixture('existing-target')
    try {
      const journey = fixture.createJourney()
      const confirmation = await confirmationFor(journey, fixture.input)
      const target = path.join(
        fixture.canonicalParent,
        fixture.input.leafName,
      )
      await mkdir(target, { mode: 0o700 })
      const sentinel = path.join(target, 'student.txt')
      await writeFile(sentinel, 'student-owned\n')
      const before = await readFile(sentinel)

      const result = await journey.reconcile({
        kind: 'approve',
        setupPlanId: confirmation.setupPlanId,
      })

      assert.equal(result.outcome, 'recovery_required')
      assert.deepEqual(await readFile(sentinel), before)
      const receipt = await approvedReceipt(fixture.store)
      assert.equal(receipt.lifecycle.phase, 'approved')
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('current v2 target', async () => {
    const fixture = await createJourneyFixture('current-v2-target')
    try {
      const journey = fixture.createJourney()
      const confirmation = await confirmationFor(journey, fixture.input)
      const target = path.join(
        fixture.canonicalParent,
        fixture.input.leafName,
      )
      const product = path.join(target, '.ay-ple')
      await mkdir(product, { recursive: true, mode: 0o700 })
      const statePath = path.join(product, 'workspace-state.json')
      const v2Bytes = await readFile(
        new URL(
          './testing/fixtures/current-v2-workspace.json',
          import.meta.url,
        ),
      )
      await writeFile(statePath, v2Bytes)

      const result = await journey.reconcile({
        kind: 'approve',
        setupPlanId: confirmation.setupPlanId,
      })

      assert.equal(result.outcome, 'recovery_required')
      assert.deepEqual(await readFile(statePath), v2Bytes)
      assert.equal(
        (await approvedReceipt(fixture.store)).lifecycle.phase,
        'approved',
      )
    } finally {
      await fixture.cleanup()
    }
  })
})

test('owned partial admission exposes resumable recovery and discard commits intent before unlink', async () => {
  const fixture = await createJourneyFixture('owned-discard')
  try {
    let admissionFaulted = false
    const interrupted = fixture.createJourney({
      createAdmission: () =>
        createSemesterWorkspaceAdmissionForTesting({
          fault(point) {
            if (
              !admissionFaulted &&
              point === 'after_state_temp_file_sync'
            ) {
              admissionFaulted = true
              throw new Error(`workspace-interrupted:${point}`)
            }
          },
        }),
    })
    const confirmation = await confirmationFor(
      interrupted,
      fixture.input,
    )
    await assert.rejects(
      interrupted.reconcile({
        kind: 'approve',
        setupPlanId: confirmation.setupPlanId,
      }),
      /workspace-interrupted/,
    )

    const recoveryJourney = fixture.createJourney()
    const launched = await recoveryJourney.reconcile({
      kind: 'launch',
    })
    assert.equal(launched.outcome, 'recovery_required')
    assert.equal(launched.projection.state, 'recovery_required')
    if (launched.projection.state !== 'recovery_required') {
      assert.fail('owned partial must expose recovery')
    }
    assert.equal(launched.projection.reason, 'owned_incomplete')
    const target = path.join(
      fixture.canonicalParent,
      fixture.input.leafName,
    )
    let intentObservedBeforeUnlink = false
    const discarding = fixture.createJourney({
      async fault(point) {
        if (point !== 'after_discard_intent_commit') return
        const state = await fixture.store.read()
        intentObservedBeforeUnlink =
          state.status === 'current' &&
          state.envelope.state.kind === 'pending' &&
          state.envelope.state.receipt.lifecycle.phase ===
            'discard_requested'
        assert.ok((await readdir(target)).includes('.ay-ple'))
      },
    })

    const discarded = await discarding.reconcile({
      kind: 'recover',
      recoveryId: launched.projection.recoveryId,
      action: 'discard',
    })

    assert.equal(discarded.outcome, 'discarded')
    assert.equal(intentObservedBeforeUnlink, true)
    const empty = await fixture.store.read()
    assert.equal(empty.status, 'current')
    if (empty.status !== 'current') {
      assert.fail('discard must commit durable empty state')
    }
    assert.deepEqual(empty.envelope, {
      formatVersion: 1,
      revision: 3,
      state: { kind: 'empty' },
    })
    assert.match(empty.revisionToken, /^[0-9a-f]{64}$/)
    await assert.rejects(lstat(target), hasCode('ENOENT'))
  } finally {
    await fixture.cleanup()
  }
})

test('discard preserves drift, prepared workspace, and parent-swap bytes', async (t) => {
  await t.test('unknown drift before discard intent', async () => {
    const fixture = await createOwnedPartialFixture('discard-drift')
    try {
      const launched = await fixture.journey.reconcile({
        kind: 'launch',
      })
      assert.equal(launched.projection.state, 'recovery_required')
      if (launched.projection.state !== 'recovery_required') {
        assert.fail('recovery projection required')
      }
      const sentinel = path.join(fixture.target, 'student.txt')
      await writeFile(sentinel, 'preserve me\n')
      const before = await readFile(sentinel)

      const result = await fixture.journey.reconcile({
        kind: 'recover',
        recoveryId: launched.projection.recoveryId,
        action: 'discard',
      })

      assert.equal(result.outcome, 'recovery_required')
      assert.deepEqual(await readFile(sentinel), before)
      assert.equal(
        (await approvedReceipt(fixture.base.store)).lifecycle.phase,
        'approved',
      )
    } finally {
      await fixture.base.cleanup()
    }
  })

  await t.test('prepared workspace', async () => {
    const fixture = await createJourneyFixture('discard-prepared')
    try {
      const journey = fixture.createJourney()
      const confirmation = await confirmationFor(journey, fixture.input)
      await journey.reconcile({
        kind: 'approve',
        setupPlanId: confirmation.setupPlanId,
      })
      const receipt = await preparedReceipt(fixture.store)
      const statePath = path.join(
        receipt.plan.target.canonicalTarget,
        '.ay-ple',
        'workspace-state.json',
      )
      const before = await readFile(statePath)

      const result = await journey.reconcile({
        kind: 'recover',
        recoveryId: receipt.setupId,
        action: 'discard',
      })

      assert.equal(result.outcome, 'setup_conflict')
      assert.deepEqual(await readFile(statePath), before)
    } finally {
      await fixture.cleanup()
    }
  })

  await t.test('parent swap after discard intent', async () => {
    const fixture = await createOwnedPartialFixture(
      'discard-parent-swap',
    )
    try {
      const launched = await fixture.journey.reconcile({
        kind: 'launch',
      })
      assert.equal(launched.projection.state, 'recovery_required')
      if (launched.projection.state !== 'recovery_required') {
        assert.fail('recovery projection required')
      }
      const intentOnly = fixture.base.createJourney({
        fault(point) {
          if (point === 'after_discard_intent_commit') {
            throw new Error('stop-after-discard-intent')
          }
        },
      })
      await assert.rejects(
        intentOnly.reconcile({
          kind: 'recover',
          recoveryId: launched.projection.recoveryId,
          action: 'discard',
        }),
        /stop-after-discard-intent/,
      )
      const displaced = `${fixture.base.canonicalParent}-displaced`
      await rename(fixture.base.canonicalParent, displaced)
      await mkdir(fixture.base.canonicalParent, { mode: 0o700 })
      const displacedTarget = path.join(
        displaced,
        fixture.base.input.leafName,
      )
      const marker = path.join(
        displacedTarget,
        '.ay-ple',
        '.workspace-admission.json',
      )
      const before = await readFile(marker)

      const result = await fixture.base
        .createJourney()
        .reconcile({ kind: 'launch' })

      assert.equal(result.outcome, 'recovery_required')
      assert.deepEqual(await readFile(marker), before)
      assert.deepEqual(
        await readdir(fixture.base.canonicalParent),
        [],
      )
    } finally {
      await fixture.base.cleanup()
    }
  })
})

test('discard interruption at each unlink boundary resumes from durable intent', async (t) => {
  const faultPoints = [
    'after_discard_state_temp_unlink',
    'after_discard_courses_remove',
    'after_discard_inbox_remove',
    'after_discard_marker_unlink',
    'after_discard_product_root_remove',
    'after_discard_root_remove',
  ] as const

  for (const faultPoint of faultPoints) {
    await t.test(faultPoint, async () => {
      const fixture = await createOwnedPartialFixture(
        `discard-interrupt-${faultPoint}`,
      )
      try {
        const launched = await fixture.journey.reconcile({
          kind: 'launch',
        })
        assert.equal(launched.projection.state, 'recovery_required')
        if (launched.projection.state !== 'recovery_required') {
          assert.fail('recovery projection required')
        }
        let faulted = false
        const interrupted = fixture.base.createJourney({
          createAdmission: () =>
            createSemesterWorkspaceAdmissionForTesting({
              fault(point) {
                if (!faulted && point === faultPoint) {
                  faulted = true
                  throw new Error(`discard-interrupted:${point}`)
                }
              },
            }),
        })

        await assert.rejects(
          interrupted.reconcile({
            kind: 'recover',
            recoveryId: launched.projection.recoveryId,
            action: 'discard',
          }),
          new RegExp(`discard-interrupted:${faultPoint}`),
        )
        const intent = await approvedReceipt(fixture.base.store)
        assert.equal(intent.lifecycle.phase, 'discard_requested')

        const resumed = await fixture.base
          .createJourney()
          .reconcile({ kind: 'launch' })

        assert.equal(resumed.outcome, 'discarded')
        const empty = await fixture.base.store.read()
        assert.equal(empty.status, 'current')
        if (empty.status !== 'current') {
          assert.fail('discard resume must commit durable empty')
        }
        assert.deepEqual(empty.envelope.state, { kind: 'empty' })
        await assert.rejects(lstat(fixture.target), hasCode('ENOENT'))
      } finally {
        await fixture.base.cleanup()
      }
    })
  }
})

test('prepared relaunch binds the verified bundle to the exact durable release and observe stays read-only', async () => {
  const fixture = await createJourneyFixture('prepared-binding')
  try {
    const journey = fixture.createJourney()
    const confirmation = await confirmationFor(journey, fixture.input)
    await journey.reconcile({
      kind: 'approve',
      setupPlanId: confirmation.setupPlanId,
    })
    const beforeAppData = await snapshotTree(fixture.appDataRoot)
    const receipt = await preparedReceipt(fixture.store)
    const beforeWorkspace = await snapshotTree(
      receipt.plan.target.canonicalTarget,
    )

    for (let index = 0; index < 5; index += 1) {
      assert.deepEqual(journey.observe(), {
        state: 'working',
        stage: 'verifying_environment',
      })
    }
    assert.deepEqual(await snapshotTree(fixture.appDataRoot), beforeAppData)
    assert.deepEqual(
      await snapshotTree(receipt.plan.target.canonicalTarget),
      beforeWorkspace,
    )

    const mismatchedSource = {
      ...fixture.source,
      descriptorSha256: '0'.repeat(64),
    } satisfies VerifiedBundleSource
    const result = await fixture
      .createJourney({ bundleSource: mismatchedSource })
      .reconcile({ kind: 'launch' })

    assert.equal(result.outcome, 'setup_release_mismatch')
    assert.deepEqual(
      await snapshotTree(receipt.plan.target.canonicalTarget),
      beforeWorkspace,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('forged source hash fields cannot bypass prepared relaunch verification', async () => {
  const fixture = await createJourneyFixture('prepared-forged-source')
  try {
    const journey = fixture.createJourney()
    const confirmation = await confirmationFor(journey, fixture.input)
    await journey.reconcile({
      kind: 'approve',
      setupPlanId: confirmation.setupPlanId,
    })
    const observed = await fixture.store.read()
    assert.equal(observed.status, 'current')
    if (
      observed.status !== 'current' ||
      observed.envelope.state.kind !== 'pending'
    ) {
      assert.fail('prepared receipt required')
    }
    const forgedSource = {
      ...fixture.source,
      descriptorSha256: '3'.repeat(64),
      completeTreeSha256: '4'.repeat(64),
    } satisfies VerifiedBundleSource
    const forgedRelease: LaunchBinding = {
      ...fixture.release,
      bundle: {
        descriptorSha256: forgedSource.descriptorSha256,
        completeTreeSha256: forgedSource.completeTreeSha256,
      },
    }
    const forgedEnvelope: SetupStateEnvelope = {
      formatVersion: 1,
      revision: observed.envelope.revision + 1,
      state: {
        kind: 'pending',
        receipt: {
          ...observed.envelope.state.receipt,
          release: forgedRelease,
        },
      },
    }
    const written = await fixture.store.compareAndReplace({
      expectedRevisionToken: observed.revisionToken,
      envelope: forgedEnvelope,
    })
    assert.equal(written.status, 'written')

    const result = await fixture
      .createJourney({
        release: forgedRelease,
        bundleSource: forgedSource,
      })
      .reconcile({ kind: 'launch' })

    assert.equal(result.outcome, 'recovery_required')
    assert.equal(result.projection.state, 'recovery_required')
    if (result.projection.state !== 'recovery_required') {
      assert.fail('forged source must require recovery')
    }
    assert.equal(result.projection.reason, 'bundle_conflict')
  } finally {
    await fixture.cleanup()
  }
})

async function createOwnedPartialFixture(name: string) {
  const base = await createJourneyFixture(name)
  let faulted = false
  const interrupted = base.createJourney({
    createAdmission: () =>
      createSemesterWorkspaceAdmissionForTesting({
        fault(point) {
          if (
            !faulted &&
            point === 'after_state_temp_file_sync'
          ) {
            faulted = true
            throw new Error('partial-admission')
          }
        },
      }),
  })
  const confirmation = await confirmationFor(interrupted, base.input)
  await assert.rejects(
    interrupted.reconcile({
      kind: 'approve',
      setupPlanId: confirmation.setupPlanId,
    }),
    /partial-admission/,
  )
  return {
    base,
    target: path.join(base.canonicalParent, base.input.leafName),
    journey: base.createJourney(),
  }
}

async function createJourneyFixture(name: string) {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), `ay-ple-setup-journey-${name}-`)),
  )
  const appDataRoot = path.join(root, 'app-data')
  const parent = path.join(root, 'semester-parent')
  await mkdir(appDataRoot, { mode: 0o700 })
  await chmod(appDataRoot, 0o700)
  await mkdir(parent, { mode: 0o700 })
  const canonicalParent = await realpath(parent)
  const stats = await lstat(canonicalParent, { bigint: true })
  const authority: WorkspaceParentAuthority = {
    selectionId: `parent_selection_${name}`,
    canonicalParent,
    parentDevice: stats.dev.toString(),
    parentInode: stats.ino.toString(),
  }
  const source = await captureCanonicalWorkspaceBundleSource()
  const release: LaunchBinding = {
    application: {
      packageName: 'ay-ple',
      packageVersion: '0.0.1',
    },
    runtime: {
      releaseDescriptorSha256: '1'.repeat(64),
      manifestSha256: '2'.repeat(64),
      releaseId: 'release_durable_setup_test',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    bundle: {
      descriptorSha256: source.descriptorSha256,
      completeTreeSha256: source.completeTreeSha256,
    },
  }
  const store = createSetupEnvelopeStore({ appDataRoot })
  const input: SemesterSetupInput = {
    yearLevel: 2,
    term: { key: '2', displayName: '2학기' },
    parentSelectionId: authority.selectionId,
    leafName: '2026-2학기',
  }
  const defaults: SemesterSetupJourneyOptions = {
    stateStore: store,
    release,
    bundleSource: source,
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
    createSetupId: () => `setup_transaction_${name}`,
  }
  return {
    root,
    appDataRoot,
    canonicalParent,
    authority,
    source,
    release,
    store,
    input,
    createJourney(
      overrides: Partial<SemesterSetupJourneyOptions> = {},
    ) {
      return createSemesterSetupJourney({
        ...defaults,
        ...overrides,
      })
    },
    cleanup: () => rm(root, { force: true, recursive: true }),
  }
}

async function confirmationFor(
  journey: ReturnType<typeof createSemesterSetupJourney>,
  input: SemesterSetupInput,
) {
  const result = await journey.reconcile({ kind: 'prepare', input })
  assert.equal(result.projection.state, 'confirmation_required')
  if (result.projection.state !== 'confirmation_required') {
    assert.fail('confirmation projection required')
  }
  return result.projection
}

async function approvedReceipt(store: RecoverableSetupEnvelopeStore) {
  const observed = await store.read()
  assert.equal(observed.status, 'current')
  if (
    observed.status !== 'current' ||
    observed.envelope.state.kind !== 'pending'
  ) {
    assert.fail('pending setup receipt required')
  }
  return observed.envelope.state.receipt
}

async function preparedReceipt(store: RecoverableSetupEnvelopeStore) {
  const receipt = await approvedReceipt(store)
  assert.equal(receipt.lifecycle.phase, 'prepared')
  return receipt
}

function assertProjectionIsBrowserSafe(
  projection: unknown,
  privatePath: string,
): void {
  const serialized = JSON.stringify(projection)
  assert.equal(serialized.includes(privatePath), false)
  assert.equal(serialized.includes('"canonicalBytesSha256"'), false)
  assert.equal(serialized.includes('"lifecycle"'), false)
  assert.equal(serialized.includes('"phase"'), false)
  assert.equal(serialized.includes('"ready"'), false)
}

async function snapshotTree(root: string): Promise<readonly string[]> {
  const snapshot: string[] = []
  await walk(root, '', snapshot)
  return snapshot
}

async function walk(
  root: string,
  relative: string,
  snapshot: string[],
): Promise<void> {
  const directory = relative ? path.join(root, relative) : root
  for (const entry of (await readdir(directory)).sort()) {
    const next = relative ? `${relative}/${entry}` : entry
    const target = path.join(root, next)
    const stats = await lstat(target)
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      snapshot.push(`d:${next}:${stats.mode & 0o7777}`)
      await walk(root, next, snapshot)
    } else {
      snapshot.push(
        `f:${next}:${stats.mode & 0o7777}:${(await readFile(target)).toString('base64')}`,
      )
    }
  }
}

function hasCode(code: string) {
  return (error: unknown): boolean =>
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
}

async function runCrashWorker(input: {
  readonly appDataRoot: string
  readonly parent: string
  readonly faultPoint: string
}): Promise<void> {
  const worker = fileURLToPath(
    new URL(
      './testing/setup-journey-crash-worker.ts',
      import.meta.url,
    ),
  )
  const child = spawn(
    fileURLToPath(
      new URL('../../../node_modules/.bin/tsx', import.meta.url),
    ),
    [worker, input.appDataRoot, input.parent, input.faultPoint],
    {
      cwd: fileURLToPath(new URL('../../..', import.meta.url)),
      env: {
        ...process.env,
        NODE_OPTIONS: '--conditions=development',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    },
  )
  let stderr = ''
  child.stderr.setEncoding('utf8')
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk
  })
  const exit = await new Promise<{
    readonly code: number | null
    readonly signal: NodeJS.Signals | null
  }>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => resolve({ code, signal }))
  })
  assert.ok(
    (exit.code === null && exit.signal === 'SIGKILL') ||
      (exit.code === 137 && exit.signal === null),
    stderr || JSON.stringify(exit),
  )
}
