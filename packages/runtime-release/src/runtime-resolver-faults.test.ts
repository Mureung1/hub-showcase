import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  RuntimeResolveProgress,
} from './contract.js'
import {
  bootstrapRuntimeCache,
} from './runtime-cache-bootstrap.js'
import {
  createRuntimeGenerationVerificationReceipt,
  createRuntimeStagingIdentity,
} from './runtime-cache-authority.js'
import {
  FileRuntimeCacheLeaseCoordinator,
} from './runtime-cache-lease.js'
import type {
  RuntimeCacheLeaseHandle,
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
  RuntimeGenerationVerificationReceipt,
} from './runtime-cache-authority.js'
import type {
  RuntimeGenerationInspection,
  PublishedRuntimeGenerationSnapshot,
} from './runtime-generation.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmissionInput,
} from './runtime-release-authority.js'
import {
  createRuntimeResolutionScheduler,
} from './runtime-resolution-control.js'
import type {
  RuntimeResolutionScheduler,
} from './runtime-resolution-control.js'
import {
  createRuntimeResolverBundleForTesting,
} from './runtime-resolver.js'
import type {
  RuntimeResolverBundleInput,
  RuntimeResolverLeasePort,
  RuntimeResolverOperationOverrides,
} from './runtime-resolver.js'
import {
  ScriptedArchiveTransport,
  createOwnerOnlyTempAppDataRoot,
  createRuntimeResolverReleaseFixture,
} from './runtime-resolver-fixture.test.js'

type AcquiredLease = Extract<
  RuntimeCacheLeaseHandle,
  { readonly kind: 'acquired' }
>

class RecordingLease implements RuntimeResolverLeasePort {
  acquireCalls = 0
  completeCalls = 0
  readonly events: string[] = []
  failCalls = 0
  readonly handle: AcquiredLease = {
    kind: 'acquired',
    leaseIdentity: {
      device: '1',
      inode: '2',
      ownerUid: process.getuid!(),
    },
    release: async () => undefined,
  }
  onAcquire?: (
    signal: AbortSignal,
  ) => Promise<RuntimeCacheLeaseHandle>
  onComplete?: () => Promise<void>
  onFail?: () => Promise<void>

  async acquireOrJoin(input: {
    readonly signal: AbortSignal
  }): Promise<RuntimeCacheLeaseHandle> {
    this.acquireCalls += 1
    this.events.push('acquire')
    return (
      (await this.onAcquire?.(input.signal)) ??
      this.handle
    )
  }

  async complete(
    _handle: AcquiredLease,
    _receipt: RuntimeGenerationVerificationReceipt,
  ): Promise<void> {
    this.completeCalls += 1
    this.events.push('complete')
    await this.onComplete?.()
  }

  async fail(
    _handle: AcquiredLease,
    _failure: unknown,
  ): Promise<void> {
    this.failCalls += 1
    this.events.push('fail')
    await this.onFail?.()
  }
}

test('factory admission is synchronous, immutable, and precedes every effect', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const lease = new RecordingLease()
  const transport = new ScriptedArchiveTransport()
  let bootstrapCalls = 0
  const invalidDescriptor = structuredClone(
    fixture.admissionInput.descriptor,
  ) as Record<string, unknown>
  invalidDescriptor.schemaVersion = 2

  assert.throws(
    () =>
      createRuntimeResolverBundleForTesting(
        {
          ...fixture.admissionInput,
          descriptor: invalidDescriptor,
          owner: resolverOwner(),
        },
        testDependencies(lease, transport, {
          bootstrap: async () => {
            bootstrapCalls += 1
            throw new Error('must not run')
          },
        }),
      ),
    hasFailureCode('runtime_incompatible'),
  )
  assert.equal(bootstrapCalls, 0)
  assert.equal(lease.acquireCalls, 0)
  assert.equal(transport.requests.length, 0)

  let ownerReads = 0
  const flippingOwner: RuntimeResolverBundleInput['owner'] = {
    get applicationInstanceNonce() {
      ownerReads += 1
      return ownerReads === 1
        ? 'a'.repeat(32)
        : 'not-valid-after-first-read'
    },
    processStartIdentity: 'single-read-owner',
  }
  assert.doesNotThrow(() =>
    createRuntimeResolverBundleForTesting(
      {
        ...fixture.admissionInput,
        owner: flippingOwner,
      },
      testDependencies(lease, transport, {}),
    ),
  )
  assert.equal(ownerReads, 1)

  let ownerObjectReads = 0
  const inputWithOwnerGetter = {
    ...fixture.admissionInput,
    get owner(): RuntimeResolverBundleInput['owner'] {
      ownerObjectReads += 1
      return ownerObjectReads === 1
        ? resolverOwner()
        : {
            applicationInstanceNonce: 'invalid',
            processStartIdentity: 'changed-owner',
          }
    },
  }
  assert.doesNotThrow(() =>
    createRuntimeResolverBundleForTesting(
      inputWithOwnerGetter,
      testDependencies(lease, transport, {}),
    ),
  )
  assert.equal(ownerObjectReads, 1)

  const harness = await createFastHarness(
    fixture.admissionInput,
  )
  try {
    const inputDescriptor =
      fixture.admissionInput.descriptor as {
        launcher: { version: string }
      }
    inputDescriptor.launcher.version = '9.9.9'
    fixture.admissionInput.canonicalManifestBytes.fill(0)

    const runtime = await harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    assert.equal(
      runtime.identity.releaseId,
      fixture.admission.identity.releaseId,
    )
    assert.equal(harness.lease.completeCalls, 1)
  } finally {
    await harness.cleanup()
  }
})

