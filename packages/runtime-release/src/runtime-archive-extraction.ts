/// <reference types="node" />

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  lstat,
  open,
  readdir,
  realpath,
} from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'
import { Transform } from 'node:stream'
import type { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip } from 'node:zlib'

import { extract } from 'tar-stream'
import type { Headers } from 'tar-stream'

import type {
  RuntimeManifestEntry,
  RuntimeManifestFileEntry,
  RuntimeManifestSymlinkEntry,
} from './canonical-runtime-manifest.js'
import {
  createRuntimeStagingIdentity,
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
import type { RuntimeReleaseAdmission } from './runtime-release-authority.js'
import {
  RuntimeDirectoryCapability,
} from './runtime-archive-directory-capability.js'
import type {
  RuntimeCapabilityStats,
} from './runtime-archive-directory-capability.js'

const TAR_BLOCK_BYTES = 512
const TAR_TRAILER_BYTES = TAR_BLOCK_BYTES * 2
const RUNTIME_RECIPIENT_NAME = 'runtime'
const MACOS_FILENAME_COLLATOR = new Intl.Collator('und', {
  usage: 'search',
  sensitivity: 'accent',
})
const MAX_FULL_CASE_FOLD_PASSES = 8
const REQUIRED_RUNTIME_TOP_LEVEL = [
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'bundle',
  'licenses',
  'manifest.json',
  'provenance',
  'sbom.spdx.json',
] as const

type ArchiveDirectoryEntry = {
  readonly path: string
  readonly type: 'directory'
  readonly mode: 0o755
  readonly bytes: 0
}

type ArchiveManifestEntry = {
  readonly path: 'manifest.json'
  readonly type: 'file'
  readonly mode: 0o644
  readonly bytes: number
  readonly sha256: string
}

type ArchiveExpectedEntry =
  | ArchiveDirectoryEntry
  | ArchiveManifestEntry
  | RuntimeManifestEntry

type RuntimeArchivePlan = {
  readonly entries: ReadonlyMap<string, ArchiveExpectedEntry>
  readonly directories: readonly ArchiveDirectoryEntry[]
  readonly files: readonly (RuntimeManifestFileEntry | ArchiveManifestEntry)[]
  readonly symlinks: readonly RuntimeManifestSymlinkEntry[]
  readonly tarBytes: number
}

type ArchivePathGraphNode = {
  readonly segment: string
  readonly comparisonKey: string
  readonly children: ArchivePathGraphNode[]
  terminalType?: 'directory' | 'file' | 'symlink'
}

type ArchivePassMode =
  | { readonly kind: 'prescan' }
  | {
      readonly kind: 'materialize'
      readonly runtimeRoot: string
      readonly capabilities: Map<string, RuntimeDirectoryCapability>
      readonly testOptions: RuntimeArchiveExtractionTestOptions
    }

export type RuntimeStagingVerificationSnapshot = {
  readonly kind: 'runtime_staging_verification_snapshot'
  readonly release: RuntimeReleaseAdmission['identity']
  readonly stagingRoot: string
  readonly runtimeRoot: string
  readonly stagingIdentity: RuntimeFileSystemIdentity
  readonly runtimeIdentity: RuntimeFileSystemIdentity
  readonly tree: {
    readonly fileCount: number
    readonly regularFileBytes: number
    readonly symlinkCount: number
  }
}

export type RuntimeArchiveExtractionInput = {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Uint8Array
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal?: AbortSignal
  readonly staging: RuntimeStagingIdentity
}

export type RuntimeMaterializedTreeVerificationInput = {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Uint8Array
  readonly expectedDevice: string
  readonly expectedOwnerUid: number
  readonly runtimeRoot: string
  readonly signal: AbortSignal
}

export type RuntimeMaterializedTreeVerificationSnapshot = {
  readonly runtimeIdentity: RuntimeFileSystemIdentity
  readonly tree: {
    readonly fileCount: number
    readonly regularFileBytes: number
    readonly symlinkCount: number
  }
}

/**
 * Package-private fault/race seam. Production callers must omit this argument.
 */
export type RuntimeArchiveExtractionTestOptions = {
  readonly afterPrescan?: () => Promise<void>
  /**
   * Runs after the directory worker has verified its kernel-held cwd and
   * immediately before the direct-leaf create operation.
   */
  readonly afterParentCapabilityCheck?: (input: {
    readonly operation: 'create'
    readonly path: string
    readonly type: 'directory' | 'file' | 'symlink'
  }) => Promise<void>
  readonly beforeEntryMaterialization?: (input: {
    readonly path: string
    readonly type: 'directory' | 'file' | 'symlink'
  }) => Promise<void>
  readonly beforeFinalFileVerification?: (input: {
    readonly path: string
  }) => Promise<void>
  readonly beforeFinalVerification?: () => Promise<void>
  readonly beforeStorageOperation?: (input: {
    readonly operation:
      | 'directory_create'
      | 'directory_chmod'
      | 'file_create'
      | 'file_write'
      | 'file_chmod'
      | 'file_sync'
      | 'symlink_create'
    readonly path: string
  }) => Promise<void>
}

/**
 * Turns one descriptor-bound archive into a point-in-time verification
 * snapshot of an unpublished staging tree. The archive is fully scanned
 * before the first recipient entry is created, and the returned tree is
 * independently re-read from disk. A later publisher must establish its
 * own lease and fresh readback rather than treating this snapshot as
 * durable path authority.
 */
export async function extractVerifiedRuntimeArchive(
  input: RuntimeArchiveExtractionInput,
  testOptions: RuntimeArchiveExtractionTestOptions = {},
): Promise<RuntimeStagingVerificationSnapshot> {
  assertExtractionNotCancelled(input.signal)
  assertInputBindings(input)
  const canonicalManifestBytes = Buffer.from(
    input.canonicalManifestBytes,
  )
  assertCanonicalManifestBytes(input.admission, canonicalManifestBytes)
  const plan = createArchivePlan(
    input.admission,
    canonicalManifestBytes,
  )
  await assertMutationAuthority(input)
  const stagingIdentity = await inspectOwnedEmptyStaging(input)
  const archive = await openVerifiedArchive(input)
  const retainedCapabilities: RuntimeDirectoryCapability[] = []
  let stagingCapability: RuntimeDirectoryCapability | undefined
  let runtimeRoot: string | undefined
  let recipientMutationStarted = false

  try {
    await runArchivePass(
      archive,
      input,
      plan,
      { kind: 'prescan' },
    )
    await testOptions.afterPrescan?.()
    await assertMutationAuthority(input)
    await assertOwnedEmptyStagingIdentity(
      input,
      stagingIdentity,
    )
    stagingCapability = await openDirectoryCapability({
      absolutePath: input.staging.path,
      identity: stagingIdentity,
      mode: 0o700,
      evidenceKind: 'runtime_staging_capability_unavailable',
    })
    retainedCapabilities.push(stagingCapability)

    runtimeRoot = path.join(
      input.staging.path,
      RUNTIME_RECIPIENT_NAME,
    )
    recipientMutationStarted = true
    const runtimeCapability = await createOwnedDirectory({
      absolutePath: runtimeRoot,
      expectedDevice: stagingIdentity.device,
      expectedOwnerUid:
        input.mutationAuthority.snapshot.expectedOwnerUid,
      leaf: RUNTIME_RECIPIENT_NAME,
      mode: 0o700,
      parent: stagingCapability,
      relativePath: '',
      retainedCapabilities,
      testOptions,
    })
    const capabilities = new Map<string, RuntimeDirectoryCapability>([
      ['', runtimeCapability],
    ])
    for (const directory of plan.directories) {
      const capability = await createPlannedDirectory(
        directory,
        runtimeRoot,
        input,
        stagingIdentity,
        capabilities,
        retainedCapabilities,
        testOptions,
      )
      capabilities.set(directory.path, capability)
    }

    await runArchivePass(archive, input, plan, {
      kind: 'materialize',
      runtimeRoot,
      capabilities,
      testOptions,
    })
    await createPlannedSymlinks(
      plan,
      runtimeRoot,
      input,
      stagingIdentity,
      capabilities,
      testOptions,
    )
    await testOptions.beforeFinalVerification?.()
    await assertFinalExtractionAuthority({
      input,
      stagingCapability,
      stagingIdentity,
    })
    const verified = await verifyMaterializedRuntime({
      admission: input.admission,
      canonicalManifestBytes,
      capabilities,
      plan,
      runtimeRoot,
      stagingCapability,
      stagingIdentity,
      expectedOwnerUid:
        input.mutationAuthority.snapshot.expectedOwnerUid,
      signal: input.signal,
      testOptions,
    })
    await assertFinalExtractionAuthority({
      input,
      stagingCapability,
      stagingIdentity,
    })
    return {
      kind: 'runtime_staging_verification_snapshot',
      release: input.admission.identity,
      stagingRoot: input.staging.path,
      runtimeRoot,
      stagingIdentity,
      runtimeIdentity: verified.runtimeIdentity,
      tree: {
        fileCount: input.admission.manifest.payload.file_count,
        regularFileBytes:
          input.admission.manifest.payload.regular_file_bytes,
        symlinkCount:
          input.admission.manifest.payload.symlink_count,
      },
    }
  } catch (error) {
    if (recipientMutationStarted) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_staging_residue_preserved',
        stagingPath: input.staging.path,
        cause: error,
      })
    }
    throw normalizeExtractionError(error)
  } finally {
    await archive.close().catch(() => undefined)
    await Promise.all(
      [...retainedCapabilities]
        .reverse()
        .map((capability) =>
          capability.close().catch(() => undefined),
        ),
    )
  }
}

