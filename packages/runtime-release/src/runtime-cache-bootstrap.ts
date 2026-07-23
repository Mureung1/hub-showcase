/// <reference types="node" />

import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
} from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

import {
  createRuntimeCacheLayout,
  createRuntimeStagingIdentity,
  inspectRuntimeCacheRoot,
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import type {
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
  RuntimeFileSystemIdentity,
  RuntimeStagingIdentity,
} from './runtime-cache-authority.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmission,
} from './runtime-release-authority.js'

const CACHE_NAMESPACE_NAMES = [
  'archives',
  'generations',
  'leases',
  'partials',
  'quarantine',
  'staging',
] as const

export type RuntimeCacheBootstrapResult = {
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
}

/**
 * Package-private fault/race seam. Production callers must omit it.
 */
export type RuntimeCacheBootstrapTestOptions = {
  readonly afterDirectoryCreate?: (input: {
    readonly directory: string
  }) => Promise<void>
  readonly beforeParentSync?: (input: {
    readonly directory: string
    readonly parent: string
  }) => Promise<void>
}

export type RuntimeStagingRootTestOptions =
  RuntimeCacheBootstrapTestOptions

/**
 * Materializes only the stable Runtime cache hierarchy. The app data root
 * itself must already be a canonical owner-only directory. Every descendant
 * is created as one direct leaf, durably linked from a revalidated parent,
 * and re-read before mutation authority is returned.
 */
