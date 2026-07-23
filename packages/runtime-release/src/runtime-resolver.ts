/// <reference types="node" />

import { randomBytes } from 'node:crypto'

import type {
  RuntimeResolveProgress,
  RuntimeResolver,
  VerifiedRuntime,
} from './contract.js'
import {
  downloadVerifiedRuntimeArchive,
} from './runtime-archive-download.js'
import {
  extractVerifiedRuntimeArchive,
} from './runtime-archive-extraction.js'
import type {
  RuntimeArchiveExtractionTestOptions,
} from './runtime-archive-extraction.js'
import {
  createNodeArchiveTransport,
} from './runtime-archive-transport.js'
import type {
  ArchiveTransport,
} from './runtime-archive-transport.js'
import {
  bootstrapRuntimeCache,
  createOwnedRuntimeStagingRoot,
} from './runtime-cache-bootstrap.js'
import type {
  RuntimeCacheBootstrapTestOptions,
  RuntimeStagingRootTestOptions,
} from './runtime-cache-bootstrap.js'
import {
  FileRuntimeCacheLeaseCoordinator,
} from './runtime-cache-lease.js'
import type {
  RuntimeCacheLeaseCoordinator,
  RuntimeCacheLeaseHandle,
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
  RuntimeCacheRootInspection,
  RuntimeFileSystemIdentity,
  RuntimeGenerationVerificationReceipt,
} from './runtime-cache-authority.js'
import {
  inspectPublishedRuntimeGeneration,
  publishVerifiedRuntimeGeneration,
  quarantineOwnedRuntimeGeneration,
} from './runtime-generation.js'
import type {
  PublishedRuntimeGenerationSnapshot,
  RuntimeGenerationPublishTestOptions,
  RuntimeGenerationQuarantineTestOptions,
} from './runtime-generation.js'
import {
  admitRuntimeRelease,
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmission,
  RuntimeReleaseAdmissionInput,
} from './runtime-release-authority.js'
import {
  RuntimeResolutionDeadline,
  RuntimeResolutionProgressEmitter,
  createRuntimeResolutionScheduler,
} from './runtime-resolution-control.js'
import type {
  RuntimeResolutionScheduler,
} from './runtime-resolution-control.js'
import {
  inspectRetainedRuntimeArchive,
  quarantineRetainedRuntimeArchive,
} from './runtime-retained-archive.js'
import type {
  RetainedArchiveInspectionTestOptions,
  RetainedArchiveQuarantineTestOptions,
} from './runtime-retained-archive.js'

const DEFAULT_RESOLUTION_TIMEOUT_MS = 15 * 60 * 1000

type AcquiredRuntimeCacheLease = Extract<
  RuntimeCacheLeaseHandle,
  { readonly kind: 'acquired' }
>

export type RuntimeResolverBundleInput =
  RuntimeReleaseAdmissionInput & {
    readonly owner: {
      readonly applicationInstanceNonce: string
      readonly processStartIdentity: string
    }
  }

export type RuntimeSpawnBoundary = {
  verifyForSpawn(input: {
    readonly runtime: VerifiedRuntime
    readonly signal: AbortSignal
  }): Promise<VerifiedRuntime>
}

/**
 * The frozen public lease seam deliberately exposes acquisition only. The
 * resolver owns settlement through this package-private extension.
 */
export type RuntimeResolverLeasePort =
  RuntimeCacheLeaseCoordinator & {
    complete(
      handle: AcquiredRuntimeCacheLease,
      receipt: RuntimeGenerationVerificationReceipt,
    ): Promise<void>
    fail(
      handle: AcquiredRuntimeCacheLease,
      failure: unknown,
    ): Promise<void>
  }

export type RuntimeResolverFaultHooks = {
  readonly afterJoinedCompletion?: () => void | Promise<void>
  readonly afterLeaseComplete?: () => void | Promise<void>
  readonly beforeFinalInspection?: () => void | Promise<void>
}

export type RuntimeResolverOperationOverrides = {
  readonly bootstrap?: typeof bootstrapRuntimeCache
  readonly createStaging?: typeof createOwnedRuntimeStagingRoot
  readonly download?: typeof downloadVerifiedRuntimeArchive
  readonly extract?: typeof extractVerifiedRuntimeArchive
  readonly inspectGeneration?: typeof inspectPublishedRuntimeGeneration
  readonly inspectRetainedArchive?: typeof inspectRetainedRuntimeArchive
  readonly publish?: typeof publishVerifiedRuntimeGeneration
  readonly quarantineGeneration?: typeof quarantineOwnedRuntimeGeneration
  readonly quarantineRetainedArchive?:
    typeof quarantineRetainedRuntimeArchive
}