/**
 * Reuses the extraction verifier against an already materialized Runtime
 * tree. Cache reuse, generation publish readback, and the spawn boundary
 * must all call this same complete-tree oracle rather than trust a receipt.
 */
export async function verifyMaterializedRuntimeTree(
  input: RuntimeMaterializedTreeVerificationInput,
): Promise<RuntimeMaterializedTreeVerificationSnapshot> {
  assertExtractionNotCancelled(input.signal)
  if (
    !path.isAbsolute(input.runtimeRoot) ||
    path.normalize(input.runtimeRoot) !== input.runtimeRoot ||
    path.basename(input.runtimeRoot) !== RUNTIME_RECIPIENT_NAME
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_generation_root_invalid',
    })
  }
  const canonicalManifestBytes = Buffer.from(
    input.canonicalManifestBytes,
  )
  assertCanonicalManifestBytes(input.admission, canonicalManifestBytes)
  const plan = createArchivePlan(
    input.admission,
    canonicalManifestBytes,
  )
  const parentRoot = path.dirname(input.runtimeRoot)
  const parentIdentity = await inspectOwnedDirectory(
    parentRoot,
    input.expectedOwnerUid,
    input.expectedDevice,
    0o700,
    'runtime_generation_parent',
  )
  const runtimeIdentity = await inspectOwnedDirectory(
    input.runtimeRoot,
    input.expectedOwnerUid,
    input.expectedDevice,
    0o700,
    'runtime_generation_runtime',
  )
  const retainedCapabilities: RuntimeDirectoryCapability[] = []
  try {
    const parentCapability = await openDirectoryCapability({
      absolutePath: parentRoot,
      identity: parentIdentity,
      mode: 0o700,
      evidenceKind: 'runtime_generation_parent_open_failed',
    })
    retainedCapabilities.push(parentCapability)
    const runtimeCapability = await openDirectoryCapability({
      absolutePath: input.runtimeRoot,
      identity: runtimeIdentity,
      mode: 0o700,
      evidenceKind: 'runtime_generation_runtime_open_failed',
    })
    retainedCapabilities.push(runtimeCapability)
    const capabilities = new Map<string, RuntimeDirectoryCapability>([
      ['', runtimeCapability],
    ])
    for (const directory of plan.directories) {
      assertExtractionNotCancelled(input.signal)
      const absolutePath = containedRuntimePath(
        input.runtimeRoot,
        directory.path,
      )
      const identity = await inspectOwnedDirectory(
        absolutePath,
        input.expectedOwnerUid,
        input.expectedDevice,
        0o755,
        'runtime_generation_directory',
      )
      const capability = await openDirectoryCapability({
        absolutePath,
        identity,
        mode: 0o755,
        evidenceKind: 'runtime_generation_directory_open_failed',
      })
      retainedCapabilities.push(capability)
      capabilities.set(directory.path, capability)
    }
    const verified = await verifyMaterializedRuntime({
      admission: input.admission,
      canonicalManifestBytes,
      capabilities,
      plan,
      runtimeRoot: input.runtimeRoot,
      stagingCapability: parentCapability,
      stagingIdentity: parentIdentity,
      expectedOwnerUid: input.expectedOwnerUid,
      signal: input.signal,
      testOptions: {},
    })
    assertExtractionNotCancelled(input.signal)
    if (!sameIdentity(runtimeIdentity, verified.runtimeIdentity)) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_generation_identity_changed',
      })
    }
    return {
      runtimeIdentity: verified.runtimeIdentity,
      tree: {
        fileCount: input.admission.manifest.payload.file_count,
        regularFileBytes:
          input.admission.manifest.payload.regular_file_bytes,
        symlinkCount:
          input.admission.manifest.payload.symlink_count,
      },
    }
  } finally {
    await Promise.all(
      retainedCapabilities
        .reverse()
        .map((capability) =>
          capability.close().catch(() => undefined),
        ),
    )
  }
}

function assertInputBindings(
  input: RuntimeArchiveExtractionInput,
): void {
  const expectedStaging = createRuntimeStagingIdentity(
    input.layout,
    input.staging.transactionNonce,
  )
  if (
    input.layout.identity.archiveSha256 !==
      input.admission.identity.archiveSha256 ||
    input.layout.identity.manifestSha256 !==
      input.admission.identity.manifestSha256 ||
    input.layout.identity.releaseId !==
      input.admission.identity.releaseId ||
    input.layout.identity.runtimeContractVersion !==
      input.admission.identity.runtimeContractVersion ||
    input.layout.identity.target !== input.admission.identity.target ||
    input.staging.kind !== 'staging' ||
    input.staging.path !== expectedStaging.path ||
    input.staging.transactionNonce !==
      expectedStaging.transactionNonce ||
    input.mutationAuthority.kind !==
      'runtime_cache_mutation_authority' ||
    input.mutationAuthority.snapshot.cacheRoot !==
      input.layout.cacheRoot ||
    input.mutationAuthority.snapshot.appDataRoot !==
      input.layout.appDataRoot
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_extraction_binding_mismatch',
    })
  }
}

function assertCanonicalManifestBytes(
  admission: RuntimeReleaseAdmission,
  canonicalManifestBytes: Buffer,
): void {
  const digest = sha256(canonicalManifestBytes)
  if (
    canonicalManifestBytes.byteLength !==
      admission.descriptor.manifest.bytes ||
    digest !== admission.descriptor.manifest.sha256 ||
    digest !== admission.identity.manifestSha256
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_manifest_binding_mismatch',
    })
  }
}

function createArchivePlan(
  admission: RuntimeReleaseAdmission,
  canonicalManifestBytes: Buffer,
): RuntimeArchivePlan {
  const directories = collectRequiredDirectories(
    admission.manifest.payload.entries,
  ).map(
    (entryPath): ArchiveDirectoryEntry => ({
      path: entryPath,
      type: 'directory',
      mode: 0o755,
      bytes: 0,
    }),
  )
  const manifestEntry: ArchiveManifestEntry = {
    path: 'manifest.json',
    type: 'file',
    mode: 0o644,
    bytes: canonicalManifestBytes.byteLength,
    sha256: sha256(canonicalManifestBytes),
  }
  const expectedEntries: ArchiveExpectedEntry[] = [
    ...directories,
    manifestEntry,
    ...admission.manifest.payload.entries,
  ]
  const entries = new Map<string, ArchiveExpectedEntry>()
  let tarBytes = TAR_TRAILER_BYTES
  for (const entry of expectedEntries) {
    if (entries.has(entry.path)) {
      throw runtimeAuthorityError('runtime_archive_unsafe', {
        kind: 'runtime_archive_plan_duplicate',
        path: entry.path,
      })
    }
    entries.set(entry.path, entry)
    const contentBytes = entry.type === 'file' ? entry.bytes : 0
    tarBytes = safeAdd(
      tarBytes,
      TAR_BLOCK_BYTES + paddedTarBytes(contentBytes),
      'runtime_archive_tar_bound_overflow',
    )
  }
  return {
    entries,
    directories,
    files: [
      manifestEntry,
      ...admission.manifest.payload.entries.filter(
        (
          entry,
        ): entry is RuntimeManifestFileEntry => entry.type === 'file',
      ),
    ],
    symlinks: admission.manifest.payload.entries.filter(
      (
        entry,
      ): entry is RuntimeManifestSymlinkEntry =>
        entry.type === 'symlink',
    ),
    tarBytes,
  }
}