export async function bootstrapRuntimeCache(
  input: {
    readonly admission: RuntimeReleaseAdmission
    readonly appDataRoot: string
    readonly signal: AbortSignal
  },
  testOptions: RuntimeCacheBootstrapTestOptions = {},
): Promise<RuntimeCacheBootstrapResult> {
  assertNotCancelled(input.signal)
  const layout = createRuntimeCacheLayout(
    input.appDataRoot,
    input.admission,
  )
  const initial = await inspectRuntimeCacheRoot({
    appDataRoot: layout.appDataRoot,
  })
  if (
    initial.appDataRoot !== layout.appDataRoot ||
    initial.cacheRoot !== layout.cacheRoot
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_bootstrap_layout_invalid',
    })
  }

  let parent = {
    identity: initial.appDataRootIdentity,
    path: initial.appDataRoot,
  }
  parent = await ensureOwnedDirectChild({
    directory: path.dirname(layout.cacheRoot),
    expectedDevice: initial.appDataRootIdentity.device,
    expectedOwnerUid: initial.expectedOwnerUid,
    parent,
    signal: input.signal,
    testOptions,
    allowExisting: true,
  })
  const cacheRoot = await ensureOwnedDirectChild({
    directory: layout.cacheRoot,
    expectedDevice: initial.appDataRootIdentity.device,
    expectedOwnerUid: initial.expectedOwnerUid,
    parent,
    signal: input.signal,
    testOptions,
    allowExisting: true,
  })

  const namespaceIdentities: Partial<
    Record<
      (typeof CACHE_NAMESPACE_NAMES)[number],
      RuntimeFileSystemIdentity
    >
  > = {}
  for (const namespace of CACHE_NAMESPACE_NAMES) {
    assertNotCancelled(input.signal)
    const directory = layout.namespaces[namespace]
    const child = await ensureOwnedDirectChild({
      directory,
      expectedDevice: initial.appDataRootIdentity.device,
      expectedOwnerUid: initial.expectedOwnerUid,
      parent: cacheRoot,
      signal: input.signal,
      testOptions,
      allowExisting: true,
    })
    namespaceIdentities[namespace] = child.identity
  }

  const generationsIdentity =
    namespaceIdentities.generations
  if (generationsIdentity === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_generation_namespace_missing',
    })
  }
  const generationNamespace = {
    identity: generationsIdentity,
    path: layout.namespaces.generations,
  }
  const releaseRoot = path.join(
    generationNamespace.path,
    layout.identity.releaseId,
  )
  const releaseParent = await ensureOwnedDirectChild({
    directory: releaseRoot,
    expectedDevice: initial.appDataRootIdentity.device,
    expectedOwnerUid: initial.expectedOwnerUid,
    parent: generationNamespace,
    signal: input.signal,
    testOptions,
    allowExisting: true,
  })
  const generationParentPath = path.dirname(
    layout.generation.root,
  )
  if (
    path.basename(generationParentPath) !==
      layout.identity.target
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_generation_parent_binding_invalid',
    })
  }
  const generationParent = await ensureOwnedDirectChild({
    directory: generationParentPath,
    expectedDevice: initial.appDataRootIdentity.device,
    expectedOwnerUid: initial.expectedOwnerUid,
    parent: releaseParent,
    signal: input.signal,
    testOptions,
    allowExisting: true,
  })
  assertNotCancelled(input.signal)

  const finalInspection = await inspectRuntimeCacheRoot({
    appDataRoot: layout.appDataRoot,
    expectedOwnerUid: initial.expectedOwnerUid,
  })
  if (
    finalInspection.state !== 'present' ||
    finalInspection.cacheRootIdentity === undefined ||
    !CACHE_NAMESPACE_NAMES.every(
      (namespace) =>
        finalInspection.namespaceIdentities[namespace] !==
        undefined,
    )
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_bootstrap_incomplete',
    })
  }
  const mutationAuthority =
    await revalidateRuntimeCacheRootForMutation(finalInspection)
  const finalGenerationNamespace =
    mutationAuthority.snapshot.namespaceIdentities.generations
  if (
    finalGenerationNamespace === undefined ||
    !sameIdentity(
      finalGenerationNamespace,
      generationNamespace.identity,
    )
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_generation_namespace_changed',
    })
  }
  await inspectOwnedCanonicalDirectory({
    directory: releaseParent.path,
    expectedDevice: finalGenerationNamespace.device,
    expectedIdentity: releaseParent.identity,
    expectedOwnerUid: initial.expectedOwnerUid,
    evidenceKind: 'runtime_cache_generation_release_changed',
  })
  await inspectOwnedCanonicalDirectory({
    directory: generationParent.path,
    expectedDevice: finalGenerationNamespace.device,
    expectedIdentity: generationParent.identity,
    expectedOwnerUid: initial.expectedOwnerUid,
    evidenceKind: 'runtime_cache_generation_target_changed',
  })
  const stableMutationAuthority =
    await revalidateRuntimeCacheRootForMutation(
      mutationAuthority.snapshot,
    )

  return {
    layout,
    mutationAuthority: stableMutationAuthority,
  }
}

/**
 * Creates one exclusive owner-only staging root after the resolver owns the
 * digest lease. Existing same-name residue is never reused.
 */