export type RuntimeResolverTestingDependencies = {
  readonly bootstrapTestOptions?: RuntimeCacheBootstrapTestOptions
  readonly extractionTestOptions?: RuntimeArchiveExtractionTestOptions
  readonly faultHooks?: RuntimeResolverFaultHooks
  readonly generationPublishTestOptions?:
    RuntimeGenerationPublishTestOptions
  readonly generationQuarantineTestOptions?:
    RuntimeGenerationQuarantineTestOptions
  readonly lease: RuntimeResolverLeasePort
  readonly nonce: () => string
  readonly operations?: RuntimeResolverOperationOverrides
  readonly processId: number
  readonly retainedArchiveInspectionTestOptions?:
    RetainedArchiveInspectionTestOptions
  readonly retainedArchiveQuarantineTestOptions?:
    RetainedArchiveQuarantineTestOptions
  readonly scheduler: RuntimeResolutionScheduler
  readonly stagingTestOptions?: RuntimeStagingRootTestOptions
  readonly timeoutMs: number
  readonly transport: ArchiveTransport
}

type FrozenRuntimeAuthority = {
  readonly generationIdentity: RuntimeFileSystemIdentity
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly runtimeIdentity: RuntimeFileSystemIdentity
}

type ResolverContext = {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Uint8Array
  readonly dependencies: RuntimeResolverTestingDependencies
  readonly owner: RuntimeResolverBundleInput['owner']
  readonly operations: Required<RuntimeResolverOperationOverrides>
  readonly flights: Map<string, ResolverFlight>
  readonly spawnAuthorities: WeakMap<
    VerifiedRuntime,
    FrozenRuntimeAuthority
  >
}

type ResolutionCall = {
  readonly deadline: RuntimeResolutionDeadline
  readonly progress: RuntimeResolutionProgressEmitter
}

type ResolverTransactionCall = {
  readonly deadline: RuntimeResolutionDeadline
  readonly progress: ResolverProgressSink
}

type ResolverProgressSink = {
  phase(progress: RuntimeResolveProgress['phase']): void
  download(receivedBytes: number, totalBytes: number): void
}

type ResolverBootstrap = {
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
}

type ResolverOwnerTransaction = ResolverBootstrap & {
  readonly handle: AcquiredRuntimeCacheLease
  readonly transactionNonce: string
}

type ResolverFlight = {
  readonly bootstrap: ResolverBootstrap
  readonly controller: AbortController
  readonly deadline: RuntimeResolutionDeadline
  readonly key: string
  readonly subscribers: Set<RuntimeResolutionProgressEmitter>
  currentProgress?: RuntimeResolveProgress
  done: Promise<void>
  progress: ResolverProgressSink
  promise: Promise<PublishedRuntimeGenerationSnapshot>
  state: 'running' | 'draining' | 'settled'
}

export function createRuntimeResolverBundle(
  input: RuntimeResolverBundleInput,
): {
  readonly resolver: RuntimeResolver
  readonly spawnBoundary: RuntimeSpawnBoundary
} {
  return createRuntimeResolverBundleForTesting(input, {
    lease: new FileRuntimeCacheLeaseCoordinator(),
    nonce: createTransactionNonce,
    processId: process.pid,
    scheduler: createRuntimeResolutionScheduler(),
    timeoutMs: DEFAULT_RESOLUTION_TIMEOUT_MS,
    transport: createNodeArchiveTransport(),
  })
}

/**
 * Source-internal composition seam. Tests may replace package-owned effects,
 * but descriptor admission and immutable snapshots always happen first.
 */