test('complete and fail invocation claim terminal settlement even when the lease port rejects', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const completeHarness = await createFastHarness(
    fixture.admissionInput,
    { initialGeneration: 'verified' },
  )
  completeHarness.lease.onComplete = async () => {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'complete_fault',
    })
  }
  try {
    await assert.rejects(
      completeHarness.bundle.resolver.resolve({
        appDataRoot: completeHarness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(completeHarness.lease.completeCalls, 1)
    assert.equal(completeHarness.lease.failCalls, 0)
  } finally {
    await completeHarness.cleanup()
  }

  const failHarness = await createFastHarness(
    fixture.admissionInput,
    {
      operations: {
        inspectGeneration: async () => {
          throw runtimeAuthorityError(
            'runtime_storage_unavailable',
            { kind: 'inspection_fault' },
          )
        },
      },
    },
  )
  failHarness.lease.onFail = async () => {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'fail_release_fault',
    })
  }
  try {
    await assert.rejects(
      failHarness.bundle.resolver.resolve({
        appDataRoot: failHarness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(failHarness.lease.completeCalls, 0)
    assert.equal(failHarness.lease.failCalls, 1)
  } finally {
    await failHarness.cleanup()
  }
})

test('publish post-commit cancellation completes the lease, performs readback, and never reports ready', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  let inspectionCalls = 0
  const progress: RuntimeResolveProgress[] = []
  const harness = await createFastHarness(
    fixture.admissionInput,
    {
      operations: {
        inspectGeneration: async () => {
          inspectionCalls += 1
          harness.lease.events.push('inspect')
          return inspectionCalls === 1
            ? { kind: 'absent' }
            : {
                kind: 'verified',
                generation: harness.generation,
              }
        },
        publish: async () => {
          harness.lease.events.push('publish')
          return {
            ...harness.generation,
            cancelledAfterCommit: true,
          }
        },
      },
    },
  )
  try {
    await assert.rejects(
      harness.bundle.resolver.resolve({
        appDataRoot: harness.appDataRoot,
        signal: new AbortController().signal,
        report: (entry) => progress.push(entry),
      }),
      hasFailureCode('runtime_cancelled'),
    )
    assert.equal(harness.lease.completeCalls, 1)
    assert.equal(harness.lease.failCalls, 0)
    assert.equal(inspectionCalls, 2)
    assert.deepEqual(harness.lease.events, [
      'acquire',
      'inspect',
      'publish',
      'complete',
      'inspect',
    ])
    assert.equal(
      progress.some((entry) => entry.phase === 'ready'),
      false,
    )
  } finally {
    await harness.cleanup()
  }
})

test('generation and retained-archive post-commit quarantine cancellation fail the lease without continuing repair', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  let archiveInspections = 0
  const generationHarness = await createFastHarness(
    fixture.admissionInput,
    {
      initialGeneration: 'owned-invalid',
      operations: {
        inspectRetainedArchive: async () => {
          archiveInspections += 1
          return { kind: 'absent' }
        },
        quarantineGeneration: async () => {
          generationHarness.lease.events.push(
            'quarantine_generation',
          )
          return {
            kind: 'runtime_generation_quarantined',
            cancelledAfterCommit: true,
          }
        },
      },
    },
  )
  try {
    await assert.rejects(
      generationHarness.bundle.resolver.resolve({
        appDataRoot: generationHarness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_cancelled'),
    )
    assert.equal(generationHarness.lease.failCalls, 1)
    assert.equal(generationHarness.lease.completeCalls, 0)
    assert.equal(archiveInspections, 0)
    assert.deepEqual(generationHarness.lease.events, [
      'acquire',
      'quarantine_generation',
      'fail',
    ])
  } finally {
    await generationHarness.cleanup()
  }

  let downloads = 0
  const archiveHarness = await createFastHarness(
    fixture.admissionInput,
    {
      retainedArchive: 'owned-invalid',
      operations: {
        download: async () => {
          downloads += 1
          return archiveHarness.archive
        },
        quarantineRetainedArchive: async () => {
          archiveHarness.lease.events.push(
            'quarantine_archive',
          )
          return {
            kind: 'retained_archive_quarantined',
            cancelledAfterCommit: true,
            transactionNonce: '1'.repeat(32),
          }
        },
      },
    },
  )
  try {
    await assert.rejects(
      archiveHarness.bundle.resolver.resolve({
        appDataRoot: archiveHarness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_cancelled'),
    )
    assert.equal(archiveHarness.lease.failCalls, 1)
    assert.equal(archiveHarness.lease.completeCalls, 0)
    assert.equal(downloads, 0)
    assert.deepEqual(archiveHarness.lease.events, [
      'acquire',
      'quarantine_archive',
      'fail',
    ])
  } finally {
    await archiveHarness.cleanup()
  }
})

test('pre-commit publish and quarantine cancellation fail once and never report ready', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const scenarios = [
    {
      name: 'publish',
      options: {
        operations: {
          publish: async () => {
            throw runtimeAuthorityError('runtime_cancelled', {
              kind: 'publish_precommit_cancelled',
            })
          },
        },
      },
    },
    {
      name: 'generation_quarantine',
      options: {
        initialGeneration: 'owned-invalid' as const,
        operations: {
          quarantineGeneration: async () => {
            throw runtimeAuthorityError('runtime_cancelled', {
              kind:
                'generation_quarantine_precommit_cancelled',
            })
          },
        },
      },
    },
    {
      name: 'archive_quarantine',
      options: {
        retainedArchive: 'owned-invalid' as const,
        operations: {
          quarantineRetainedArchive: async () => {
            throw runtimeAuthorityError('runtime_cancelled', {
              kind:
                'archive_quarantine_precommit_cancelled',
            })
          },
        },
      },
    },
  ] as const

  for (const scenario of scenarios) {
    const harness = await createFastHarness(
      fixture.admissionInput,
      scenario.options,
    )
    const progress: RuntimeResolveProgress[] = []
    try {
      await assert.rejects(
        harness.bundle.resolver.resolve({
          appDataRoot: harness.appDataRoot,
          signal: new AbortController().signal,
          report: (entry) => progress.push(entry),
        }),
        hasFailureCode('runtime_cancelled'),
        scenario.name,
      )
      assert.equal(
        harness.lease.completeCalls,
        0,
        scenario.name,
      )
      assert.equal(
        harness.lease.failCalls,
        1,
        scenario.name,
      )
      assert.equal(
        progress.some((entry) => entry.phase === 'ready'),
        false,
        scenario.name,
      )
    } finally {
      await harness.cleanup()
    }
  }
})

test('an acquired handle returned after last-caller abort is failed exactly once', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const acquired = deferred<void>()
  const returnHandle = deferred<void>()
  const lease = new RecordingLease()
  lease.onAcquire = async (signal) => {
    acquired.resolve()
    await returnHandle.promise
    assert.equal(signal.aborted, true)
    return lease.handle
  }
  const harness = await createFastHarness(
    fixture.admissionInput,
    { lease },
  )
  const controller = new AbortController()
  try {
    const resolving = harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: controller.signal,
      report: () => undefined,
    })
    await acquired.promise
    controller.abort()
    await assert.rejects(
      resolving,
      hasFailureCode('runtime_cancelled'),
    )
    returnHandle.resolve()
    await waitFor(
      () => lease.failCalls === 1,
      'acquired lease failure settlement',
    )
    assert.equal(lease.completeCalls, 0)
    assert.equal(lease.failCalls, 1)
  } finally {
    returnHandle.resolve()
    await harness.cleanup()
  }
})

