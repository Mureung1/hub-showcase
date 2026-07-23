/// <reference types="node" />

import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  lstat,
  open,
  readdir,
  realpath,
  rename,
} from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

import type { VerifiedRuntime } from './contract.js'
import {
  verifyMaterializedRuntimeTree,
} from './runtime-archive-extraction.js'
import type {
  RuntimeMaterializedTreeVerificationInput,
  RuntimeMaterializedTreeVerificationSnapshot,
  RuntimeStagingVerificationSnapshot,
} from './runtime-archive-extraction.js'
import {
  createRuntimeGenerationVerificationReceipt,
  createRuntimeQuarantineIdentity,
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import type {
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
  RuntimeFileSystemIdentity,
  RuntimeGenerationVerificationReceipt,
} from './runtime-cache-authority.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmission,
} from './runtime-release-authority.js'

const GENERATION_ROOT_ROSTER = ['receipt.json', 'runtime'] as const
const MAX_RECEIPT_BYTES = 4096

export type RuntimeGenerationTreeVerificationSnapshot =
  RuntimeMaterializedTreeVerificationSnapshot

export type PublishedRuntimeGenerationSnapshot = {
  readonly kind: 'published_runtime_generation_snapshot'
  readonly generationIdentity: RuntimeFileSystemIdentity
  readonly receipt: RuntimeGenerationVerificationReceipt
  readonly runtime: VerifiedRuntime
  readonly runtimeIdentity: RuntimeFileSystemIdentity
  readonly tree: RuntimeMaterializedTreeVerificationSnapshot['tree']
  /**
   * Once rename starts, publish finishes durable readback even when the
   * caller aborts. The resolver must settle the lease and then surface
   * runtime_cancelled without reporting ready.
   */
  readonly cancelledAfterCommit: boolean
}

export type RuntimeGenerationQuarantineAuthority = {
  readonly kind: 'runtime_generation_quarantine_authority'
  readonly generationIdentity: RuntimeFileSystemIdentity
  readonly receipt: RuntimeGenerationVerificationReceipt
  readonly roster: 'complete' | 'missing-runtime'
}

export type RuntimeGenerationInspection =
  | {
      readonly kind: 'absent'
    }
  | {
      readonly kind: 'verified'
      readonly generation: PublishedRuntimeGenerationSnapshot
    }
  | {
      readonly kind: 'owned-invalid'
      readonly authority: RuntimeGenerationQuarantineAuthority
    }

export type RuntimeGenerationQuarantineResult = {
  readonly kind: 'runtime_generation_quarantined'
  readonly cancelledAfterCommit: boolean
}

export type RuntimeGenerationQuarantineTestOptions = {
  readonly beforeRename?: () => Promise<void>
  readonly afterRename?: () => Promise<void>
  readonly afterSync?: () => Promise<void>
}

export type RuntimeGenerationPublishInput = {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Uint8Array
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal: AbortSignal
  readonly staging: RuntimeStagingVerificationSnapshot
}

/**
 * Package-private race/fault seam. Production callers must omit it.
 */
export type RuntimeGenerationPublishTestOptions = {
  readonly afterReceiptSync?: () => Promise<void>
  readonly beforeFinalAbsenceCheck?: () => Promise<void>
  readonly afterRename?: () => Promise<void>
  readonly beforeGenerationParentSync?: () => Promise<void>
  readonly beforeReadback?: () => Promise<void>
}

export async function verifyRuntimeGenerationTree(
  input: RuntimeMaterializedTreeVerificationInput,
): Promise<RuntimeGenerationTreeVerificationSnapshot> {
  return verifyMaterializedRuntimeTree(input)
}

/**
 * Publishes a fully verified staging tree under the cooperative cache lease.
 * The receipt is durable inside staging before the directory rename. The
 * returned value is based on an independent post-rename complete-tree
 * readback, never on the staging snapshot or receipt alone.
 */