export function createRuntimeResolverBundleForTesting(
  input: RuntimeResolverBundleInput,
  dependencies: RuntimeResolverTestingDependencies,
): {
  readonly resolver: RuntimeResolver
  readonly spawnBoundary: RuntimeSpawnBoundary
} {
  const applicationInput = input.application
  const ownerInput = input.owner
  const application = Object.freeze({ ...applicationInput })
  const canonicalManifestBytes = Uint8Array.from(
    input.canonicalManifestBytes,
  )
  const releaseInput: RuntimeReleaseAdmissionInput = {
    application,
    canonicalManifestBytes,
    canonicalManifestResource:
      input.canonicalManifestResource,
    descriptor: input.descriptor,
    runtimeContractVersion: input.runtimeContractVersion,
    target: input.target,
  }
  const admission = deepFreeze(
    admitRuntimeRelease(releaseInput),
  )
  const owner = Object.freeze({
    applicationInstanceNonce:
      ownerInput.applicationInstanceNonce,
    processStartIdentity: ownerInput.processStartIdentity,
  })
  const dependencyInput = { ...dependencies }
  const dependencySnapshot = Object.freeze({
    ...dependencyInput,
    operations:
      dependencyInput.operations === undefined
        ? undefined
        : Object.freeze({ ...dependencyInput.operations }),
  })
  assertResolverComposition(owner, dependencySnapshot)
  const operations: Required<RuntimeResolverOperationOverrides> = {
    bootstrap:
      dependencySnapshot.operations?.bootstrap ??
      bootstrapRuntimeCache,
    createStaging:
      dependencySnapshot.operations?.createStaging ??
      createOwnedRuntimeStagingRoot,
    download:
      dependencySnapshot.operations?.download ??
      downloadVerifiedRuntimeArchive,
    extract:
      dependencySnapshot.operations?.extract ??
      extractVerifiedRuntimeArchive,
    inspectGeneration:
      dependencySnapshot.operations?.inspectGeneration ??
      inspectPublishedRuntimeGeneration,
    inspectRetainedArchive:
      dependencySnapshot.operations?.inspectRetainedArchive ??
      inspectRetainedRuntimeArchive,
    publish:
      dependencySnapshot.operations?.publish ??
      publishVerifiedRuntimeGeneration,
    quarantineGeneration:
      dependencySnapshot.operations?.quarantineGeneration ??
      quarantineOwnedRuntimeGeneration,
    quarantineRetainedArchive:
      dependencySnapshot.operations?.quarantineRetainedArchive ??
      quarantineRetainedRuntimeArchive,
  }
  const context: ResolverContext = {
    admission,
    canonicalManifestBytes,
    dependencies: dependencySnapshot,
    owner,
    operations: Object.freeze(operations),
    flights: new Map(),
    spawnAuthorities: new WeakMap(),
  }

  return Object.freeze({
    resolver: Object.freeze({
      resolve: (
        resolveInput: Parameters<
          RuntimeResolver['resolve']
        >[0],
      ) =>
        resolveRuntime(context, resolveInput),
    }),
    spawnBoundary: Object.freeze({
      verifyForSpawn: (spawnInput: {
        readonly runtime: VerifiedRuntime
        readonly signal: AbortSignal
      }) =>
        verifyRuntimeForSpawn(context, spawnInput),
    }),
  })
}

async function resolveRuntime(
  context: ResolverContext,
  input: Parameters<RuntimeResolver['resolve']>[0],
): Promise<VerifiedRuntime> {
  const progress = new RuntimeResolutionProgressEmitter(
    input.report,
  )
  const deadline = new RuntimeResolutionDeadline({
    callerSignal: input.signal,
    scheduler: context.dependencies.scheduler,
    timeoutMs: context.dependencies.timeoutMs,
  })
  const call = { deadline, progress }

  try {
    deadline.throwIfStopped()
    progress.phase('checking_cache')
    const bootstrapped = await context.operations.bootstrap(
      {
        admission: context.admission,
        appDataRoot: input.appDataRoot,
        signal: deadline.signal,
      },
      context.dependencies.bootstrapTestOptions,
    )
    deadline.throwIfStopped()
    const generation = await joinOrCreateResolverFlight(
      context,
      call,
      bootstrapped,
    )
    deadline.throwIfStopped()
    progress.phase('verifying_runtime')
    const fresh = await requireFreshVerifiedGeneration(
      context,
      bootstrapped,
      deadline.signal,
      'runtime_resolver_caller_generation_unavailable',
    )
    assertSamePublishedGeneration(
      fresh,
      generation,
      'runtime_resolver_caller_generation_changed',
    )
    deadline.throwIfStopped()
    return registerReadyRuntime(
      context,
      call,
      bootstrapped,
      fresh,
    )
  } catch (error) {
    throw deadline.normalize(error)
  } finally {
    progress.stop()
    deadline.close()
  }
}

async function joinOrCreateResolverFlight(
  context: ResolverContext,
  call: ResolutionCall,
  bootstrapped: ResolverBootstrap,
): Promise<PublishedRuntimeGenerationSnapshot> {
  const key = resolverFlightKey(context, bootstrapped)

  while (true) {
    call.deadline.throwIfStopped()
    const existing = context.flights.get(key)
    if (existing !== undefined) {
      if (existing.state === 'running') {
        assertSameBootstrap(existing.bootstrap, bootstrapped)
        return await subscribeToFlight(existing, call)
      }
      await detachPromise(existing.done, call.deadline.signal)
      continue
    }

    const flight = createResolverFlight(
      key,
      bootstrapped,
    )
    flight.subscribers.add(call.progress)
    context.flights.set(key, flight)
    startResolverFlight(context, flight)
    return await awaitSubscribedFlight(flight, call)
  }
}