function collectRequiredDirectories(
  entries: readonly RuntimeManifestEntry[],
): string[] {
  const directories = new Set<string>()
  for (const entry of entries) {
    let directory = path.posix.dirname(entry.path)
    while (directory !== '.') {
      directories.add(directory)
      directory = path.posix.dirname(directory)
    }
  }
  return [...directories].sort((left, right) => {
    const depth = left.split('/').length - right.split('/').length
    return depth === 0 ? compareUnicodeCodePoints(left, right) : depth
  })
}

async function assertMutationAuthority(
  input: RuntimeArchiveExtractionInput,
): Promise<void> {
  const current = await revalidateRuntimeCacheRootForMutation(
    input.mutationAuthority.snapshot,
  )
  const archiveNamespace =
    current.snapshot.namespaceIdentities.archives
  const stagingNamespace =
    current.snapshot.namespaceIdentities.staging
  if (
    current.snapshot.state !== 'present' ||
    archiveNamespace === undefined ||
    stagingNamespace === undefined ||
    archiveNamespace.device !== stagingNamespace.device ||
    path.dirname(input.layout.archive.path) !==
      input.layout.namespaces.archives ||
    path.dirname(input.staging.path) !==
      input.layout.namespaces.staging
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_cache_authority_invalid',
    })
  }
}

async function assertFinalExtractionAuthority(input: {
  readonly input: RuntimeArchiveExtractionInput
  readonly stagingCapability: RuntimeDirectoryCapability
  readonly stagingIdentity: RuntimeFileSystemIdentity
}): Promise<void> {
  await assertMutationAuthority(input.input)
  let capabilityStats: RuntimeCapabilityStats
  let pathStats: BigIntStats
  try {
    ;[capabilityStats, pathStats] = await Promise.all([
      input.stagingCapability.statDirectory(),
      lstat(input.input.staging.path, { bigint: true }),
    ])
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_staging_final_authority_unavailable',
      cause: error,
    })
  }
  const pathIdentity = identityFromStats(pathStats)
  if (
    capabilityStats.type !== 'directory' ||
    capabilityStats.mode !== 0o700 ||
    capabilityStats.nlink < 1 ||
    !sameIdentity(capabilityStats.identity, input.stagingIdentity) ||
    !pathStats.isDirectory() ||
    pathStats.isSymbolicLink() ||
    Number(pathStats.mode & 0o7777n) !== 0o700 ||
    !sameIdentity(pathIdentity, input.stagingIdentity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_staging_final_authority_changed',
    })
  }
}

async function inspectOwnedEmptyStaging(
  input: RuntimeArchiveExtractionInput,
): Promise<RuntimeFileSystemIdentity> {
  const identity = await inspectOwnedDirectory(
    input.staging.path,
    input.mutationAuthority.snapshot.expectedOwnerUid,
    input.mutationAuthority.snapshot.namespaceIdentities.staging
      ?.device,
    0o700,
    'runtime_staging',
  )
  let canonicalPath: string
  let entries: string[]
  try {
    ;[canonicalPath, entries] = await Promise.all([
      realpath(input.staging.path),
      readdir(input.staging.path),
    ])
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_staging_observation_failed',
      cause: error,
    })
  }
  if (
    canonicalPath !== input.staging.path ||
    entries.length !== 0
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_staging_not_owned_empty',
      path: input.staging.path,
    })
  }
  return identity
}

async function assertOwnedEmptyStagingIdentity(
  input: RuntimeArchiveExtractionInput,
  expectedIdentity: RuntimeFileSystemIdentity,
): Promise<void> {
  const current = await inspectOwnedEmptyStaging(input)
  if (!sameIdentity(current, expectedIdentity)) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_staging_identity_changed',
    })
  }
}

async function openVerifiedArchive(
  input: RuntimeArchiveExtractionInput,
): Promise<FileHandle> {
  let archive: FileHandle
  try {
    archive = await open(
      input.layout.archive.path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
  } catch (error) {
    if (isNodeError(error) && error.code === 'ELOOP') {
      throw runtimeAuthorityError('runtime_cache_unsafe', {
        kind: 'runtime_archive_path_is_symlink',
      })
    }
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_open_failed',
      cause: error,
    })
  }
  try {
    const stats = await archive.stat({ bigint: true })
    const expectedOwnerUid =
      input.mutationAuthority.snapshot.expectedOwnerUid
    const expectedDevice =
      input.mutationAuthority.snapshot.namespaceIdentities.archives
        ?.device
    const mode = Number(stats.mode & 0o7777n)
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      Number(stats.uid) !== expectedOwnerUid ||
      String(stats.dev) !== expectedDevice ||
      mode !== 0o600 ||
      stats.size !== BigInt(input.admission.descriptor.archive.bytes)
    ) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_file_identity_invalid',
      })
    }
    return archive
  } catch (error) {
    await archive.close().catch(() => undefined)
    throw error
  }
}

async function runArchivePass(
  archive: FileHandle,
  input: RuntimeArchiveExtractionInput,
  plan: RuntimeArchivePlan,
  mode: ArchivePassMode,
): Promise<void> {
  const observed = new Set<string>()
  const pathGraph = createArchivePathGraph()
  let entryCount = 0
  const archiveMeter = createMeter({
    limit: input.admission.descriptor.archive.bytes,
    hash: true,
    overflowKind: 'runtime_archive_compressed_bound_exceeded',
  })
  const tarMeter = createMeter({
    limit: plan.tarBytes,
    hash: false,
    overflowKind: 'runtime_archive_expanded_bound_exceeded',
  })
  const parser = extract({
    allowUnknownFormat: false,
    filenameEncoding: 'utf8',
  })
  const entryTasks = new Set<Promise<void>>()
  // streamx may emit the upstream destroy error after Node's pipeline has
  // removed its temporary listener. Keep one observer for that late event;
  // pipeline still owns the rejection delivered to this pass.
  parser.on('error', () => undefined)
  parser.on('entry', (header, entry, next) => {
    entry.on('error', () => undefined)
    const task = handleArchiveEntry({
      header,
      entry,
      next,
      input,
      plan,
      mode,
      observed,
      pathGraph,
      entryNumber: ++entryCount,
      parserDestroyed: () => parser.destroyed,
    })
    entryTasks.add(task)
    void task.then(
      () => entryTasks.delete(task),
      () => entryTasks.delete(task),
    )
  })
  const archiveStream = archive.createReadStream({
    start: 0,
    end: input.admission.descriptor.archive.bytes - 1,
    autoClose: false,
  })
  const gunzip = createGunzip()
  const rawHeaderAudit = createRawTarHeaderAudit(plan.entries.size)
  for (const stream of [
    archiveStream,
    archiveMeter.stream,
    gunzip,
    tarMeter.stream,
    rawHeaderAudit,
  ]) {
    stream.on('error', () => undefined)
  }

  let passError: RuntimeReleaseAuthorityError | undefined
  try {
    await pipeline(
      archiveStream,
      archiveMeter.stream,
      gunzip,
      tarMeter.stream,
      rawHeaderAudit,
      parser,
    )
  } catch (error) {
    passError = normalizeArchivePassError(error)
  }
  const entryResults = await Promise.allSettled([...entryTasks])
  const rejectedEntry = entryResults.find(
    (
      result,
    ): result is PromiseRejectedResult =>
      result.status === 'rejected',
  )
  if (rejectedEntry !== undefined) {
    throw normalizeArchivePassError(rejectedEntry.reason)
  }
  if (passError !== undefined) throw passError

  if (
    archiveMeter.bytes() !==
      input.admission.descriptor.archive.bytes ||
    archiveMeter.digest() !==
      input.admission.descriptor.archive.sha256
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_outer_binding_mismatch',
    })
  }
  if (tarMeter.bytes() !== plan.tarBytes) {
    throw runtimeAuthorityError('runtime_archive_unsafe', {
      kind: 'runtime_archive_noncanonical_tar_size',
    })
  }
  if (
    entryCount !== plan.entries.size ||
    observed.size !== plan.entries.size
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_member_roster_incomplete',
    })
  }
}