export async function publishVerifiedRuntimeGeneration(
  input: RuntimeGenerationPublishInput,
  testOptions: RuntimeGenerationPublishTestOptions = {},
): Promise<PublishedRuntimeGenerationSnapshot> {
  assertPublishBindings(input)
  assertNotCancelled(input.signal)
  const cache = await revalidateGenerationAuthority(input)
  const stagingIdentity = await inspectOwnedDirectory({
    expectedDevice: cache.generationNamespace.device,
    expectedIdentity: input.staging.stagingIdentity,
    expectedMode: 0o700,
    expectedOwnerUid: cache.expectedOwnerUid,
    path: input.staging.stagingRoot,
    evidenceKind: 'runtime_generation_staging_invalid',
  })
  await assertCanonicalDirectory(
    input.staging.stagingRoot,
    'runtime_generation_staging_noncanonical',
  )
  await assertExactRoster(
    input.staging.stagingRoot,
    ['runtime'],
    'runtime_generation_staging_roster_invalid',
  )
  const stagingTree = await verifyRuntimeGenerationTree({
    admission: input.admission,
    canonicalManifestBytes: input.canonicalManifestBytes,
    expectedDevice: stagingIdentity.device,
    expectedOwnerUid: cache.expectedOwnerUid,
    runtimeRoot: input.staging.runtimeRoot,
    signal: input.signal,
  })
  if (
    !sameIdentity(
      stagingTree.runtimeIdentity,
      input.staging.runtimeIdentity,
    ) ||
    !sameTree(stagingTree.tree, input.staging.tree)
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_generation_staging_snapshot_drift',
    })
  }
  await syncVerifiedRuntimeDirectories({
    admission: input.admission,
    expectedDevice: stagingIdentity.device,
    expectedOwnerUid: cache.expectedOwnerUid,
    runtimeIdentity: stagingTree.runtimeIdentity,
    runtimeRoot: input.staging.runtimeRoot,
  })
  await assertPathAbsent(
    input.layout.generation.root,
    'runtime_generation_final_already_exists',
  )

  const receipt = createRuntimeGenerationVerificationReceipt(
    input.layout,
    stagingIdentity,
  )
  await writeAndVerifyReceipt({
    expectedDevice: stagingIdentity.device,
    expectedOwnerUid: cache.expectedOwnerUid,
    receipt,
    receiptPath: path.join(
      input.staging.stagingRoot,
      'receipt.json',
    ),
  })
  await syncOwnedDirectory({
    expectedIdentity: stagingIdentity,
    expectedMode: 0o700,
    path: input.staging.stagingRoot,
  })
  await testOptions.afterReceiptSync?.()
  assertNotCancelled(input.signal)
  await assertExactRoster(
    input.staging.stagingRoot,
    GENERATION_ROOT_ROSTER,
    'runtime_generation_staging_roster_changed',
  )

  await testOptions.beforeFinalAbsenceCheck?.()
  await assertPathAbsent(
    input.layout.generation.root,
    'runtime_generation_competing_final',
  )
  assertNotCancelled(input.signal)

  let commitStarted = false
  try {
    commitStarted = true
    await rename(
      input.staging.stagingRoot,
      input.layout.generation.root,
    )
    await testOptions.afterRename?.()
    await testOptions.beforeGenerationParentSync?.()
    await syncOwnedDirectory({
      expectedIdentity: cache.generationParent,
      expectedMode: 0o700,
      path: path.dirname(input.layout.generation.root),
    })
    await testOptions.beforeReadback?.()
    const published = await verifyPublishedRuntimeGeneration({
      admission: input.admission,
      canonicalManifestBytes: input.canonicalManifestBytes,
      layout: input.layout,
      mutationAuthority: input.mutationAuthority,
      signal: new AbortController().signal,
    })
    if (published === undefined) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_generation_missing_after_publish',
      })
    }
    return {
      ...published,
      cancelledAfterCommit: input.signal.aborted,
    }
  } catch (error) {
    if (!commitStarted && error instanceof RuntimeReleaseAuthorityError) {
      throw error
    }
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_publish_commit_failed',
      cause: error,
    })
  }
}

/**
 * Returns undefined only when the final generation root is absent. Any
 * present generation must satisfy strict receipt and complete-tree readback.
 */
export async function verifyPublishedRuntimeGeneration(input: {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Uint8Array
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal: AbortSignal
}): Promise<PublishedRuntimeGenerationSnapshot | undefined> {
  const inspection = await inspectPublishedRuntimeGeneration(input)
  if (inspection.kind === 'absent') return undefined
  if (inspection.kind === 'verified') return inspection.generation
  throw runtimeAuthorityError('runtime_integrity_failed', {
    kind: 'runtime_generation_owned_invalid',
  })
}