function createResolverFlight(
  key: string,
  bootstrapped: ResolverBootstrap,
): ResolverFlight {
  const controller = new AbortController()
  const deadline = new RuntimeResolutionDeadline({
    callerSignal: controller.signal,
    scheduler: context.dependencies.scheduler,
    timeoutMs: context.dependencies.timeoutMs,
  })
  const subscribers = new Set<RuntimeResolutionProgressEmitter>()
  const flight = {
    bootstrap: bootstrapped,
    controller,
    currentProgress: undefined,
    deadline,
    done: Promise.resolve(),
    key,
    progress: undefined as unknown as ResolverProgressSink,
    promise: undefined as unknown as Promise<
      PublishedRuntimeGenerationSnapshot
    >,
    state: 'running' as const,
    subscribers,
  }
  flight.progress = createFlightProgress(flight)
  return flight
}

function startResolverFlight(
  context: ResolverContext,
  flight: ResolverFlight,
): void {
  const transactionNonce = context.dependencies.nonce()
  let transaction: Promise<PublishedRuntimeGenerationSnapshot>
  try {
    assertTransactionNonce(transactionNonce)
    transaction = runResolverFlight(
      context,
      {
        deadline: flight.deadline,
        progress: flight.progress,
      },
      flight.bootstrap,
      transactionNonce,
    )
  } catch (error) {
    transaction = Promise.reject(error)
  }
  flight.promise = transaction
  flight.done = transaction.then(
    () => undefined,
    () => undefined,
  ).finally(() => {
    flight.state = 'settled'
    if (context.flights.get(flight.key) === flight) {
      context.flights.delete(flight.key)
    }
    flight.deadline.close()
  })
  void flight.done.catch(() => undefined)
}

function createFlightProgress(
  flight: ResolverFlight,
): ResolverProgressSink {
  const guarded = new RuntimeResolutionProgressEmitter(
    (progress) => {
      flight.currentProgress = progress
      for (const subscriber of flight.subscribers) {
        replayProgress(subscriber, progress)
      }
    },
  )
  return Object.freeze({
    phase: (phase: RuntimeResolveProgress['phase']) => {
      if (phase !== 'ready') guarded.phase(phase)
    },
    download: (receivedBytes: number, totalBytes: number) => {
      guarded.download(receivedBytes, totalBytes)
    },
  })
}

async function subscribeToFlight(
  flight: ResolverFlight,
  call: ResolutionCall,
): Promise<PublishedRuntimeGenerationSnapshot> {
  flight.subscribers.add(call.progress)
  if (flight.currentProgress !== undefined) {
    replayProgress(call.progress, flight.currentProgress)
  }
  return await awaitSubscribedFlight(flight, call)
}

async function awaitSubscribedFlight(
  flight: ResolverFlight,
  call: ResolutionCall,
): Promise<PublishedRuntimeGenerationSnapshot> {
  try {
    return await detachPromise(
      flight.promise,
      call.deadline.signal,
    )
  } finally {
    flight.subscribers.delete(call.progress)
    if (
      flight.subscribers.size === 0 &&
      flight.state === 'running'
    ) {
      flight.state = 'draining'
      flight.controller.abort()
    }
  }
}

function replayProgress(
  emitter: RuntimeResolutionProgressEmitter,
  progress: RuntimeResolveProgress,
): void {
  if (
    progress.phase === 'downloading' &&
    progress.receivedBytes !== undefined &&
    progress.totalBytes !== undefined
  ) {
    emitter.download(
      progress.receivedBytes,
      progress.totalBytes,
    )
    return
  }
  emitter.phase(progress.phase)
}

async function runResolverFlight(
  context: ResolverContext,
  call: ResolverTransactionCall,
  bootstrapped: ResolverBootstrap,
  transactionNonce: string,
): Promise<PublishedRuntimeGenerationSnapshot> {
  try {
    call.deadline.throwIfStopped()
    const handle =
      await context.dependencies.lease.acquireOrJoin({
        lease: bootstrapped.layout.lease,
        owner: {
          applicationInstanceNonce:
            context.owner.applicationInstanceNonce,
          processId: context.dependencies.processId,
          processStartIdentity:
            context.owner.processStartIdentity,
          transactionNonce,
        },
        signal: call.deadline.signal,
      })
    if (handle.kind === 'joined') {
      call.deadline.throwIfStopped()
      return await resolveJoinedTransaction(
        context,
        call,
        bootstrapped,
        handle,
      )
    }
    return await resolveOwnedRuntime(context, call, {
      ...bootstrapped,
      handle,
      transactionNonce,
    })
  } catch (error) {
    throw call.deadline.normalize(error)
  }
}