function createRawTarHeaderAudit(expectedEntryCount: number): Transform {
  let pending = Buffer.alloc(0)
  let bodyBlocks = 0
  let entryCount = 0
  let zeroBlocks = 0
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      try {
        pending = Buffer.concat([pending, chunk])
        while (pending.byteLength >= TAR_BLOCK_BYTES) {
          const block = pending.subarray(0, TAR_BLOCK_BYTES)
          pending = pending.subarray(TAR_BLOCK_BYTES)
          if (bodyBlocks > 0) {
            bodyBlocks -= 1
          } else if (block.every((byte) => byte === 0)) {
            zeroBlocks += 1
            if (zeroBlocks > 2) {
              throw unsafeArchive(
                'runtime_archive_trailing_tar_data',
              )
            }
          } else {
            if (zeroBlocks > 0) {
              throw unsafeArchive(
                'runtime_archive_nonzero_after_trailer',
              )
            }
            entryCount += 1
            if (entryCount > expectedEntryCount) {
              throw unsafeArchive(
                'runtime_archive_entry_count_exceeded',
              )
            }
            assertCanonicalTarHeader(block)
            const size = decodeCanonicalTarSize(block)
            bodyBlocks = Math.ceil(size / TAR_BLOCK_BYTES)
          }
          this.push(block)
        }
        callback()
      } catch (error) {
        callback(error as Error)
      }
    },
    flush(callback) {
      if (
        pending.byteLength !== 0 ||
        bodyBlocks !== 0 ||
        zeroBlocks !== 2
      ) {
        callback(
          runtimeAuthorityError('runtime_integrity_failed', {
            kind: 'runtime_archive_tar_truncated',
          }),
        )
        return
      }
      if (entryCount !== expectedEntryCount) {
        callback(
          runtimeAuthorityError('runtime_integrity_failed', {
            kind: 'runtime_archive_member_roster_incomplete',
          }),
        )
        return
      }
      callback()
    },
  })
}

function assertCanonicalTarHeader(header: Buffer): void {
  for (const [start, end] of [
    [0, 100],
    [157, 257],
    [265, 297],
    [297, 329],
    [345, 500],
  ] as const) {
    assertCanonicalTarTextField(header.subarray(start, end))
  }
  const typeflag = header[156]
  if (
    typeflag !== 0 &&
    typeflag !== '0'.charCodeAt(0) &&
    typeflag !== '2'.charCodeAt(0) &&
    typeflag !== '5'.charCodeAt(0)
  ) {
    throw unsafeArchive('runtime_archive_tar_type_unsupported')
  }
}

function assertCanonicalTarTextField(field: Buffer): void {
  const firstNul = field.indexOf(0)
  if (
    firstNul !== -1 &&
    field
      .subarray(firstNul + 1)
      .some((byte) => byte !== 0)
  ) {
    throw unsafeArchive(
      'runtime_archive_tar_text_field_noncanonical',
    )
  }
}

function decodeCanonicalTarSize(header: Buffer): number {
  const field = header.subarray(124, 136)
  if (
    field[11] !== 0x20 ||
    field
      .subarray(0, 11)
      .some((byte) => byte < 0x30 || byte > 0x37)
  ) {
    throw unsafeArchive('runtime_archive_tar_size_noncanonical')
  }
  const value = Number.parseInt(
    field.subarray(0, 11).toString('ascii'),
    8,
  )
  if (!Number.isSafeInteger(value) || value < 0) {
    throw unsafeArchive('runtime_archive_tar_size_invalid')
  }
  return value
}

async function handleArchiveEntry(input: {
  readonly header: Headers
  readonly entry: Readable
  readonly next: (error?: unknown) => void
  readonly input: RuntimeArchiveExtractionInput
  readonly plan: RuntimeArchivePlan
  readonly mode: ArchivePassMode
  readonly observed: Set<string>
  readonly pathGraph: ReturnType<typeof createArchivePathGraph>
  readonly entryNumber: number
  readonly parserDestroyed: () => boolean
}): Promise<void> {
  try {
    if (input.entryNumber > input.plan.entries.size) {
      throw unsafeArchive('runtime_archive_entry_count_exceeded')
    }
    const entryPath = decodeArchiveEntryPath(input.header)
    input.pathGraph.insert(
      entryPath,
      input.header.type as 'directory' | 'file' | 'symlink',
    )
    if (input.observed.has(entryPath)) {
      throw unsafeArchive('runtime_archive_duplicate_path', entryPath)
    }
    input.observed.add(entryPath)
    const expected = input.plan.entries.get(entryPath)
    if (expected === undefined) {
      throw unsafeArchive('runtime_archive_unexpected_path', entryPath)
    }
    assertSafeHeader(input.header, expected)
    if (expected.type === 'file') {
      if (input.mode.kind === 'prescan') {
        await consumeAndVerifyFile(
          input.entry,
          expected,
          undefined,
        )
      } else {
        await materializeFile(
          input.entry,
          expected,
          input.mode,
          input.input,
        )
      }
    } else {
      await consumeEmptyEntry(input.entry)
    }
    input.next()
  } catch (error) {
    if (!input.parserDestroyed()) input.next(error)
    throw error
  }
}

function createArchivePathGraph(): {
  readonly insert: (
    entryPath: string,
    type: 'directory' | 'file' | 'symlink',
  ) => void
} {
  const root: ArchivePathGraphNode = {
    segment: '',
    comparisonKey: '',
    children: [],
  }
  return {
    insert(entryPath, type) {
      let cursor = root
      for (const segment of entryPath.split('/')) {
        if (
          cursor.terminalType === 'file' ||
          cursor.terminalType === 'symlink'
        ) {
          throw unsafeArchive(
            'runtime_archive_path_prefix_conflict',
          )
        }
        const comparisonKey = macOSFilenameComparisonKey(segment)
        let child = cursor.children.find(
          (candidate) =>
            MACOS_FILENAME_COLLATOR.compare(
              candidate.comparisonKey,
              comparisonKey,
            ) === 0,
        )
        if (child === undefined) {
          child = {
            segment,
            comparisonKey,
            children: [],
          }
          cursor.children.push(child)
        } else if (child.segment !== segment) {
          throw unsafeArchive(
            'runtime_archive_path_fold_collision',
          )
        }
        cursor = child
      }
      if (cursor.terminalType !== undefined) {
        throw unsafeArchive('runtime_archive_duplicate_path')
      }
      if (type !== 'directory' && cursor.children.length > 0) {
        throw unsafeArchive(
          'runtime_archive_path_prefix_conflict',
        )
      }
      cursor.terminalType = type
    },
  }
}

function macOSFilenameComparisonKey(value: string): string {
  let current = value
  for (let pass = 0; pass < MAX_FULL_CASE_FOLD_PASSES; pass += 1) {
    const folded = current.toUpperCase().toLowerCase()
    if (folded === current) return current
    current = folded
  }
  throw unsafeArchive('runtime_archive_path_fold_unstable')
}

function decodeArchiveEntryPath(header: Headers): string {
  if (
    typeof header.name !== 'string' ||
    typeof header.type !== 'string'
  ) {
    throw unsafeArchive('runtime_archive_header_invalid')
  }
  let entryPath = header.name
  if (header.type === 'directory') {
    if (entryPath.endsWith('/')) entryPath = entryPath.slice(0, -1)
  } else if (entryPath.endsWith('/')) {
    throw unsafeArchive('runtime_archive_path_invalid')
  }
  if (!isSafeArchivePath(entryPath)) {
    throw unsafeArchive('runtime_archive_path_invalid')
  }
  return entryPath
}