export async function inspectPublishedRuntimeGeneration(input: {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Uint8Array
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal: AbortSignal
}): Promise<RuntimeGenerationInspection> {
  assertCommonBindings(input)
  assertNotCancelled(input.signal)
  const cache = await revalidateGenerationAuthority(input)
  const generationStats = await lstatIfPresent(
    input.layout.generation.root,
  )
  if (generationStats === undefined) return { kind: 'absent' }
  const generationIdentity = assertOwnedDirectoryStats({
    expectedDevice: cache.generationNamespace.device,
    expectedMode: 0o700,
    expectedOwnerUid: cache.expectedOwnerUid,
    path: input.layout.generation.root,
    stats: generationStats,
    evidenceKind: 'runtime_generation_final_invalid',
  })
  await assertCanonicalDirectory(
    input.layout.generation.root,
    'runtime_generation_final_noncanonical',
  )
  const roster = await readDirectoryRoster(
    input.layout.generation.root,
    'runtime_generation_final_roster_invalid',
  )
  const completeRoster = sameStringArray(
    roster,
    GENERATION_ROOT_ROSTER,
  )
  const missingRuntimeRoster = sameStringArray(roster, [
    'receipt.json',
  ])
  if (!completeRoster && !missingRuntimeRoster) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_final_roster_ambiguous',
    })
  }
  const expectedReceipt =
    createRuntimeGenerationVerificationReceipt(
      input.layout,
      generationIdentity,
    )
  const receipt = await readAndVerifyReceipt({
    expectedDevice: generationIdentity.device,
    expectedOwnerUid: cache.expectedOwnerUid,
    expectedReceipt,
    receiptPath: input.layout.generation.receiptPath,
  })
  const authority: RuntimeGenerationQuarantineAuthority = {
    kind: 'runtime_generation_quarantine_authority',
    generationIdentity,
    receipt,
    roster: completeRoster ? 'complete' : 'missing-runtime',
  }
  if (missingRuntimeRoster) {
    await assertOwnedGenerationAuthorityStable({
      cache,
      generationIdentity,
      input,
      receipt,
      roster,
    })
    return { kind: 'owned-invalid', authority }
  }
  let tree: RuntimeGenerationTreeVerificationSnapshot
  try {
    tree = await verifyRuntimeGenerationTree({
      admission: input.admission,
      canonicalManifestBytes: input.canonicalManifestBytes,
      expectedDevice: generationIdentity.device,
      expectedOwnerUid: cache.expectedOwnerUid,
      runtimeRoot: input.layout.generation.runtimeRoot,
      signal: input.signal,
    })
  } catch (error) {
    if (isCancellationError(error)) throw error
    if (!isIntegrityError(error)) throw error
    await assertOwnedGenerationAuthorityStable({
      cache,
      generationIdentity,
      input,
      receipt,
      roster,
    })
    return { kind: 'owned-invalid', authority }
  }
  assertNotCancelled(input.signal)
  await assertGenerationReadbackStable({
    cache,
    generationIdentity,
    input,
    receipt,
    runtimeIdentity: tree.runtimeIdentity,
  })
  return {
    kind: 'verified',
    generation: {
      kind: 'published_runtime_generation_snapshot',
      generationIdentity,
      receipt,
      runtime: verifiedRuntime(input.admission, input.layout),
      runtimeIdentity: tree.runtimeIdentity,
      tree: tree.tree,
      cancelledAfterCommit: false,
    },
  }
}

/**
 * Moves only the exact app-owned invalid generation previously returned by
 * inspection. Generation and quarantine directories are revalidated before
 * the cooperative-lease rename, then both namespace mutations are synced and
 * read back before cancellation can be surfaced.
 */