async function resolveJoinedTransaction(
  context: ResolverContext,
  call: ResolverTransactionCall,
  bootstrapped: ResolverBootstrap,
  handle: Extract<
    RuntimeCacheLeaseHandle,
    { readonly kind: 'joined' }
  >,
): Promise<PublishedRuntimeGenerationSnapshot> {
  await handle.completion
  await context.dependencies.faultHooks?.afterJoinedCompletion?.()
  call.deadline.throwIfStopped()
  call.progress.phase('verifying_runtime')
  const generation = await requireFreshVerifiedGeneration(
    context,
    bootstrapped,
    call.deadline.signal,
    'runtime_resolver_joined_generation_unavailable',
  )
  call.deadline.throwIfStopped()
  return generation
}

async function resolveOwnedRuntime(
  context: ResolverContext,
  call: ResolverTransactionCall,
  transaction: ResolverOwnerTransaction,
): Promise<PublishedRuntimeGenerationSnapshot> {
  let settlement: 'none' | 'complete' | 'fail' = 'none'

  try {
    const initialGeneration =
      await context.operations.inspectGeneration({
        admission: context.admission,
        canonicalManifestBytes:
          context.canonicalManifestBytes,
        layout: transaction.layout,
        mutationAuthority: transaction.mutationAuthority,
        signal: call.deadline.signal,
      })
    call.deadline.throwIfStopped()

    if (initialGeneration.kind === 'verified') {
      settlement = 'complete'
      await context.dependencies.lease.complete(
        transaction.handle,
        initialGeneration.generation.receipt,
      )
      await context.dependencies.faultHooks?.afterLeaseComplete?.()
      call.progress.phase('verifying_runtime')
      const fresh = await inspectAfterCompletion(
        context,
        transaction,
        initialGeneration.generation,
      )
      call.deadline.throwIfStopped()
      return fresh
    }

    if (initialGeneration.kind === 'owned-invalid') {
      const quarantined =
        await context.operations.quarantineGeneration(
          {
            admission: context.admission,
            authority: initialGeneration.authority,
            canonicalManifestBytes:
              context.canonicalManifestBytes,
            layout: transaction.layout,
            mutationAuthority: transaction.mutationAuthority,
            signal: call.deadline.signal,
            transactionNonce: transaction.transactionNonce,
          },
          context.dependencies
            .generationQuarantineTestOptions,
        )
      if (quarantined.cancelledAfterCommit) {
        throw cancelledAfterCommit(
          'runtime_generation_quarantine_cancelled',
        )
      }
      call.deadline.throwIfStopped()
    }

    const archive = await obtainVerifiedArchive(
      context,
      call,
      transaction,
    )
    assertArchiveBoundToLayout(archive, transaction.layout)
    call.deadline.throwIfStopped()
    call.progress.phase('installing')
    const staging = await context.operations.createStaging(
      {
        layout: transaction.layout,
        mutationAuthority: transaction.mutationAuthority,
        signal: call.deadline.signal,
        transactionNonce: transaction.transactionNonce,
      },
      context.dependencies.stagingTestOptions,
    )
    const extracted = await context.operations.extract(
      {
        admission: context.admission,
        canonicalManifestBytes:
          context.canonicalManifestBytes,
        layout: transaction.layout,
        mutationAuthority: transaction.mutationAuthority,
        signal: call.deadline.signal,
        staging,
      },
      context.dependencies.extractionTestOptions,
    )
    call.deadline.throwIfStopped()
    const published = await context.operations.publish(
      {
        admission: context.admission,
        canonicalManifestBytes:
          context.canonicalManifestBytes,
        layout: transaction.layout,
        mutationAuthority: transaction.mutationAuthority,
        signal: call.deadline.signal,
        staging: extracted,
      },
      context.dependencies.generationPublishTestOptions,
    )

    settlement = 'complete'
    await context.dependencies.lease.complete(
      transaction.handle,
      published.receipt,
    )
    await context.dependencies.faultHooks?.afterLeaseComplete?.()
    call.progress.phase('verifying_runtime')
    const fresh = await inspectAfterCompletion(
      context,
      transaction,
      published,
    )
    if (published.cancelledAfterCommit) {
      throw cancelledAfterCommit(
        'runtime_generation_publish_cancelled',
      )
    }
    call.deadline.throwIfStopped()
    return fresh
  } catch (error) {
    const failure = call.deadline.normalize(error)
    if (settlement === 'none') {
      settlement = 'fail'
      await context.dependencies.lease.fail(
        transaction.handle,
        failure,
      )
    }
    throw failure
  }
}