test('a late caller waits for a cancelled draining flight and starts a fresh transaction', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const inspectionStarted = deferred<void>()
  const releaseCancelledInspection = deferred<void>()
  let inspections = 0
  const harness = await createFastHarness(
    fixture.admissionInput,
    {
      operations: {
        inspectGeneration: async (input) => {
          inspections += 1
          if (inspections === 1) {
            inspectionStarted.resolve()
            await abortObserved(input.signal)
            await releaseCancelledInspection.promise
            throw runtimeAuthorityError('runtime_cancelled', {
              kind: 'cancelled_first_inspection',
            })
          }
          return {
            kind: 'verified',
            generation: harness.generation,
          }
        },
      },
    },
  )
  const firstController = new AbortController()
  try {
    const first = harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: firstController.signal,
      report: () => undefined,
    })
    await inspectionStarted.promise
    firstController.abort()
    await assert.rejects(
      first,
      hasFailureCode('runtime_cancelled'),
    )

    const late = harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    releaseCancelledInspection.resolve()
    const runtime = await late

    assert.equal(
      runtime.identity.releaseId,
      fixture.admission.identity.releaseId,
    )
    assert.equal(harness.lease.acquireCalls, 2)
    assert.equal(harness.lease.failCalls, 1)
    assert.equal(harness.lease.completeCalls, 1)
  } finally {
    releaseCancelledInspection.resolve()
    await harness.cleanup()
  }
})