export async function quarantineOwnedRuntimeGeneration(
  input: {
    readonly admission: RuntimeReleaseAdmission
    readonly authority: RuntimeGenerationQuarantineAuthority
    readonly canonicalManifestBytes: Uint8Array
    readonly layout: RuntimeCacheLayout
    readonly mutationAuthority: RuntimeCacheMutationAuthority
    readonly signal: AbortSignal
    readonly transactionNonce: string
  },
  testOptions: RuntimeGenerationQuarantineTestOptions = {},
): Promise<RuntimeGenerationQuarantineResult> {
  assertCommonBindings(input)
  assertTransactionNonce(input.transactionNonce)
  assertNotCancelled(input.signal)

  const observed = await inspectPublishedRuntimeGeneration(input)
  if (
    observed.kind !== 'owned-invalid' ||
    !sameGenerationQuarantineAuthority(
      observed.authority,
      input.authority,
    )
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_quarantine_authority_changed',
    })
  }

  const cache = await revalidateGenerationAuthority(input)
  const quarantine = createRuntimeQuarantineIdentity(
    input.layout,
    input.transactionNonce,
    'generation',
  )
  await assertPathAbsent(
    quarantine.path,
    'runtime_generation_quarantine_destination_exists',
  )
  await assertOwnedGenerationAuthorityStable({
    cache,
    generationIdentity: input.authority.generationIdentity,
    input,
    receipt: input.authority.receipt,
    roster: generationRoster(input.authority.roster),
  })
  await testOptions.beforeRename?.()
  await assertOwnedGenerationAuthorityStable({
    cache,
    generationIdentity: input.authority.generationIdentity,
    input,
    receipt: input.authority.receipt,
    roster: generationRoster(input.authority.roster),
  })
  await assertPathAbsent(
    quarantine.path,
    'runtime_generation_quarantine_destination_changed',
  )
  assertNotCancelled(input.signal)

  let commitStarted = false
  try {
    commitStarted = true
    await rename(input.layout.generation.root, quarantine.path)
    await testOptions.afterRename?.()
    await syncOwnedDirectory({
      expectedIdentity: cache.generationParent,
      expectedMode: 0o700,
      path: path.dirname(input.layout.generation.root),
    })
    await syncOwnedDirectory({
      expectedIdentity: cache.quarantineNamespace,
      expectedMode: 0o700,
      path: input.layout.namespaces.quarantine,
    })
    await testOptions.afterSync?.()
    await assertGenerationQuarantineReadback({
      authority: input.authority,
      cache,
      input,
      quarantinePath: quarantine.path,
    })
    return {
      kind: 'runtime_generation_quarantined',
      cancelledAfterCommit: input.signal.aborted,
    }
  } catch (error) {
    if (!commitStarted && error instanceof RuntimeReleaseAuthorityError) {
      throw error
    }
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_quarantine_incomplete',
      cause: error,
    })
  }
}

async function assertGenerationQuarantineReadback(input: {
  readonly authority: RuntimeGenerationQuarantineAuthority
  readonly cache: GenerationAuthoritySnapshot
  readonly input: {
    readonly admission: RuntimeReleaseAdmission
    readonly layout: RuntimeCacheLayout
    readonly mutationAuthority: RuntimeCacheMutationAuthority
  }
  readonly quarantinePath: string
}): Promise<void> {
  const current = await revalidateGenerationAuthority(input.input)
  assertSameGenerationAuthoritySnapshot(input.cache, current)
  await assertPathAbsent(
    input.input.layout.generation.root,
    'runtime_generation_present_after_quarantine',
  )
  await inspectOwnedDirectory({
    expectedDevice: input.cache.quarantineNamespace.device,
    expectedIdentity: input.authority.generationIdentity,
    expectedMode: 0o700,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    path: input.quarantinePath,
    evidenceKind: 'runtime_generation_quarantine_identity_invalid',
  })
  await assertCanonicalDirectory(
    input.quarantinePath,
    'runtime_generation_quarantine_noncanonical',
  )
  await assertExactRoster(
    input.quarantinePath,
    generationRoster(input.authority.roster),
    'runtime_generation_quarantine_roster_invalid',
  )
  await readAndVerifyReceipt({
    expectedDevice: input.authority.generationIdentity.device,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    expectedReceipt: input.authority.receipt,
    receiptPath: path.join(input.quarantinePath, 'receipt.json'),
  })
  assertSameGenerationAuthoritySnapshot(
    input.cache,
    await revalidateGenerationAuthority(input.input),
  )
}

async function assertOwnedGenerationAuthorityStable(input: {
  readonly cache: GenerationAuthoritySnapshot
  readonly generationIdentity: RuntimeFileSystemIdentity
  readonly input: {
    readonly admission: RuntimeReleaseAdmission
    readonly layout: RuntimeCacheLayout
    readonly mutationAuthority: RuntimeCacheMutationAuthority
  }
  readonly receipt: RuntimeGenerationVerificationReceipt
  readonly roster: readonly string[]
}): Promise<void> {
  await revalidateGenerationAuthority(input.input)
  await inspectOwnedDirectory({
    expectedDevice: input.cache.generationNamespace.device,
    expectedIdentity: input.generationIdentity,
    expectedMode: 0o700,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    path: input.input.layout.generation.root,
    evidenceKind: 'runtime_generation_owned_identity_changed',
  })
  const currentRoster = await readDirectoryRoster(
    input.input.layout.generation.root,
    'runtime_generation_owned_roster_changed',
  )
  if (!sameStringArray(input.roster, currentRoster)) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_owned_roster_changed',
    })
  }
  await readAndVerifyReceipt({
    expectedDevice: input.generationIdentity.device,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    expectedReceipt: input.receipt,
    receiptPath: input.input.layout.generation.receiptPath,
  })
}