async function obtainVerifiedArchive(
  context: ResolverContext,
  call: ResolverTransactionCall,
  transaction: ResolverOwnerTransaction,
): Promise<
  Awaited<ReturnType<typeof downloadVerifiedRuntimeArchive>>
> {
  const retained =
    await context.operations.inspectRetainedArchive(
      {
        admission: context.admission,
        layout: transaction.layout,
        mutationAuthority: transaction.mutationAuthority,
        signal: call.deadline.signal,
      },
      context.dependencies
        .retainedArchiveInspectionTestOptions,
    )
  call.deadline.throwIfStopped()

  if (retained.kind === 'verified') {
    call.progress.phase('verifying_archive')
    return retained.archive
  }

  if (retained.kind === 'owned-invalid') {
    const quarantined =
      await context.operations.quarantineRetainedArchive(
        {
          admission: context.admission,
          authority: retained.authority,
          layout: transaction.layout,
          mutationAuthority: transaction.mutationAuthority,
          signal: call.deadline.signal,
          transactionNonce: transaction.transactionNonce,
        },
        context.dependencies
          .retainedArchiveQuarantineTestOptions,
      )
    if (quarantined.cancelledAfterCommit) {
      throw cancelledAfterCommit(
        'runtime_archive_quarantine_cancelled',
      )
    }
    call.deadline.throwIfStopped()
  }

  call.progress.phase('downloading')
  const archive = await context.operations.download({
    admission: context.admission,
    events: {
      beforeTransientRetry: ({ retryAfter }) =>
        call.deadline.waitForRetryAfter(retryAfter),
      onReceivedBytes: ({ receivedBytes, totalBytes }) => {
        call.progress.download(receivedBytes, totalBytes)
      },
    },
    layout: transaction.layout,
    mutationAuthority: transaction.mutationAuthority,
    signal: call.deadline.signal,
    transport: context.dependencies.transport,
  })
  call.deadline.throwIfStopped()
  call.progress.phase('verifying_archive')
  return archive
}

async function inspectAfterCompletion(
  context: ResolverContext,
  transaction: ResolverBootstrap,
  expected: PublishedRuntimeGenerationSnapshot,
): Promise<PublishedRuntimeGenerationSnapshot> {
  await context.dependencies.faultHooks?.beforeFinalInspection?.()
  const fresh = await requireFreshVerifiedGeneration(
    context,
    transaction,
    new AbortController().signal,
    'runtime_resolver_completed_generation_unavailable',
  )
  if (
    !sameFileSystemIdentity(
      fresh.generationIdentity,
      expected.generationIdentity,
    ) ||
    !sameFileSystemIdentity(
      fresh.runtimeIdentity,
      expected.runtimeIdentity,
    ) ||
    !sameVerifiedRuntime(fresh.runtime, expected.runtime)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_resolver_completed_generation_changed',
    })
  }
  return fresh
}

async function requireFreshVerifiedGeneration(
  context: ResolverContext,
  bootstrapped: ResolverBootstrap,
  signal: AbortSignal,
  evidenceKind: string,
): Promise<PublishedRuntimeGenerationSnapshot> {
  const inspection =
    await context.operations.inspectGeneration({
      admission: context.admission,
      canonicalManifestBytes:
        context.canonicalManifestBytes,
      layout: bootstrapped.layout,
      mutationAuthority: bootstrapped.mutationAuthority,
      signal,
    })
  if (inspection.kind !== 'verified') {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
    })
  }
  return inspection.generation
}

function registerReadyRuntime(
  context: ResolverContext,
  call: ResolutionCall,
  bootstrapped: ResolverBootstrap,
  generation: PublishedRuntimeGenerationSnapshot,
): VerifiedRuntime {
  call.deadline.throwIfStopped()
  const runtime = freezeVerifiedRuntime(generation.runtime)
  context.spawnAuthorities.set(
    runtime,
    deepFreeze({
      generationIdentity: {
        ...generation.generationIdentity,
      },
      layout: bootstrapped.layout,
      mutationAuthority: bootstrapped.mutationAuthority,
      runtimeIdentity: { ...generation.runtimeIdentity },
    }),
  )
  call.progress.phase('ready')
  return runtime
}