test('ambiguous generation inspection fails closed without quarantine, download, or publish', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  let quarantines = 0
  let downloads = 0
  let publishes = 0
  const harness = await createFastHarness(
    fixture.admissionInput,
    {
      operations: {
        download: async () => {
          downloads += 1
          return harness.archive
        },
        inspectGeneration: async () => {
          throw runtimeAuthorityError(
            'runtime_recovery_required',
            { kind: 'ambiguous_generation_roster' },
          )
        },
        publish: async () => {
          publishes += 1
          return harness.generation
        },
        quarantineGeneration: async () => {
          quarantines += 1
          return {
            kind: 'runtime_generation_quarantined',
            cancelledAfterCommit: false,
          }
        },
      },
    },
  )
  try {
    await assert.rejects(
      harness.bundle.resolver.resolve({
        appDataRoot: harness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    assert.equal(quarantines, 0)
    assert.equal(downloads, 0)
    assert.equal(publishes, 0)
    assert.equal(harness.lease.failCalls, 1)
  } finally {
    await harness.cleanup()
  }
})

test('a same-owner cross-bundle caller joins the lease while a different owner fails without mutation', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const harness = await createFastHarness(
    fixture.admissionInput,
  )
  const inspectionStarted = deferred<void>()
  const releaseInspection = deferred<void>()
  let inspections = 0
  let mutationCalls = 0
  const operations: RuntimeResolverOperationOverrides = {
    ...harness.operations,
    download: async () => {
      mutationCalls += 1
      return harness.archive
    },
    inspectGeneration: async () => {
      inspections += 1
      if (inspections === 1) {
        inspectionStarted.resolve()
        await releaseInspection.promise
      }
      return {
        kind: 'verified',
        generation: harness.generation,
      }
    },
    publish: async () => {
      mutationCalls += 1
      return harness.generation
    },
    quarantineGeneration: async () => {
      mutationCalls += 1
      return {
        kind: 'runtime_generation_quarantined',
        cancelledAfterCommit: false,
      }
    },
  }
  const lease = new FileRuntimeCacheLeaseCoordinator()
  const owner = resolverOwner()
  const ownerBundle = createBundleWith(
    fixture.admissionInput,
    owner,
    lease,
    operations,
    '1',
  )
  const joinedBundle = createBundleWith(
    fixture.admissionInput,
    owner,
    lease,
    operations,
    '2',
  )
  const conflictingBundle = createBundleWith(
    fixture.admissionInput,
    {
      ...owner,
      applicationInstanceNonce: 'b'.repeat(32),
    },
    lease,
    operations,
    '3',
  )
  try {
    const first = ownerBundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    await inspectionStarted.promise
    const joined = joinedBundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    await assert.rejects(
      conflictingBundle.resolver.resolve({
        appDataRoot: harness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_recovery_required'),
    )

    releaseInspection.resolve()
    const [firstRuntime, joinedRuntime] = await Promise.all([
      first,
      joined,
    ])
    assert.deepEqual(joinedRuntime, firstRuntime)
    assert.equal(mutationCalls, 0)
    assert.ok(inspections >= 5)
  } finally {
    releaseInspection.resolve()
    await harness.cleanup()
  }
})

test('a namespace identity replacement cannot join an existing resolver flight', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const inspectionStarted = deferred<void>()
  const releaseInspection = deferred<void>()
  let bootstrapCalls = 0
  let inspections = 0
  const harness = await createFastHarness(
    fixture.admissionInput,
    {
      operations: {
        bootstrap: async () => {
          bootstrapCalls += 1
          if (bootstrapCalls === 1) return harness.cache
          return withChangedStagingNamespace(harness.cache)
        },
        inspectGeneration: async () => {
          inspections += 1
          if (inspections === 1) {
            inspectionStarted.resolve()
            await releaseInspection.promise
          }
          return {
            kind: 'verified',
            generation: harness.generation,
          }
        },
      },
    },
  )
  try {
    const first = harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    await inspectionStarted.promise

    await assert.rejects(
      harness.bundle.resolver.resolve({
        appDataRoot: harness.appDataRoot,
        signal: new AbortController().signal,
        report: () => undefined,
      }),
      hasFailureCode('runtime_recovery_required'),
    )
    releaseInspection.resolve()
    await first
    assert.equal(harness.lease.acquireCalls, 1)
  } finally {
    releaseInspection.resolve()
    await harness.cleanup()
  }
})

test('resolver wires Retry-After through the deadline and isolates a throwing reporter', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const fakeScheduler = createFakeScheduler()
  const phases: RuntimeResolveProgress['phase'][] = []
  const harness = await createFastHarness(
    fixture.admissionInput,
    {
      retainedArchive: 'absent',
      scheduler: fakeScheduler.scheduler,
      operations: {
        download: async (input) => {
          await input.events?.beforeTransientRetry?.({
            retryAfter: ['1'],
          })
          input.events?.onReceivedBytes?.({
            receivedBytes: 3,
            totalBytes: 10,
          })
          input.events?.onReceivedBytes?.({
            receivedBytes: 2,
            totalBytes: 10,
          })
          input.events?.onReceivedBytes?.({
            receivedBytes: 10,
            totalBytes: 10,
          })
          return harness.archive
        },
      },
    },
  )
  try {
    const runtime = await harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: (entry) => {
        phases.push(entry.phase)
        throw new Error('presentation failure')
      },
    })
    assert.equal(
      runtime.identity.releaseId,
      fixture.admission.identity.releaseId,
    )
    assert.deepEqual(fakeScheduler.sleeps, [1_000])
    assert.equal(phases.at(-1), 'ready')
  } finally {
    await harness.cleanup()
  }
})