async function assertGenerationReadbackStable(input: {
  readonly cache: GenerationAuthoritySnapshot
  readonly generationIdentity: RuntimeFileSystemIdentity
  readonly input: {
    readonly admission: RuntimeReleaseAdmission
    readonly layout: RuntimeCacheLayout
    readonly mutationAuthority: RuntimeCacheMutationAuthority
  }
  readonly receipt: RuntimeGenerationVerificationReceipt
  readonly runtimeIdentity: RuntimeFileSystemIdentity
}): Promise<void> {
  await revalidateGenerationAuthority(input.input)
  await inspectOwnedDirectory({
    expectedDevice: input.cache.generationNamespace.device,
    expectedIdentity: input.generationIdentity,
    expectedMode: 0o700,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    path: input.input.layout.generation.root,
    evidenceKind: 'runtime_generation_final_identity_changed',
  })
  await inspectOwnedDirectory({
    expectedDevice: input.cache.generationNamespace.device,
    expectedIdentity: input.runtimeIdentity,
    expectedMode: 0o700,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    path: input.input.layout.generation.runtimeRoot,
    evidenceKind: 'runtime_generation_runtime_identity_changed',
  })
  await assertExactRoster(
    input.input.layout.generation.root,
    GENERATION_ROOT_ROSTER,
    'runtime_generation_final_roster_changed',
  )
  await readAndVerifyReceipt({
    expectedDevice: input.generationIdentity.device,
    expectedOwnerUid: input.cache.expectedOwnerUid,
    expectedReceipt: input.receipt,
    receiptPath: input.input.layout.generation.receiptPath,
  })
}

type GenerationAuthoritySnapshot = {
  readonly expectedOwnerUid: number
  readonly generationNamespace: RuntimeFileSystemIdentity
  readonly generationParent: RuntimeFileSystemIdentity
  readonly quarantineNamespace: RuntimeFileSystemIdentity
}

async function revalidateGenerationAuthority(input: {
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
}): Promise<GenerationAuthoritySnapshot> {
  if (
    input.mutationAuthority.kind !==
      'runtime_cache_mutation_authority' ||
    input.mutationAuthority.snapshot.appDataRoot !==
      input.layout.appDataRoot ||
    input.mutationAuthority.snapshot.cacheRoot !==
      input.layout.cacheRoot
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_generation_cache_binding_invalid',
    })
  }
  const current = await revalidateRuntimeCacheRootForMutation(
    input.mutationAuthority.snapshot,
  )
  const generationNamespace =
    current.snapshot.namespaceIdentities.generations
  const quarantineNamespace =
    current.snapshot.namespaceIdentities.quarantine
  if (
    generationNamespace === undefined ||
    quarantineNamespace === undefined ||
    generationNamespace.device !== quarantineNamespace.device
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_generation_namespaces_invalid',
    })
  }
  const generationParent = await inspectOwnedDirectory({
    expectedDevice: generationNamespace.device,
    expectedMode: 0o700,
    expectedOwnerUid: current.snapshot.expectedOwnerUid,
    path: path.dirname(input.layout.generation.root),
    evidenceKind: 'runtime_generation_parent_invalid',
  })
  await assertCanonicalDirectory(
    path.dirname(input.layout.generation.root),
    'runtime_generation_parent_noncanonical',
  )
  return {
    expectedOwnerUid: current.snapshot.expectedOwnerUid,
    generationNamespace,
    generationParent,
    quarantineNamespace,
  }
}

function assertPublishBindings(
  input: RuntimeGenerationPublishInput,
): void {
  assertCommonBindings(input)
  const stagingLeaf = path.basename(input.staging.stagingRoot)
  if (
    input.staging.kind !==
      'runtime_staging_verification_snapshot' ||
    !sameRelease(input.staging.release, input.admission.identity) ||
    input.staging.stagingRoot !==
      path.dirname(input.staging.runtimeRoot) ||
    path.basename(input.staging.runtimeRoot) !== 'runtime' ||
    path.dirname(input.staging.stagingRoot) !==
      input.layout.namespaces.staging ||
    stagingLeaf !==
      `${input.admission.identity.archiveSha256}-` +
        stagingLeaf.slice(-32) ||
    !/^[0-9a-f]{32}$/u.test(stagingLeaf.slice(-32))
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_generation_staging_binding_invalid',
    })
  }
}