export async function createOwnedRuntimeStagingRoot(
  input: {
    readonly layout: RuntimeCacheLayout
    readonly mutationAuthority: RuntimeCacheMutationAuthority
    readonly signal: AbortSignal
    readonly transactionNonce: string
  },
  testOptions: RuntimeStagingRootTestOptions = {},
): Promise<RuntimeStagingIdentity> {
  assertNotCancelled(input.signal)
  if (
    input.mutationAuthority.kind !==
      'runtime_cache_mutation_authority' ||
    input.mutationAuthority.snapshot.appDataRoot !==
      input.layout.appDataRoot ||
    input.mutationAuthority.snapshot.cacheRoot !==
      input.layout.cacheRoot
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_staging_cache_binding_invalid',
    })
  }
  const staging = createRuntimeStagingIdentity(
    input.layout,
    input.transactionNonce,
  )
  const authority =
    await revalidateRuntimeCacheRootForMutation(
      input.mutationAuthority.snapshot,
    )
  const stagingNamespace =
    authority.snapshot.namespaceIdentities.staging
  if (stagingNamespace === undefined) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_staging_namespace_missing',
    })
  }
  const created = await ensureOwnedDirectChild({
    directory: staging.path,
    expectedDevice: stagingNamespace.device,
    expectedOwnerUid: authority.snapshot.expectedOwnerUid,
    parent: {
      identity: stagingNamespace,
      path: input.layout.namespaces.staging,
    },
    signal: input.signal,
    testOptions,
    allowExisting: false,
  })
  await assertOwnedEmptyDirectory(staging.path)
  assertNotCancelled(input.signal)
  const current = await revalidateRuntimeCacheRootForMutation(
    authority.snapshot,
  )
  const currentStagingNamespace =
    current.snapshot.namespaceIdentities.staging
  if (
    currentStagingNamespace === undefined ||
    !sameIdentity(currentStagingNamespace, stagingNamespace)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_staging_namespace_changed',
    })
  }
  await inspectOwnedCanonicalDirectory({
    directory: staging.path,
    expectedDevice: currentStagingNamespace.device,
    expectedIdentity: created.identity,
    expectedOwnerUid: current.snapshot.expectedOwnerUid,
    evidenceKind: 'runtime_staging_root_changed',
  })
  await assertOwnedEmptyDirectory(staging.path)
  return staging
}

type OwnedDirectory = {
  readonly identity: RuntimeFileSystemIdentity
  readonly path: string
}

async function ensureOwnedDirectChild(input: {
  readonly directory: string
  readonly expectedDevice: string
  readonly expectedOwnerUid: number
  readonly parent: OwnedDirectory
  readonly signal: AbortSignal
  readonly testOptions: RuntimeCacheBootstrapTestOptions
  readonly allowExisting: boolean
}): Promise<OwnedDirectory> {
  assertDirectChild(input.parent.path, input.directory)
  assertNotCancelled(input.signal)
  await inspectOwnedCanonicalDirectory({
    directory: input.parent.path,
    expectedDevice: input.expectedDevice,
    expectedIdentity: input.parent.identity,
    expectedOwnerUid: input.expectedOwnerUid,
    evidenceKind: 'runtime_cache_bootstrap_parent_changed',
  })

  let created = false
  try {
    await mkdir(input.directory, { mode: 0o700 })
    created = true
  } catch (error) {
    if (
      !isNodeError(error) ||
      error.code !== 'EEXIST' ||
      !input.allowExisting
    ) {
      if (
        isNodeError(error) &&
        error.code === 'EEXIST' &&
        !input.allowExisting
      ) {
        throw runtimeAuthorityError('runtime_recovery_required', {
          kind: 'runtime_staging_root_already_exists',
        })
      }
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_cache_directory_create_failed',
        cause: error,
      })
    }
  }
  const childIdentity = await inspectOwnedCanonicalDirectory({
    directory: input.directory,
    expectedDevice: input.expectedDevice,
    expectedOwnerUid: input.expectedOwnerUid,
    evidenceKind: 'runtime_cache_bootstrap_child_invalid',
  })
  if (created) {
    await input.testOptions.afterDirectoryCreate?.({
      directory: input.directory,
    })
  }

  await inspectOwnedCanonicalDirectory({
    directory: input.parent.path,
    expectedDevice: input.expectedDevice,
    expectedIdentity: input.parent.identity,
    expectedOwnerUid: input.expectedOwnerUid,
    evidenceKind: 'runtime_cache_bootstrap_parent_changed',
  })
  await inspectOwnedCanonicalDirectory({
    directory: input.directory,
    expectedDevice: input.expectedDevice,
    expectedIdentity: childIdentity,
    expectedOwnerUid: input.expectedOwnerUid,
    evidenceKind: 'runtime_cache_bootstrap_child_changed',
  })
  await input.testOptions.beforeParentSync?.({
    directory: input.directory,
    parent: input.parent.path,
  })
  await syncOwnedDirectory(input.parent)
  await inspectOwnedCanonicalDirectory({
    directory: input.parent.path,
    expectedDevice: input.expectedDevice,
    expectedIdentity: input.parent.identity,
    expectedOwnerUid: input.expectedOwnerUid,
    evidenceKind: 'runtime_cache_bootstrap_parent_changed',
  })
  await inspectOwnedCanonicalDirectory({
    directory: input.directory,
    expectedDevice: input.expectedDevice,
    expectedIdentity: childIdentity,
    expectedOwnerUid: input.expectedOwnerUid,
    evidenceKind: 'runtime_cache_bootstrap_child_changed',
  })

  return {
    identity: childIdentity,
    path: input.directory,
  }
}