async function verifyRuntimeForSpawn(
  context: ResolverContext,
  input: {
    readonly runtime: VerifiedRuntime
    readonly signal: AbortSignal
  },
): Promise<VerifiedRuntime> {
  const authority = context.spawnAuthorities.get(input.runtime)
  if (authority === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_spawn_authority_missing',
    })
  }
  const generation = await requireFreshVerifiedGeneration(
    context,
    {
      layout: authority.layout,
      mutationAuthority: authority.mutationAuthority,
    },
    input.signal,
    'runtime_spawn_generation_unavailable',
  )
  if (
    !sameFileSystemIdentity(
      generation.generationIdentity,
      authority.generationIdentity,
    ) ||
    !sameFileSystemIdentity(
      generation.runtimeIdentity,
      authority.runtimeIdentity,
    ) ||
    !sameVerifiedRuntime(generation.runtime, input.runtime)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_spawn_generation_changed',
    })
  }
  assertSignalNotCancelled(
    input.signal,
    'runtime_spawn_verification_cancelled',
  )
  return input.runtime
}

function assertResolverComposition(
  owner: RuntimeResolverBundleInput['owner'],
  dependencies: RuntimeResolverTestingDependencies,
): void {
  if (
    !/^[0-9a-f]{32}$/u.test(
      owner.applicationInstanceNonce,
    ) ||
    typeof owner.processStartIdentity !== 'string' ||
    owner.processStartIdentity.length === 0 ||
    owner.processStartIdentity.length > 256 ||
    !/^[\u0021-\u007e]+$/u.test(
      owner.processStartIdentity,
    ) ||
    !Number.isSafeInteger(dependencies.processId) ||
    dependencies.processId <= 0 ||
    !Number.isSafeInteger(dependencies.timeoutMs) ||
    dependencies.timeoutMs <= 0
  ) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'runtime_resolver_composition_invalid',
    })
  }
}

function assertTransactionNonce(value: string): void {
  if (!/^[0-9a-f]{32}$/u.test(value)) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_resolver_transaction_nonce_invalid',
    })
  }
}

function assertArchiveBoundToLayout(
  archive: Awaited<
    ReturnType<typeof downloadVerifiedRuntimeArchive>
  >,
  layout: RuntimeCacheLayout,
): void {
  if (
    archive.archivePath !== layout.archive.path ||
    archive.sha256 !== layout.identity.archiveSha256
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_resolver_archive_snapshot_invalid',
    })
  }
}

function resolverFlightKey(
  context: ResolverContext,
  bootstrapped: ResolverBootstrap,
): string {
  const appDataIdentity =
    bootstrapped.mutationAuthority.snapshot
      .appDataRootIdentity
  const release = context.admission.identity
  return [
    appDataIdentity.device,
    appDataIdentity.inode,
    appDataIdentity.ownerUid,
    release.archiveSha256,
    release.manifestSha256,
    release.releaseId,
    release.target,
    release.runtimeContractVersion,
  ].join(':')
}

function assertSameBootstrap(
  left: ResolverBootstrap,
  right: ResolverBootstrap,
): void {
  if (
    left.layout.appDataRoot !== right.layout.appDataRoot ||
    left.layout.cacheRoot !== right.layout.cacheRoot ||
    left.layout.generation.root !==
      right.layout.generation.root ||
    !sameFileSystemIdentity(
      left.mutationAuthority.snapshot.appDataRootIdentity,
      right.mutationAuthority.snapshot.appDataRootIdentity,
    ) ||
    !sameCacheInspection(
      left.mutationAuthority.snapshot,
      right.mutationAuthority.snapshot,
    ) ||
    !sameReleaseIdentity(
      left.layout.identity,
      right.layout.identity,
    )
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_resolver_flight_authority_changed',
    })
  }
}

function sameCacheInspection(
  left: RuntimeCacheRootInspection,
  right: RuntimeCacheRootInspection,
): boolean {
  const namespaceNames = [
    'archives',
    'generations',
    'leases',
    'partials',
    'quarantine',
    'staging',
  ] as const
  return (
    left.state === right.state &&
    left.appDataRoot === right.appDataRoot &&
    left.cacheRoot === right.cacheRoot &&
    left.expectedOwnerUid === right.expectedOwnerUid &&
    sameFileSystemIdentity(
      left.appDataRootIdentity,
      right.appDataRootIdentity,
    ) &&
    sameOptionalFileSystemIdentity(
      left.runtimeCacheParentIdentity,
      right.runtimeCacheParentIdentity,
    ) &&
    sameOptionalFileSystemIdentity(
      left.cacheRootIdentity,
      right.cacheRootIdentity,
    ) &&
    namespaceNames.every((name) =>
      sameOptionalFileSystemIdentity(
        left.namespaceIdentities[name],
        right.namespaceIdentities[name],
      ),
    )
  )
}