function isSafeArchivePath(value: string): boolean {
  if (
    value.length === 0 ||
    value.includes('\0') ||
    value.includes('\\') ||
    value.startsWith('/') ||
    value.normalize('NFC') !== value ||
    Buffer.byteLength(value, 'utf8') > 1024 ||
    path.posix.normalize(value) !== value
  ) {
    return false
  }
  return value.split('/').every(
    (segment) =>
      segment !== '' &&
      segment !== '.' &&
      segment !== '..' &&
      Buffer.byteLength(segment, 'utf8') <= 255,
  )
}

function assertSafeHeader(
  header: Headers,
  expected: ArchiveExpectedEntry,
): void {
  const headerWithPax = header as Headers & {
    readonly pax?: Record<string, string> | null
  }
  const expectedType =
    expected.type === 'file'
      ? 'file'
      : expected.type === 'symlink'
        ? 'symlink'
        : 'directory'
  const expectedMode =
    expected.type === 'file'
      ? fileMode(expected)
      : expected.type === 'symlink'
        ? 0o777
        : expected.mode
  const expectedSize = expected.type === 'file' ? expected.bytes : 0
  if (
    header.type !== expectedType ||
    header.mode !== expectedMode ||
    header.size !== expectedSize ||
    headerWithPax.pax !== null ||
    !Number.isSafeInteger(header.uid) ||
    !Number.isSafeInteger(header.gid) ||
    Number(header.uid) < 0 ||
    Number(header.gid) < 0 ||
    (header.devmajor !== undefined && header.devmajor !== 0) ||
    (header.devminor !== undefined && header.devminor !== 0)
  ) {
    throw unsafeArchive('runtime_archive_header_policy_failed')
  }
  if (expected.type === 'symlink') {
    if (
      header.linkname !== expected.target ||
      !isSafeSymlinkTarget(expected.path, expected.target)
    ) {
      throw unsafeArchive('runtime_archive_symlink_target_unsafe')
    }
  } else if (
    header.linkname !== null &&
    header.linkname !== undefined &&
    header.linkname !== ''
  ) {
    throw unsafeArchive('runtime_archive_link_metadata_unsafe')
  }
}

function isSafeSymlinkTarget(
  entryPath: string,
  target: string,
): boolean {
  if (
    target.length === 0 ||
    target.includes('\0') ||
    target.includes('\\') ||
    path.posix.isAbsolute(target) ||
    target.normalize('NFC') !== target ||
    path.posix.normalize(target) !== target
  ) {
    return false
  }
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(entryPath), target),
  )
  return (
    resolved !== '..' &&
    !resolved.startsWith('../') &&
    !path.posix.isAbsolute(resolved)
  )
}

async function consumeAndVerifyFile(
  entry: Readable,
  expected: RuntimeManifestFileEntry | ArchiveManifestEntry,
  output:
    | {
        write(chunk: Buffer): Promise<void>
      }
    | undefined,
): Promise<void> {
  const hash = createHash('sha256')
  let bytes = 0
  for await (const value of entry) {
    const chunk = Buffer.from(value)
    bytes = safeAdd(
      bytes,
      chunk.byteLength,
      'runtime_archive_file_bound_overflow',
    )
    if (bytes > expected.bytes) {
      throw unsafeArchive('runtime_archive_file_bound_exceeded')
    }
    hash.update(chunk)
    if (output !== undefined) await output.write(chunk)
  }
  if (
    bytes !== expected.bytes ||
    hash.digest('hex') !== expected.sha256
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_entry_integrity_mismatch',
      path: expected.path,
    })
  }
}

async function consumeEmptyEntry(entry: Readable): Promise<void> {
  let bytes = 0
  for await (const value of entry) {
    bytes += Buffer.byteLength(value)
    if (bytes > 0) {
      throw unsafeArchive('runtime_archive_non_file_has_content')
    }
  }
}

async function createPlannedDirectory(
  directory: ArchiveDirectoryEntry,
  runtimeRoot: string,
  input: RuntimeArchiveExtractionInput,
  stagingIdentity: RuntimeFileSystemIdentity,
  capabilities: Map<string, RuntimeDirectoryCapability>,
  retainedCapabilities: RuntimeDirectoryCapability[],
  testOptions: RuntimeArchiveExtractionTestOptions,
): Promise<RuntimeDirectoryCapability> {
  const parentPath = path.posix.dirname(directory.path)
  const parent = capabilities.get(
    parentPath === '.' ? '' : parentPath,
  )
  if (parent === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_parent_identity_missing',
    })
  }
  const absolutePath = containedRuntimePath(
    runtimeRoot,
    directory.path,
  )
  return createOwnedDirectory({
    absolutePath,
    expectedDevice: stagingIdentity.device,
    expectedOwnerUid:
      input.mutationAuthority.snapshot.expectedOwnerUid,
    leaf: path.posix.basename(directory.path),
    mode: directory.mode,
    parent,
    relativePath: directory.path,
    retainedCapabilities,
    testOptions,
  })
}

async function createOwnedDirectory(
  input: {
    readonly absolutePath: string
    readonly expectedDevice: string
    readonly expectedOwnerUid: number
    readonly leaf: string
    readonly mode: 0o700 | 0o755
    readonly parent: RuntimeDirectoryCapability
    readonly relativePath: string
    readonly retainedCapabilities: RuntimeDirectoryCapability[]
    readonly testOptions: RuntimeArchiveExtractionTestOptions
  },
): Promise<RuntimeDirectoryCapability> {
  await input.testOptions.beforeEntryMaterialization?.({
    path: input.relativePath,
    type: 'directory',
  })
  const createdDirectory = await runStorageOperation(
    input.testOptions,
    'directory_create',
    input.relativePath,
    'runtime_archive_directory_create_failed',
    () =>
      input.parent.createDirectory(
        input.leaf,
        input.mode,
        () =>
          input.testOptions.afterParentCapabilityCheck?.({
            operation: 'create',
            path: input.relativePath,
            type: 'directory',
          }) ?? Promise.resolve(),
      ),
  )
  const identity = assertNewCapabilityEntry(
    createdDirectory.stats,
    input.absolutePath,
    'directory',
    input.expectedOwnerUid,
    input.expectedDevice,
  )
  let handleOpen = true
  let finalStats: RuntimeCapabilityStats
  try {
    finalStats = await runStorageOperation(
      input.testOptions,
      'directory_chmod',
      input.relativePath,
      'runtime_archive_directory_mode_failed',
      () =>
        input.parent.finishDirectory(
          createdDirectory.handle,
          input.mode,
        ),
    )
    handleOpen = false
  } finally {
    if (handleOpen) {
      await input.parent
        .closeHandle(createdDirectory.handle)
        .catch(() => undefined)
    }
  }
  assertCapabilityEntry(
    finalStats,
    input.absolutePath,
    'directory',
    input.expectedOwnerUid,
    input.expectedDevice,
    input.mode,
    identity,
    'runtime_archive_new_directory_identity_invalid',
  )
  const capability = await openDirectoryCapability({
    absolutePath: input.absolutePath,
    identity,
    mode: input.mode,
    evidenceKind: 'runtime_archive_new_directory_open_failed',
  })
  input.retainedCapabilities.push(capability)
  return capability
}

async function openDirectoryCapability(input: {
  readonly absolutePath: string
  readonly identity: RuntimeFileSystemIdentity
  readonly mode: 0o700 | 0o755
  readonly evidenceKind: string
}): Promise<RuntimeDirectoryCapability> {
  try {
    return await RuntimeDirectoryCapability.open(input)
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: input.evidenceKind,
      cause: error,
    })
  }
}

async function runStorageOperation<T>(
  testOptions: RuntimeArchiveExtractionTestOptions,
  operation:
    | 'directory_create'
    | 'directory_chmod'
    | 'file_create'
    | 'file_write'
    | 'file_chmod'
    | 'file_sync'
    | 'symlink_create',
  entryPath: string,
  evidenceKind: string,
  action: () => Promise<T>,
): Promise<T> {
  try {
    await testOptions.beforeStorageOperation?.({
      operation,
      path: entryPath,
    })
    return await action()
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: evidenceKind,
      path: entryPath,
      cause: error,
    })
  }
}

function assertNewCapabilityEntry(
  stats: RuntimeCapabilityStats,
  absolutePath: string,
  expectedType: 'directory' | 'file' | 'symlink',
  expectedOwnerUid: number,
  expectedDevice: string,
): RuntimeFileSystemIdentity {
  if (
    !matchesCapabilityEntry({
      stats,
      expectedType,
      expectedOwnerUid,
      expectedDevice,
    })
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_new_entry_identity_invalid',
      path: absolutePath,
      stats,
    })
  }
  return stats.identity
}