test('spawn verification observes cancellation that arrives after fresh inspection', async () => {
  const fixture = await createRuntimeResolverReleaseFixture()
  const spawnController = new AbortController()
  let spawnInspection = false
  const harness = await createFastHarness(
    fixture.admissionInput,
    {
      initialGeneration: 'verified',
      operations: {
        inspectGeneration: async () => {
          if (spawnInspection) spawnController.abort()
          return {
            kind: 'verified',
            generation: harness.generation,
          }
        },
      },
    },
  )
  try {
    const runtime = await harness.bundle.resolver.resolve({
      appDataRoot: harness.appDataRoot,
      signal: new AbortController().signal,
      report: () => undefined,
    })
    spawnInspection = true

    await assert.rejects(
      harness.bundle.spawnBoundary.verifyForSpawn({
        runtime,
        signal: spawnController.signal,
      }),
      hasFailureCode('runtime_cancelled'),
    )
  } finally {
    await harness.cleanup()
  }
})

type FastHarness = Awaited<
  ReturnType<typeof createFastHarness>
>

async function createFastHarness(
  admissionInput: RuntimeReleaseAdmissionInput,
  options: {
    readonly initialGeneration?:
      | 'absent'
      | 'owned-invalid'
      | 'verified'
    readonly lease?: RecordingLease
    readonly operations?: RuntimeResolverOperationOverrides
    readonly retainedArchive?:
      | 'absent'
      | 'owned-invalid'
      | 'verified'
    readonly scheduler?: RuntimeResolutionScheduler
  } = {},
) {
  const fixture = await createRuntimeResolverReleaseFixture()
  const appData = await createOwnerOnlyTempAppDataRoot()
  const cache = await bootstrapRuntimeCache({
    admission: fixture.admission,
    appDataRoot: appData.appDataRoot,
    signal: new AbortController().signal,
  })
  const lease = options.lease ?? new RecordingLease()
  const identities = {
    generation: {
      device: '101',
      inode: '201',
      ownerUid: process.getuid!(),
    },
    runtime: {
      device: '101',
      inode: '202',
      ownerUid: process.getuid!(),
    },
    staging: {
      device: '101',
      inode: '203',
      ownerUid: process.getuid!(),
    },
    archive: {
      device: '101',
      inode: '204',
      ownerUid: process.getuid!(),
    },
  }
  const generation: PublishedRuntimeGenerationSnapshot = {
    kind: 'published_runtime_generation_snapshot',
    cancelledAfterCommit: false,
    generationIdentity: identities.generation,
    receipt: createRuntimeGenerationVerificationReceipt(
      cache.layout,
      identities.generation,
    ),
    runtime: {
      runtimeRoot: cache.layout.generation.runtimeRoot,
      identity: {
        releaseId: fixture.admission.identity.releaseId,
        target: fixture.admission.identity.target,
        runtimeContractVersion:
          fixture.admission.identity.runtimeContractVersion,
        nativeCodexVersion:
          fixture.admission.manifest.identity
            .native_codex_version,
        pythonVersion:
          fixture.admission.manifest.identity.python_version,
        sourceCommit:
          fixture.admission.manifest.identity.source_commit,
        patchStackSha256:
          fixture.admission.manifest.identity
            .patch_stack_sha256,
      },
    },
    runtimeIdentity: identities.runtime,
    tree: {
      fileCount: fixture.admission.manifest.payload.file_count,
      regularFileBytes:
        fixture.admission.manifest.payload.regular_file_bytes,
      symlinkCount:
        fixture.admission.manifest.payload.symlink_count,
    },
  }
  const archive = {
    kind: 'runtime_archive_verification_snapshot' as const,
    release: fixture.admission.identity,
    archivePath: cache.layout.archive.path,
    archiveIdentity: identities.archive,
    bytes: fixture.admission.descriptor.archive.bytes,
    sha256: fixture.admission.identity.archiveSha256,
  }
  let generationInspections = 0
  const initialGeneration =
    options.initialGeneration ?? 'absent'
  const retainedArchive =
    options.retainedArchive ?? 'verified'
  const operations: RuntimeResolverOperationOverrides = {
    bootstrap: async () => cache,
    createStaging: async (input) =>
      createRuntimeStagingIdentity(
        input.layout,
        input.transactionNonce,
      ),
    download: async () => archive,
    extract: async (input) => ({
      kind: 'runtime_staging_verification_snapshot',
      release: fixture.admission.identity,
      stagingRoot: input.staging.path,
      runtimeRoot: `${input.staging.path}/runtime`,
      stagingIdentity: identities.staging,
      runtimeIdentity: identities.runtime,
      tree: generation.tree,
    }),
    inspectGeneration: async (): Promise<RuntimeGenerationInspection> => {
      generationInspections += 1
      if (generationInspections > 1) {
        return { kind: 'verified', generation }
      }
      if (initialGeneration === 'verified') {
        return { kind: 'verified', generation }
      }
      if (initialGeneration === 'owned-invalid') {
        return {
          kind: 'owned-invalid',
          authority: {
            kind: 'runtime_generation_quarantine_authority',
            generationIdentity: generation.generationIdentity,
            receipt: generation.receipt,
            roster: 'complete',
          },
        }
      }
      return { kind: 'absent' }
    },
    inspectRetainedArchive: async () => {
      if (retainedArchive === 'verified') {
        return { kind: 'verified', archive }
      }
      if (retainedArchive === 'owned-invalid') {
        return {
          kind: 'owned-invalid',
          authority: {
            kind:
              'retained_archive_quarantine_authority' as const,
            form: 'single' as const,
            archiveIdentity: archive.archiveIdentity,
            archiveSize: String(archive.bytes),
          },
        }
      }
      return { kind: 'absent' }
    },
    publish: async () => generation,
    quarantineGeneration: async () => ({
      kind: 'runtime_generation_quarantined',
      cancelledAfterCommit: false,
    }),
    quarantineRetainedArchive: async () => ({
      kind: 'retained_archive_quarantined',
      cancelledAfterCommit: false,
      transactionNonce: '1'.repeat(32),
    }),
    ...options.operations,
  }
  let nonce = 0
  const bundle = createRuntimeResolverBundleForTesting(
    {
      ...admissionInput,
      owner: resolverOwner(),
    },
    {
      lease,
      nonce: () => {
        nonce += 1
        return nonce.toString(16).padStart(32, '0')
      },
      operations,
      processId: process.pid,
      scheduler:
        options.scheduler ??
        createRuntimeResolutionScheduler(),
      timeoutMs: 10_000,
      transport: new ScriptedArchiveTransport(),
    },
  )
  return {
    appDataRoot: appData.appDataRoot,
    archive,
    bundle,
    cache,
    cleanup: appData.cleanup,
    fixture,
    generation,
    lease,
    operations,
  }
}