function assertDirectChild(parent: string, child: string): void {
  if (
    !path.isAbsolute(parent) ||
    !path.isAbsolute(child) ||
    path.normalize(parent) !== parent ||
    path.normalize(child) !== child ||
    path.dirname(child) !== parent ||
    path.basename(child) === '' ||
    path.basename(child) === '.' ||
    path.basename(child) === '..'
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_bootstrap_child_path_invalid',
    })
  }
}

async function inspectOwnedCanonicalDirectory(input: {
  readonly directory: string
  readonly expectedDevice: string
  readonly expectedIdentity?: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
  readonly evidenceKind: string
}): Promise<RuntimeFileSystemIdentity> {
  let initialStats: BigIntStats
  let currentStats: BigIntStats
  let canonical: string
  try {
    initialStats = await lstat(input.directory, { bigint: true })
    canonical = await realpath(input.directory)
    currentStats = await lstat(input.directory, { bigint: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: input.evidenceKind,
      })
    }
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: input.evidenceKind,
      cause: error,
    })
  }
  const initialIdentity = assertOwnedDirectoryStats({
    ...input,
    stats: initialStats,
  })
  const identity = assertOwnedDirectoryStats({
    ...input,
    expectedIdentity: initialIdentity,
    stats: currentStats,
  })
  if (canonical !== input.directory) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: input.evidenceKind,
    })
  }
  return identity
}

function assertOwnedDirectoryStats(input: {
  readonly directory: string
  readonly expectedDevice: string
  readonly expectedIdentity?: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
  readonly evidenceKind: string
  readonly stats: BigIntStats
}): RuntimeFileSystemIdentity {
  const identity = identityFromStats(input.stats)
  if (
    !input.stats.isDirectory() ||
    input.stats.isSymbolicLink() ||
    input.stats.nlink < 1n ||
    Number(input.stats.mode & 0o7777n) !== 0o700 ||
    identity.device !== input.expectedDevice ||
    identity.ownerUid !== input.expectedOwnerUid
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: input.evidenceKind,
    })
  }
  if (
    input.expectedIdentity !== undefined &&
    !sameIdentity(identity, input.expectedIdentity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: input.evidenceKind,
    })
  }
  return identity
}

async function syncOwnedDirectory(
  directory: OwnedDirectory,
): Promise<void> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      directory.path,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    const stats = await handle.stat({ bigint: true })
    const identity = identityFromStats(stats)
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      stats.nlink < 1n ||
      Number(stats.mode & 0o7777n) !== 0o700 ||
      !sameIdentity(identity, directory.identity)
    ) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_cache_bootstrap_sync_identity_changed',
      })
    }
    await handle.sync()
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_cache_bootstrap_directory_sync_failed',
      cause: error,
    })
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

async function assertOwnedEmptyDirectory(
  directory: string,
): Promise<void> {
  let entries: string[]
  try {
    entries = await readdir(directory)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_staging_roster_unavailable',
      cause: error,
    })
  }
  if (entries.length !== 0) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_staging_roster_not_empty',
    })
  }
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

function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw runtimeAuthorityError('runtime_cancelled', {
      kind: 'runtime_cache_bootstrap_cancelled',
    })
  }
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}