function assertCapabilityEntry(
  stats: RuntimeCapabilityStats,
  absolutePath: string,
  expectedType: 'directory' | 'file' | 'symlink',
  expectedOwnerUid: number,
  expectedDevice: string,
  expectedMode: number,
  expectedIdentity: RuntimeFileSystemIdentity,
  evidenceKind: string,
): RuntimeFileSystemIdentity {
  if (
    !matchesCapabilityEntry({
      stats,
      expectedType,
      expectedOwnerUid,
      expectedDevice,
      expectedMode,
      expectedIdentity,
    })
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
      path: absolutePath,
      stats,
    })
  }
  return stats.identity
}

function assertVerifiedCapabilityEntry(
  stats: RuntimeCapabilityStats,
  absolutePath: string,
  expectedType: 'directory' | 'file' | 'symlink',
  expectedOwnerUid: number,
  expectedDevice: string,
  expectedMode?: number,
  expectedIdentity?: RuntimeFileSystemIdentity,
): RuntimeFileSystemIdentity {
  if (
    !matchesCapabilityEntry({
      stats,
      expectedType,
      expectedOwnerUid,
      expectedDevice,
      expectedMode,
      expectedIdentity,
    })
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_extracted_entry_identity_invalid',
      path: absolutePath,
      stats,
    })
  }
  return stats.identity
}

function matchesCapabilityEntry(input: {
  readonly stats: RuntimeCapabilityStats
  readonly expectedType: 'directory' | 'file' | 'symlink'
  readonly expectedOwnerUid: number
  readonly expectedDevice: string
  readonly expectedMode?: number
  readonly expectedIdentity?: RuntimeFileSystemIdentity
}): boolean {
  const {
    stats,
    expectedType,
    expectedOwnerUid,
    expectedDevice,
    expectedMode,
    expectedIdentity,
  } = input
  return (
    stats.type === expectedType &&
    stats.identity.ownerUid === expectedOwnerUid &&
    stats.identity.device === expectedDevice &&
    (expectedMode === undefined || stats.mode === expectedMode) &&
    (expectedIdentity === undefined ||
      sameIdentity(stats.identity, expectedIdentity)) &&
    (expectedType === 'directory'
      ? stats.nlink >= 1
      : stats.nlink === 1)
  )
}

async function observeCapability<T>(
  evidenceKind: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: evidenceKind,
      cause: error,
    })
  }
}

async function materializeFile(
  entry: Readable,
  expected: RuntimeManifestFileEntry | ArchiveManifestEntry,
  mode: Extract<ArchivePassMode, { kind: 'materialize' }>,
  input: RuntimeArchiveExtractionInput,
): Promise<void> {
  await mode.testOptions.beforeEntryMaterialization?.({
    path: expected.path,
    type: 'file',
  })
  const parentRelative = path.posix.dirname(expected.path)
  const parent = mode.capabilities.get(
    parentRelative === '.' ? '' : parentRelative,
  )
  if (parent === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_file_parent_missing',
    })
  }
  const filePath = containedRuntimePath(
    mode.runtimeRoot,
    expected.path,
  )
  const leaf = path.posix.basename(expected.path)
  const opened = await runStorageOperation(
    mode.testOptions,
    'file_create',
    expected.path,
    'runtime_archive_file_create_failed',
    () =>
      parent.openFile(
        leaf,
        fileMode(expected),
        () =>
          mode.testOptions.afterParentCapabilityCheck?.({
            operation: 'create',
            path: expected.path,
            type: 'file',
          }) ?? Promise.resolve(),
      ),
  )
  const identity = assertNewCapabilityEntry(
    opened.stats,
    filePath,
    'file',
    input.mutationAuthority.snapshot.expectedOwnerUid,
    parent.identity.device,
  )
  let handleOpen = true
  try {
    await consumeAndVerifyFile(entry, expected, {
      write: async (chunk) => {
        const bytesWritten = await runStorageOperation(
          mode.testOptions,
          'file_write',
          expected.path,
          'runtime_archive_file_write_failed',
          () => parent.writeFile(opened.handle, chunk),
        )
        if (bytesWritten !== chunk.byteLength) {
          throw runtimeAuthorityError(
            'runtime_storage_unavailable',
            {
              kind: 'runtime_archive_file_short_write',
              path: expected.path,
            },
          )
        }
      },
    })
    await runStorageOperation(
      mode.testOptions,
      'file_chmod',
      expected.path,
      'runtime_archive_file_mode_failed',
      () => parent.chmodFile(opened.handle, fileMode(expected)),
    )
    await runStorageOperation(
      mode.testOptions,
      'file_sync',
      expected.path,
      'runtime_archive_file_sync_failed',
      () => parent.syncFile(opened.handle),
    )
    const stats = await parent.finishFile(opened.handle)
    handleOpen = false
    assertCapabilityEntry(
      stats,
      filePath,
      'file',
      input.mutationAuthority.snapshot.expectedOwnerUid,
      parent.identity.device,
      fileMode(expected),
      identity,
      'runtime_archive_new_file_identity_invalid',
    )
  } finally {
    if (handleOpen) {
      await parent.closeHandle(opened.handle).catch(() => undefined)
    }
  }
}

async function createPlannedSymlinks(
  plan: RuntimeArchivePlan,
  runtimeRoot: string,
  input: RuntimeArchiveExtractionInput,
  stagingIdentity: RuntimeFileSystemIdentity,
  capabilities: Map<string, RuntimeDirectoryCapability>,
  testOptions: RuntimeArchiveExtractionTestOptions,
): Promise<void> {
  for (const expected of orderSymlinks(plan.symlinks)) {
    await testOptions.beforeEntryMaterialization?.({
      path: expected.path,
      type: 'symlink',
    })
    const parentRelative = path.posix.dirname(expected.path)
    const parent = capabilities.get(
      parentRelative === '.' ? '' : parentRelative,
    )
    if (parent === undefined) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_symlink_parent_missing',
      })
    }
    const destination = containedRuntimePath(
      runtimeRoot,
      expected.path,
    )
    const lexicalTarget = path.resolve(
      path.dirname(destination),
      expected.target,
    )
    if (!isContained(runtimeRoot, lexicalTarget)) {
      throw unsafeArchive('runtime_archive_symlink_target_unsafe')
    }
    assertPlannedSymlinkTarget(plan, expected)
    const leaf = path.posix.basename(expected.path)
    const stats = await runStorageOperation(
      testOptions,
      'symlink_create',
      expected.path,
      'runtime_archive_symlink_create_failed',
      () =>
        parent.createSymlink(
          leaf,
          expected.target,
          () =>
            testOptions.afterParentCapabilityCheck?.({
              operation: 'create',
              path: expected.path,
              type: 'symlink',
            }) ?? Promise.resolve(),
        ),
    )
    assertNewCapabilityEntry(
      stats,
      destination,
      'symlink',
      input.mutationAuthority.snapshot.expectedOwnerUid,
      stagingIdentity.device,
    )
  }
}

function orderSymlinks(
  symlinks: readonly RuntimeManifestSymlinkEntry[],
): RuntimeManifestSymlinkEntry[] {
  const byPath = new Map(
    symlinks.map((entry) => [entry.path, entry] as const),
  )
  const ordered: RuntimeManifestSymlinkEntry[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (entry: RuntimeManifestSymlinkEntry): void => {
    if (visited.has(entry.path)) return
    if (visiting.has(entry.path)) {
      throw unsafeArchive('runtime_archive_symlink_cycle')
    }
    visiting.add(entry.path)
    const target = path.posix.normalize(
      path.posix.join(path.posix.dirname(entry.path), entry.target),
    )
    const targetEntry = byPath.get(target)
    if (targetEntry !== undefined) visit(targetEntry)
    visiting.delete(entry.path)
    visited.add(entry.path)
    ordered.push(entry)
  }
  for (const entry of symlinks) visit(entry)
  return ordered
}

function assertPlannedSymlinkTarget(
  plan: RuntimeArchivePlan,
  symlink: RuntimeManifestSymlinkEntry,
): void {
  const visited = new Set<string>([symlink.path])
  let target = resolvePlannedSymlinkTarget(
    symlink.path,
    symlink.target,
  )
  while (true) {
    const targetEntry = plan.entries.get(target)
    if (targetEntry === undefined) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_symlink_target_missing',
        path: symlink.path,
      })
    }
    if (targetEntry.type !== 'symlink') return
    if (visited.has(targetEntry.path)) {
      throw unsafeArchive(
        'runtime_archive_symlink_cycle',
        symlink.path,
      )
    }
    visited.add(targetEntry.path)
    target = resolvePlannedSymlinkTarget(
      targetEntry.path,
      targetEntry.target,
    )
  }
}