function assertCommonBindings(input: {
  readonly admission: RuntimeReleaseAdmission
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
}): void {
  const expectedGenerationRoot = path.join(
    input.layout.cacheRoot,
    'generations',
    input.admission.identity.releaseId,
    input.admission.identity.target,
    input.admission.identity.archiveSha256,
  )
  if (
    input.mutationAuthority.kind !==
      'runtime_cache_mutation_authority' ||
    input.mutationAuthority.snapshot.appDataRoot !==
      input.layout.appDataRoot ||
    input.mutationAuthority.snapshot.cacheRoot !==
      input.layout.cacheRoot ||
    !sameRelease(input.layout.identity, input.admission.identity) ||
    input.layout.namespaces.generations !==
      path.join(input.layout.cacheRoot, 'generations') ||
    input.layout.namespaces.quarantine !==
      path.join(input.layout.cacheRoot, 'quarantine') ||
    input.layout.generation.root !== expectedGenerationRoot ||
    input.layout.generation.runtimeRoot !==
      path.join(input.layout.generation.root, 'runtime') ||
    input.layout.generation.receiptPath !==
      path.join(input.layout.generation.root, 'receipt.json') ||
    !isContained(
      input.layout.namespaces.generations,
      input.layout.generation.root,
    )
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_generation_binding_invalid',
    })
  }
}

function assertSameGenerationAuthoritySnapshot(
  left: GenerationAuthoritySnapshot,
  right: GenerationAuthoritySnapshot,
): void {
  if (
    left.expectedOwnerUid !== right.expectedOwnerUid ||
    !sameIdentity(
      left.generationNamespace,
      right.generationNamespace,
    ) ||
    !sameIdentity(left.generationParent, right.generationParent) ||
    !sameIdentity(
      left.quarantineNamespace,
      right.quarantineNamespace,
    )
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_cache_authority_changed',
    })
  }
}

function sameGenerationQuarantineAuthority(
  left: RuntimeGenerationQuarantineAuthority,
  right: RuntimeGenerationQuarantineAuthority,
): boolean {
  return (
    left.kind === right.kind &&
    left.roster === right.roster &&
    sameIdentity(
      left.generationIdentity,
      right.generationIdentity,
    ) &&
    encodeReceipt(left.receipt).equals(encodeReceipt(right.receipt))
  )
}

function generationRoster(
  roster: RuntimeGenerationQuarantineAuthority['roster'],
): readonly string[] {
  return roster === 'complete'
    ? GENERATION_ROOT_ROSTER
    : ['receipt.json']
}

function assertTransactionNonce(value: string): void {
  if (!/^[0-9a-f]{32}$/u.test(value)) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_generation_quarantine_nonce_invalid',
    })
  }
}

async function writeAndVerifyReceipt(input: {
  readonly expectedDevice: string
  readonly expectedOwnerUid: number
  readonly receipt: RuntimeGenerationVerificationReceipt
  readonly receiptPath: string
}): Promise<void> {
  const bytes = encodeReceipt(input.receipt)
  if (bytes.byteLength > MAX_RECEIPT_BYTES) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_receipt_too_large',
    })
  }
  let handle: FileHandle | undefined
  try {
    handle = await open(
      input.receiptPath,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    )
    await handle.chmod(0o600)
    await handle.writeFile(bytes)
    await handle.sync()
    assertReceiptStats({
      bytes,
      expectedDevice: input.expectedDevice,
      expectedOwnerUid: input.expectedOwnerUid,
      path: input.receiptPath,
      stats: await handle.stat({ bigint: true }),
    })
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_generation_receipt_write_failed',
      cause: error,
    })
  } finally {
    await handle?.close().catch(() => undefined)
  }
  await readAndVerifyReceipt({
    expectedDevice: input.expectedDevice,
    expectedOwnerUid: input.expectedOwnerUid,
    expectedReceipt: input.receipt,
    receiptPath: input.receiptPath,
  })
}