function createBundleWith(
  admissionInput: RuntimeReleaseAdmissionInput,
  owner: RuntimeResolverBundleInput['owner'],
  lease: RuntimeResolverLeasePort,
  operations: RuntimeResolverOperationOverrides,
  nonceDigit: string,
) {
  return createRuntimeResolverBundleForTesting(
    { ...admissionInput, owner },
    {
      lease,
      nonce: () => nonceDigit.repeat(32),
      operations,
      processId: process.pid,
      scheduler: createRuntimeResolutionScheduler(),
      timeoutMs: 10_000,
      transport: new ScriptedArchiveTransport(),
    },
  )
}

function withChangedStagingNamespace(input: {
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
}) {
  const current =
    input.mutationAuthority.snapshot.namespaceIdentities.staging
  assert.notEqual(current, undefined)
  return {
    layout: input.layout,
    mutationAuthority: {
      kind: 'runtime_cache_mutation_authority' as const,
      snapshot: {
        ...input.mutationAuthority.snapshot,
        namespaceIdentities: {
          ...input.mutationAuthority.snapshot.namespaceIdentities,
          staging: {
            ...current!,
            inode: `${current!.inode}-replacement`,
          },
        },
      },
    },
  }
}

function testDependencies(
  lease: RecordingLease,
  transport: ScriptedArchiveTransport,
  operations: RuntimeResolverOperationOverrides,
) {
  return {
    lease,
    nonce: () => '1'.repeat(32),
    operations,
    processId: process.pid,
    scheduler: createRuntimeResolutionScheduler(),
    timeoutMs: 10_000,
    transport,
  }
}