function resolvePlannedSymlinkTarget(
  entryPath: string,
  target: string,
): string {
  if (!isSafeSymlinkTarget(entryPath, target)) {
    throw unsafeArchive(
      'runtime_archive_symlink_target_unsafe',
      entryPath,
    )
  }
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(entryPath), target),
  )
  if (
    resolved === '.' ||
    resolved === '..' ||
    resolved.startsWith('../') ||
    path.posix.isAbsolute(resolved)
  ) {
    throw unsafeArchive(
      'runtime_archive_symlink_target_unsafe',
      entryPath,
    )
  }
  return resolved
}

async function verifyMaterializedRuntime(input: {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Buffer
  readonly capabilities: ReadonlyMap<
    string,
    RuntimeDirectoryCapability
  >
  readonly plan: RuntimeArchivePlan
  readonly runtimeRoot: string
  readonly stagingCapability: RuntimeDirectoryCapability
  readonly stagingIdentity: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
  readonly signal?: AbortSignal
  readonly testOptions: RuntimeArchiveExtractionTestOptions
}): Promise<{ readonly runtimeIdentity: RuntimeFileSystemIdentity }> {
  assertExtractionNotCancelled(input.signal)
  const runtimeCapability = input.capabilities.get('')
  if (runtimeCapability === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_recipient_capability_missing',
    })
  }
  const stagingRuntime = await observeCapability(
    'runtime_archive_recipient_parent_observation_failed',
    () =>
      input.stagingCapability.inspectLeaf(
        RUNTIME_RECIPIENT_NAME,
      ),
  )
  if (stagingRuntime === undefined) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_recipient_missing',
    })
  }
  const runtimeIdentity = assertVerifiedCapabilityEntry(
    stagingRuntime,
    input.runtimeRoot,
    'directory',
    input.expectedOwnerUid,
    input.stagingIdentity.device,
    0o700,
    runtimeCapability.identity,
  )
  assertVerifiedCapabilityEntry(
    await observeCapability(
      'runtime_archive_recipient_observation_failed',
      () => runtimeCapability.statDirectory(),
    ),
    input.runtimeRoot,
    'directory',
    input.expectedOwnerUid,
    input.stagingIdentity.device,
    0o700,
    runtimeCapability.identity,
  )
  const observed = new Set<string>()
  await visitMaterializedDirectory(
    '',
    runtimeCapability,
    input,
    observed,
  )
  assertVerifiedCapabilityEntry(
    await observeCapability(
      'runtime_archive_recipient_observation_failed',
      () => runtimeCapability.statDirectory(),
    ),
    input.runtimeRoot,
    'directory',
    input.expectedOwnerUid,
    input.stagingIdentity.device,
    0o700,
    runtimeIdentity,
  )
  if (
    observed.size !== input.plan.entries.size ||
    [...input.plan.entries.keys()].some(
      (entryPath) => !observed.has(entryPath),
    )
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_extracted_roster_mismatch',
    })
  }
  const topLevel = [
    ...(await observeCapability(
      'runtime_archive_top_level_observation_failed',
      () => runtimeCapability.readDirectory(),
    )),
  ].sort(compareUnicodeCodePoints)
  if (
    topLevel.length !== REQUIRED_RUNTIME_TOP_LEVEL.length ||
    topLevel.some(
      (entry, index) =>
        entry !==
        [...REQUIRED_RUNTIME_TOP_LEVEL].sort(
          compareUnicodeCodePoints,
        )[index],
    )
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_top_level_roster_mismatch',
    })
  }
  for (const selected of [
    input.admission.manifest.launch.python_executable,
    input.admission.manifest.launch.bridge_entrypoint,
    input.admission.manifest.launch.native_executable,
  ]) {
    const expected = input.plan.entries.get(selected)
    if (expected?.type !== 'file') {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_selected_file_invalid',
      })
    }
  }
  return { runtimeIdentity }
}

async function visitMaterializedDirectory(
  relativeRoot: string,
  capability: RuntimeDirectoryCapability,
  input: Parameters<typeof verifyMaterializedRuntime>[0],
  observed: Set<string>,
): Promise<void> {
  assertExtractionNotCancelled(input.signal)
  const names = [
    ...(await observeCapability(
      'runtime_archive_directory_observation_failed',
      () => capability.readDirectory(),
    )),
  ].sort(compareUnicodeCodePoints)
  for (const name of names) {
    assertExtractionNotCancelled(input.signal)
    const relative = relativeRoot
      ? path.posix.join(relativeRoot, name)
      : name
    const expected = input.plan.entries.get(relative)
    if (expected === undefined || observed.has(relative)) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_extracted_entry_unexpected',
        path: relative,
      })
    }
    observed.add(relative)
    const absolute = containedRuntimePath(input.runtimeRoot, relative)
    const stats = await observeCapability(
      'runtime_archive_entry_observation_failed',
      () => capability.inspectLeaf(name),
    )
    if (stats === undefined) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_extracted_entry_missing',
        path: relative,
      })
    }
    if (expected.type === 'directory') {
      const childCapability = input.capabilities.get(relative)
      if (childCapability === undefined) {
        throw runtimeAuthorityError('runtime_recovery_required', {
          kind: 'runtime_archive_directory_capability_missing',
          path: relative,
        })
      }
      const directoryIdentity = assertVerifiedCapabilityEntry(
        stats,
        absolute,
        'directory',
        input.expectedOwnerUid,
        input.stagingIdentity.device,
        expected.mode,
        childCapability.identity,
      )
      assertVerifiedCapabilityEntry(
        await observeCapability(
          'runtime_archive_directory_observation_failed',
          () => childCapability.statDirectory(),
        ),
        absolute,
        'directory',
        input.expectedOwnerUid,
        input.stagingIdentity.device,
        expected.mode,
        directoryIdentity,
      )
      await visitMaterializedDirectory(
        relative,
        childCapability,
        input,
        observed,
      )
      assertVerifiedCapabilityEntry(
        await observeCapability(
          'runtime_archive_directory_observation_failed',
          () => childCapability.statDirectory(),
        ),
        absolute,
        'directory',
        input.expectedOwnerUid,
        input.stagingIdentity.device,
        expected.mode,
        directoryIdentity,
      )
      continue
    }
    if (expected.type === 'file') {
      await verifyMaterializedFile(
        capability,
        name,
        absolute,
        expected,
        input,
      )
      continue
    }
    const observedSymlink = await observeCapability(
      'runtime_archive_symlink_observation_failed',
      () => capability.readSymlink(name),
    )
    assertVerifiedCapabilityEntry(
      observedSymlink.stats,
      absolute,
      'symlink',
      input.expectedOwnerUid,
      input.stagingIdentity.device,
    )
    if (observedSymlink.target !== expected.target) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_extracted_symlink_mismatch',
        path: relative,
      })
    }
    assertPlannedSymlinkTarget(input.plan, expected)
  }
}