async function readAndVerifyReceipt(input: {
  readonly expectedDevice: string
  readonly expectedOwnerUid: number
  readonly expectedReceipt: RuntimeGenerationVerificationReceipt
  readonly receiptPath: string
}): Promise<RuntimeGenerationVerificationReceipt> {
  const expectedBytes = encodeReceipt(input.expectedReceipt)
  let handle: FileHandle | undefined
  try {
    handle = await open(
      input.receiptPath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    const identity = assertReceiptStats({
      bytes: expectedBytes,
      expectedDevice: input.expectedDevice,
      expectedOwnerUid: input.expectedOwnerUid,
      path: input.receiptPath,
      stats: await handle.stat({ bigint: true }),
    })
    const observedBytes = await handle.readFile()
    if (
      observedBytes.byteLength > MAX_RECEIPT_BYTES ||
      !observedBytes.equals(expectedBytes)
    ) {
      throw new Error('Runtime generation receipt bytes differ')
    }
    assertReceiptStats({
      bytes: expectedBytes,
      expectedDevice: input.expectedDevice,
      expectedIdentity: identity,
      expectedOwnerUid: input.expectedOwnerUid,
      path: input.receiptPath,
      stats: await lstat(input.receiptPath, { bigint: true }),
    })
    return input.expectedReceipt
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_receipt_invalid',
      cause: error,
    })
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

function assertReceiptStats(input: {
  readonly bytes: Buffer
  readonly expectedDevice: string
  readonly expectedIdentity?: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
  readonly path: string
  readonly stats: BigIntStats
}): RuntimeFileSystemIdentity {
  const identity = identityFromStats(input.stats)
  if (
    !input.stats.isFile() ||
    input.stats.isSymbolicLink() ||
    input.stats.nlink !== 1n ||
    Number(input.stats.mode & 0o7777n) !== 0o600 ||
    input.stats.size !== BigInt(input.bytes.byteLength) ||
    identity.device !== input.expectedDevice ||
    identity.ownerUid !== input.expectedOwnerUid ||
    (input.expectedIdentity !== undefined &&
      !sameIdentity(identity, input.expectedIdentity))
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_generation_receipt_identity_invalid',
    })
  }
  return identity
}

async function inspectOwnedDirectory(input: {
  readonly expectedDevice: string
  readonly expectedIdentity?: RuntimeFileSystemIdentity
  readonly expectedMode: number
  readonly expectedOwnerUid: number
  readonly path: string
  readonly evidenceKind: string
}): Promise<RuntimeFileSystemIdentity> {
  let stats: BigIntStats
  try {
    stats = await lstat(input.path, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: input.evidenceKind,
      cause: error,
    })
  }
  return assertOwnedDirectoryStats({ ...input, stats })
}

function assertOwnedDirectoryStats(input: {
  readonly expectedDevice: string
  readonly expectedIdentity?: RuntimeFileSystemIdentity
  readonly expectedMode: number
  readonly expectedOwnerUid: number
  readonly path: string
  readonly stats: BigIntStats
  readonly evidenceKind: string
}): RuntimeFileSystemIdentity {
  const identity = identityFromStats(input.stats)
  if (
    !input.stats.isDirectory() ||
    input.stats.isSymbolicLink() ||
    input.stats.nlink < 1n ||
    Number(input.stats.mode & 0o7777n) !== input.expectedMode ||
    identity.device !== input.expectedDevice ||
    identity.ownerUid !== input.expectedOwnerUid ||
    (input.expectedIdentity !== undefined &&
      !sameIdentity(identity, input.expectedIdentity))
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: input.evidenceKind,
    })
  }
  return identity
}

async function syncOwnedDirectory(input: {
  readonly expectedIdentity: RuntimeFileSystemIdentity
  readonly expectedMode: number
  readonly path: string
}): Promise<void> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      input.path,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    const stats = await handle.stat({ bigint: true })
    assertOwnedDirectoryStats({
      expectedDevice: input.expectedIdentity.device,
      expectedIdentity: input.expectedIdentity,
      expectedMode: input.expectedMode,
      expectedOwnerUid: input.expectedIdentity.ownerUid,
      path: input.path,
      stats,
      evidenceKind: 'runtime_generation_sync_identity_invalid',
    })
    await handle.sync()
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_generation_directory_sync_failed',
      cause: error,
    })
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

async function assertCanonicalDirectory(
  directory: string,
  evidenceKind: string,
): Promise<void> {
  let canonical: string
  try {
    canonical = await realpath(directory)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: evidenceKind,
      cause: error,
    })
  }
  if (canonical !== directory) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
    })
  }
}

async function assertExactRoster(
  directory: string,
  expected: readonly string[],
  evidenceKind: string,
): Promise<void> {
  const entries = await readDirectoryRoster(directory, evidenceKind)
  const orderedExpected = [...expected].sort(compareUnicodeCodePoints)
  if (!sameStringArray(entries, orderedExpected)) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
    })
  }
}

async function readDirectoryRoster(
  directory: string,
  evidenceKind: string,
): Promise<string[]> {
  let entries: string[]
  try {
    entries = (await readdir(directory)).sort(compareUnicodeCodePoints)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: evidenceKind,
      cause: error,
    })
  }
  return entries
}

async function assertPathAbsent(
  targetPath: string,
  evidenceKind: string,
): Promise<void> {
  const stats = await lstatIfPresent(targetPath)
  if (stats !== undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
    })
  }
}

async function lstatIfPresent(
  targetPath: string,
): Promise<BigIntStats | undefined> {
  try {
    return await lstat(targetPath, { bigint: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return undefined
    }
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_generation_observation_failed',
      cause: error,
    })
  }
}