function sameOptionalFileSystemIdentity(
  left: RuntimeFileSystemIdentity | undefined,
  right: RuntimeFileSystemIdentity | undefined,
): boolean {
  return (
    (left === undefined && right === undefined) ||
    (left !== undefined &&
      right !== undefined &&
      sameFileSystemIdentity(left, right))
  )
}

function assertSamePublishedGeneration(
  actual: PublishedRuntimeGenerationSnapshot,
  expected: PublishedRuntimeGenerationSnapshot,
  kind: string,
): void {
  if (
    !sameFileSystemIdentity(
      actual.generationIdentity,
      expected.generationIdentity,
    ) ||
    !sameFileSystemIdentity(
      actual.runtimeIdentity,
      expected.runtimeIdentity,
    ) ||
    !sameVerifiedRuntime(actual.runtime, expected.runtime) ||
    actual.tree.fileCount !== expected.tree.fileCount ||
    actual.tree.regularFileBytes !==
      expected.tree.regularFileBytes ||
    actual.tree.symlinkCount !== expected.tree.symlinkCount
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind,
    })
  }
}

function sameReleaseIdentity(
  left: RuntimeCacheLayout['identity'],
  right: RuntimeCacheLayout['identity'],
): boolean {
  return (
    left.archiveSha256 === right.archiveSha256 &&
    left.manifestSha256 === right.manifestSha256 &&
    left.releaseId === right.releaseId &&
    left.runtimeContractVersion ===
      right.runtimeContractVersion &&
    left.target === right.target
  )
}

function detachPromise<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(
      runtimeAuthorityError('runtime_cancelled', {
        kind: 'runtime_resolver_caller_detached',
      }),
    )
  }
  return new Promise<T>((resolve, reject) => {
    let settled = false
    const finish = (effect: () => void) => {
      if (settled) return
      settled = true
      signal.removeEventListener('abort', onAbort)
      effect()
    }
    const onAbort = () => {
      finish(() => {
        reject(
          runtimeAuthorityError('runtime_cancelled', {
            kind: 'runtime_resolver_caller_detached',
          }),
        )
      })
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void promise.then(
      (value) => finish(() => resolve(value)),
      (error: unknown) => finish(() => reject(error)),
    )
  })
}

function cancelledAfterCommit(
  kind: string,
): RuntimeReleaseAuthorityError {
  return runtimeAuthorityError('runtime_cancelled', { kind })
}

function assertSignalNotCancelled(
  signal: AbortSignal,
  kind: string,
): void {
  if (signal.aborted) {
    throw runtimeAuthorityError('runtime_cancelled', { kind })
  }
}

function freezeVerifiedRuntime(
  runtime: VerifiedRuntime,
): VerifiedRuntime {
  return Object.freeze({
    runtimeRoot: runtime.runtimeRoot,
    identity: Object.freeze({ ...runtime.identity }),
  })
}

function sameFileSystemIdentity(
  left: RuntimeFileSystemIdentity,
  right: RuntimeFileSystemIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.ownerUid === right.ownerUid
  )
}

function sameVerifiedRuntime(
  left: VerifiedRuntime,
  right: VerifiedRuntime,
): boolean {
  return (
    left.runtimeRoot === right.runtimeRoot &&
    left.identity.releaseId === right.identity.releaseId &&
    left.identity.target === right.identity.target &&
    left.identity.runtimeContractVersion ===
      right.identity.runtimeContractVersion &&
    left.identity.nativeCodexVersion ===
      right.identity.nativeCodexVersion &&
    left.identity.pythonVersion ===
      right.identity.pythonVersion &&
    left.identity.sourceCommit === right.identity.sourceCommit &&
    left.identity.patchStackSha256 ===
      right.identity.patchStackSha256
  )
}

function deepFreeze<T>(value: T): T {
  if (
    typeof value !== 'object' ||
    value === null ||
    ArrayBuffer.isView(value) ||
    Object.isFrozen(value)
  ) {
    return value
  }
  for (const child of Object.values(
    value as Record<string, unknown>,
  )) {
    deepFreeze(child)
  }
  return Object.freeze(value)
}

function createTransactionNonce(): string {
  return randomBytes(16).toString('hex')
}