async function verifyMaterializedFile(
  parent: RuntimeDirectoryCapability,
  leaf: string,
  absolute: string,
  expected: RuntimeManifestFileEntry | ArchiveManifestEntry,
  input: Parameters<typeof verifyMaterializedRuntime>[0],
): Promise<void> {
  assertExtractionNotCancelled(input.signal)
  const opened = await observeCapability(
    'runtime_archive_extracted_file_open_failed',
    () => parent.openVerifiedFile(leaf),
  )
  let handleOpen = true
  try {
    const identity = assertVerifiedCapabilityEntry(
      opened.stats,
      absolute,
      'file',
      input.expectedOwnerUid,
      input.stagingIdentity.device,
      fileMode(expected),
    )
    if (opened.stats.size !== String(expected.bytes)) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_extracted_file_size_mismatch',
        path: expected.path,
      })
    }
    await input.testOptions.beforeFinalFileVerification?.({
      path: expected.path,
    })
    const verified = await observeCapability(
      'runtime_archive_extracted_file_read_failed',
      () =>
        parent.hashVerifiedFile(opened.handle, expected.bytes),
    )
    assertExtractionNotCancelled(input.signal)
    handleOpen = false
    assertVerifiedMaterializedFileRead({
      absolute,
      expected,
      expectedDevice: input.stagingIdentity.device,
      expectedIdentity: identity,
      expectedOwnerUid: input.expectedOwnerUid,
      canonicalManifestBytes: input.canonicalManifestBytes,
      verified,
    })

    const rebound = await observeCapability(
      'runtime_archive_extracted_file_reopen_failed',
      () => parent.openVerifiedFile(leaf),
    )
    let reboundHandleOpen = true
    try {
      assertVerifiedCapabilityEntry(
        rebound.stats,
        absolute,
        'file',
        input.expectedOwnerUid,
        input.stagingIdentity.device,
        fileMode(expected),
        identity,
      )
      if (rebound.stats.size !== String(expected.bytes)) {
        throw runtimeAuthorityError('runtime_integrity_failed', {
          kind: 'runtime_archive_extracted_file_size_mismatch',
          path: expected.path,
        })
      }
      const reboundVerified = await observeCapability(
        'runtime_archive_extracted_file_reread_failed',
        () =>
          parent.hashVerifiedFile(rebound.handle, expected.bytes),
      )
      assertExtractionNotCancelled(input.signal)
      reboundHandleOpen = false
      assertVerifiedMaterializedFileRead({
        absolute,
        expected,
        expectedDevice: input.stagingIdentity.device,
        expectedIdentity: identity,
        expectedOwnerUid: input.expectedOwnerUid,
        canonicalManifestBytes: input.canonicalManifestBytes,
        verified: reboundVerified,
      })
    } finally {
      if (reboundHandleOpen) {
        await parent.closeHandle(rebound.handle).catch(() => undefined)
      }
    }
  } finally {
    if (handleOpen) {
      await parent.closeHandle(opened.handle).catch(() => undefined)
    }
  }
}

function assertExtractionNotCancelled(
  signal: AbortSignal | undefined,
): void {
  if (signal?.aborted === true) {
    throw runtimeAuthorityError('runtime_cancelled', {
      kind: 'runtime_archive_extraction_cancelled',
    })
  }
}

function assertVerifiedMaterializedFileRead(input: {
  readonly absolute: string
  readonly canonicalManifestBytes: Uint8Array
  readonly expected:
    | RuntimeManifestFileEntry
    | ArchiveManifestEntry
  readonly expectedDevice: string
  readonly expectedIdentity: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
  readonly verified: {
    readonly bytes: number
    readonly sha256: string
    readonly stats: RuntimeCapabilityStats
  }
}): void {
  assertVerifiedCapabilityEntry(
    input.verified.stats,
    input.absolute,
    'file',
    input.expectedOwnerUid,
    input.expectedDevice,
    fileMode(input.expected),
    input.expectedIdentity,
  )
  if (
    input.verified.bytes !== input.expected.bytes ||
    input.verified.sha256 !== input.expected.sha256 ||
    (input.expected.path === 'manifest.json' &&
      (input.verified.bytes !== input.canonicalManifestBytes.byteLength ||
        input.verified.sha256 !==
          sha256(input.canonicalManifestBytes)))
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_extracted_file_mismatch',
      path: input.expected.path,
    })
  }
}

async function inspectOwnedDirectory(
  directory: string,
  expectedOwnerUid: number,
  expectedDevice: string | undefined,
  expectedMode: 0o700 | 0o755,
  evidenceKind: string,
): Promise<RuntimeFileSystemIdentity> {
  let stats
  try {
    stats = await lstat(directory, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: `${evidenceKind}_unavailable`,
      cause: error,
    })
  }
  return assertOwnedDirectoryStats(
    stats,
    directory,
    expectedOwnerUid,
    expectedDevice,
    expectedMode,
    evidenceKind,
  )
}

function assertOwnedDirectoryStats(
  stats: BigIntStats,
  directory: string,
  expectedOwnerUid: number,
  expectedDevice: string | undefined,
  expectedMode: 0o700 | 0o755,
  evidenceKind: string,
): RuntimeFileSystemIdentity {
  const identity = identityFromStats(stats)
  const mode = Number(stats.mode & 0o7777n)
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    identity.ownerUid !== expectedOwnerUid ||
    (expectedDevice !== undefined &&
      identity.device !== expectedDevice) ||
    mode !== expectedMode
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: `${evidenceKind}_identity_invalid`,
      path: directory,
    })
  }
  return identity
}

async function assertIdentity(
  targetPath: string,
  expected: RuntimeFileSystemIdentity,
  evidenceKind: string,
): Promise<void> {
  let stats
  try {
    stats = await lstat(targetPath, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
      cause: error,
    })
  }
  if (!sameIdentity(identityFromStats(stats), expected)) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
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

function createMeter(input: {
  readonly limit: number
  readonly hash: boolean
  readonly overflowKind: string
}): {
  readonly stream: Transform
  readonly bytes: () => number
  readonly digest: () => string | undefined
} {
  let bytes = 0
  const hash = input.hash ? createHash('sha256') : undefined
  const stream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      try {
        bytes = safeAdd(bytes, chunk.byteLength, input.overflowKind)
        if (bytes > input.limit) {
          callback(unsafeArchive(input.overflowKind))
          return
        }
        hash?.update(chunk)
        callback(null, chunk)
      } catch (error) {
        callback(error as Error)
      }
    },
  })
  return {
    stream,
    bytes: () => bytes,
    digest: () => hash?.copy().digest('hex'),
  }
}

function containedRuntimePath(
  runtimeRoot: string,
  relativePath: string,
): string {
  const candidate = path.join(
    runtimeRoot,
    ...relativePath.split('/'),
  )
  if (!isContained(runtimeRoot, candidate) || candidate === runtimeRoot) {
    throw unsafeArchive('runtime_archive_path_escape')
  }
  return candidate
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative === '' ||
    (!path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`))
  )
}

function modeNumber(
  mode: '100644' | '100755',
): 0o644 | 0o755 {
  return mode === '100755' ? 0o755 : 0o644
}

function fileMode(
  entry: RuntimeManifestFileEntry | ArchiveManifestEntry,
): 0o644 | 0o755 {
  return typeof entry.mode === 'number'
    ? entry.mode
    : modeNumber(entry.mode)
}

function paddedTarBytes(bytes: number): number {
  const remainder = bytes % TAR_BLOCK_BYTES
  return remainder === 0
    ? bytes
    : safeAdd(
        bytes,
        TAR_BLOCK_BYTES - remainder,
        'runtime_archive_tar_bound_overflow',
      )
}

function safeAdd(
  left: number,
  right: number,
  evidenceKind: string,
): number {
  const total = left + right
  if (
    !Number.isSafeInteger(left) ||
    !Number.isSafeInteger(right) ||
    !Number.isSafeInteger(total) ||
    left < 0 ||
    right < 0
  ) {
    throw unsafeArchive(evidenceKind)
  }
  return total
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
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

function unsafeArchive(
  kind: string,
  entryPath?: string,
): RuntimeReleaseAuthorityError {
  return runtimeAuthorityError('runtime_archive_unsafe', {
    kind,
    ...(entryPath === undefined ? {} : { path: entryPath }),
  })
}

function normalizeArchivePassError(
  error: unknown,
): RuntimeReleaseAuthorityError {
  if (error instanceof RuntimeReleaseAuthorityError) return error
  return runtimeAuthorityError('runtime_integrity_failed', {
    kind: 'runtime_archive_parse_failed',
    cause: error,
  })
}

function normalizeExtractionError(error: unknown): unknown {
  if (error instanceof RuntimeReleaseAuthorityError) return error
  return runtimeAuthorityError('runtime_storage_unavailable', {
    kind: 'runtime_archive_extraction_failed',
    cause: error,
  })
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}