async function syncVerifiedRuntimeDirectories(input: {
  readonly admission: RuntimeReleaseAdmission
  readonly expectedDevice: string
  readonly expectedOwnerUid: number
  readonly runtimeIdentity: RuntimeFileSystemIdentity
  readonly runtimeRoot: string
}): Promise<void> {
  const directories = new Set<string>()
  for (const entry of input.admission.manifest.payload.entries) {
    let directory = path.posix.dirname(entry.path)
    while (directory !== '.') {
      directories.add(directory)
      directory = path.posix.dirname(directory)
    }
  }
  const ordered = [...directories].sort((left, right) => {
    const depth =
      right.split('/').length - left.split('/').length
    return depth === 0
      ? compareUnicodeCodePoints(left, right)
      : depth
  })
  for (const relativePath of ordered) {
    const directory = path.join(
      input.runtimeRoot,
      ...relativePath.split('/'),
    )
    const identity = await inspectOwnedDirectory({
      expectedDevice: input.expectedDevice,
      expectedMode: 0o755,
      expectedOwnerUid: input.expectedOwnerUid,
      path: directory,
      evidenceKind: 'runtime_generation_directory_sync_invalid',
    })
    await syncOwnedDirectory({
      expectedIdentity: identity,
      expectedMode: 0o755,
      path: directory,
    })
  }
  await syncOwnedDirectory({
    expectedIdentity: input.runtimeIdentity,
    expectedMode: 0o700,
    path: input.runtimeRoot,
  })
}

function verifiedRuntime(
  admission: RuntimeReleaseAdmission,
  layout: RuntimeCacheLayout,
): VerifiedRuntime {
  return {
    runtimeRoot: layout.generation.runtimeRoot,
    identity: {
      releaseId: admission.identity.releaseId,
      target: admission.identity.target,
      runtimeContractVersion:
        admission.identity.runtimeContractVersion,
      nativeCodexVersion:
        admission.manifest.identity.native_codex_version,
      pythonVersion: admission.manifest.identity.python_version,
      sourceCommit: admission.manifest.identity.source_commit,
      patchStackSha256:
        admission.manifest.identity.patch_stack_sha256,
    },
  }
}

function encodeReceipt(
  receipt: RuntimeGenerationVerificationReceipt,
): Buffer {
  return Buffer.from(`${JSON.stringify(receipt)}\n`)
}

function identityFromStats(
  stats: BigIntStats,
): RuntimeFileSystemIdentity {
  return {
    device: String(stats.dev),
    inode: String(stats.ino),
    ownerUid: Number(stats.uid),
  }
}

function sameIdentity(
  left: RuntimeFileSystemIdentity,
  right: RuntimeFileSystemIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.ownerUid === right.ownerUid
  )
}

function sameRelease(
  left: RuntimeReleaseAdmission['identity'],
  right: RuntimeReleaseAdmission['identity'],
): boolean {
  return (
    left.archiveSha256 === right.archiveSha256 &&
    left.manifestSha256 === right.manifestSha256 &&
    left.releaseId === right.releaseId &&
    left.runtimeContractVersion === right.runtimeContractVersion &&
    left.target === right.target
  )
}

function sameTree(
  left: RuntimeMaterializedTreeVerificationSnapshot['tree'],
  right: RuntimeMaterializedTreeVerificationSnapshot['tree'],
): boolean {
  return (
    left.fileCount === right.fileCount &&
    left.regularFileBytes === right.regularFileBytes &&
    left.symlinkCount === right.symlinkCount
  )
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative !== '' &&
    !path.isAbsolute(relative) &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`)
  )
}

function compareUnicodeCodePoints(
  left: string,
  right: string,
): number {
  const leftPoints = Array.from(
    left,
    (character) => character.codePointAt(0)!,
  )
  const rightPoints = Array.from(
    right,
    (character) => character.codePointAt(0)!,
  )
  const length = Math.min(leftPoints.length, rightPoints.length)
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index]
    }
  }
  return leftPoints.length - rightPoints.length
}

function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw runtimeAuthorityError('runtime_cancelled', {
      kind: 'runtime_generation_cancelled',
    })
  }
}

function isCancellationError(error: unknown): boolean {
  return (
    error instanceof RuntimeReleaseAuthorityError &&
    error.failure.code === 'runtime_cancelled'
  )
}

function isIntegrityError(error: unknown): boolean {
  return (
    error instanceof RuntimeReleaseAuthorityError &&
    error.failure.code === 'runtime_integrity_failed'
  )
}

function isNodeError(
  error: unknown,
): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