function resolverOwner(): RuntimeResolverBundleInput['owner'] {
  return {
    applicationInstanceNonce: 'a'.repeat(32),
    processStartIdentity: 'resolver-fault-test-process',
  }
}

function hasFailureCode(code: string) {
  return (error: unknown) =>
    error instanceof RuntimeReleaseAuthorityError &&
    error.failure.code === code
}

function deferred<T>(): {
  readonly promise: Promise<T>
  resolve(value?: T): void
} {
  let resolvePromise: (value: T | PromiseLike<T>) => void =
    () => undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve: (value?: T) => resolvePromise(value as T),
  }
}

function abortObserved(signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    signal.addEventListener('abort', () => resolve(), {
      once: true,
    })
  })
}

function createFakeScheduler(): {
  readonly scheduler: RuntimeResolutionScheduler
  readonly sleeps: number[]
} {
  const sleeps: number[] = []
  return {
    sleeps,
    scheduler: {
      monotonicNowMs: () => 0,
      wallNowMs: () =>
        Date.parse('2026-07-24T00:00:00Z'),
      sleep: async (delayMs, signal) => {
        if (signal.aborted) {
          throw runtimeAuthorityError('runtime_cancelled', {
            kind: 'fake_sleep_cancelled',
          })
        }
        sleeps.push(delayMs)
      },
      arm: () => () => undefined,
    },
  }
}

async function waitFor(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 5_000) {
      throw new Error(`Timed out waiting for ${label}.`)
    }
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}
