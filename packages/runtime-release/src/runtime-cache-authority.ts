/// <reference types="node" />

import {
  lstat,
  readdir,
  realpath,
} from 'node:fs/promises'
import path from 'node:path'

import type { RuntimeReleaseAdmission } from './runtime-release-authority.js'
import { runtimeAuthorityError } from './runtime-release-authority.js'

const CACHE_NAMESPACE_NAMES = [
  'archives',
  'generations',
  'leases',
  'partials',
  'quarantine',
  'staging',
] as const

type RuntimeCacheNamespaceName =
  (typeof CACHE_NAMESPACE_NAMES)[number]

export type RuntimeCachePathIdentity = {
  readonly kind:
    | 'archive'
    | 'generation'
    | 'generation_receipt'
    | 'lease'
    | 'partial'
    | 'quarantine'
    | 'staging'
  readonly path: string
}

export type RuntimeCacheLayout = {
  readonly appDataRoot: string
  readonly cacheRoot: string
  readonly identity: RuntimeReleaseAdmission['identity']
  readonly manifestEvidence: {
    readonly payloadRosterSha256: string
    readonly bundleRosterSha256: string
  }
  readonly archive: RuntimeCachePathIdentity & {
    readonly kind: 'archive'
  }
  readonly partial: {
    readonly kind: 'partial'
    readonly root: string
    readonly archivePath: string
    readonly journalPath: string
  }
  readonly generation: {
    readonly kind: 'generation'
    readonly root: string
    readonly runtimeRoot: string
    readonly receiptPath: string
  }
  readonly lease: RuntimeCachePathIdentity & {
    readonly kind: 'lease'
    readonly archiveSha256: string
  }
  readonly namespaces: Readonly<
    Record<RuntimeCacheNamespaceName, string>
  >
}

export type RuntimeStagingIdentity = RuntimeCachePathIdentity & {
  readonly kind: 'staging'
  readonly transactionNonce: string
}

export type RuntimeQuarantineIdentity = RuntimeCachePathIdentity & {
  readonly kind: 'quarantine'
  readonly source:
    | 'archive'
    | 'generation'
    | 'partial'
    | 'staging'
  readonly transactionNonce: string
}

export type RuntimeFileSystemIdentity = {
  readonly device: string
  readonly inode: string
  readonly ownerUid: number
}

export type RuntimeCacheLeaseOwnerIdentity = {
  readonly applicationInstanceNonce: string
  readonly processId: number
  readonly processStartIdentity: string
  readonly transactionNonce: string
}

export type RuntimeGenerationVerificationReceipt = {
  readonly schemaVersion: 1
  readonly kind: 'runtime_generation_verification'
  readonly release: RuntimeReleaseAdmission['identity']
  readonly generationIdentity: RuntimeFileSystemIdentity
  readonly manifest: {
    readonly sha256: string
    readonly payloadRosterSha256: string
    readonly bundleRosterSha256: string
  }
}

export type RuntimeCacheLeaseHandle =
  | {
      readonly kind: 'acquired'
      readonly leaseIdentity: RuntimeFileSystemIdentity
      release(): Promise<void>
    }
  | {
      readonly kind: 'joined'
      readonly completion: Promise<RuntimeGenerationVerificationReceipt>
    }

export interface RuntimeCacheLeaseCoordinator {
  acquireOrJoin(input: {
    readonly lease: RuntimeCacheLayout['lease']
    readonly owner: RuntimeCacheLeaseOwnerIdentity
    readonly signal: AbortSignal
  }): Promise<RuntimeCacheLeaseHandle>
}

export type RuntimeCacheQuarantinePlan = {
  readonly source: {
    readonly kind:
      | 'archive'
      | 'generation'
      | 'partial'
      | 'staging'
    readonly path: string
    readonly expectedIdentity: RuntimeFileSystemIdentity
  }
  readonly destination: RuntimeQuarantineIdentity
}

export type RuntimeCacheRootInspection = {
  readonly state: 'absent' | 'present'
  readonly appDataRootIdentity: RuntimeFileSystemIdentity
  readonly cacheRootIdentity?: RuntimeFileSystemIdentity
  readonly namespaceIdentities: Readonly<
    Partial<Record<RuntimeCacheNamespaceName, RuntimeFileSystemIdentity>>
  >
}

export function createRuntimeCacheLayout(
  appDataRoot: string,
  admission: RuntimeReleaseAdmission,
): RuntimeCacheLayout {
  const canonicalAppDataRoot = normalizeAbsoluteRoot(appDataRoot)
  const cacheRoot = containedJoin(
    canonicalAppDataRoot,
    'runtime-cache',
    'v1',
  )
  const namespaces = {
    archives: containedJoin(cacheRoot, 'archives'),
    generations: containedJoin(cacheRoot, 'generations'),
    leases: containedJoin(cacheRoot, 'leases'),
    partials: containedJoin(cacheRoot, 'partials'),
    quarantine: containedJoin(cacheRoot, 'quarantine'),
    staging: containedJoin(cacheRoot, 'staging'),
  } as const
  const digest = admission.identity.archiveSha256
  const partialRoot = containedJoin(namespaces.partials, digest)
  const generationRoot = containedJoin(
    namespaces.generations,
    admission.identity.releaseId,
    admission.identity.target,
    digest,
  )
  return {
    appDataRoot: canonicalAppDataRoot,
    cacheRoot,
    identity: admission.identity,
    manifestEvidence: {
      payloadRosterSha256:
        admission.manifest.payload.roster_sha256,
      bundleRosterSha256:
        admission.manifest.bundle.roster_sha256,
    },
    archive: {
      kind: 'archive',
      path: containedJoin(namespaces.archives, `${digest}.tar.gz`),
    },
    partial: {
      kind: 'partial',
      root: partialRoot,
      archivePath: containedJoin(partialRoot, 'archive.part'),
      journalPath: containedJoin(partialRoot, 'journal.json'),
    },
    generation: {
      kind: 'generation',
      root: generationRoot,
      runtimeRoot: containedJoin(generationRoot, 'runtime'),
      receiptPath: containedJoin(generationRoot, 'receipt.json'),
    },
    lease: {
      kind: 'lease',
      path: containedJoin(namespaces.leases, `${digest}.json`),
      archiveSha256: digest,
    },
    namespaces,
  }
}

export function createRuntimeGenerationVerificationReceipt(
  layout: RuntimeCacheLayout,
  generationIdentity: RuntimeFileSystemIdentity,
): RuntimeGenerationVerificationReceipt {
  return {
    schemaVersion: 1,
    kind: 'runtime_generation_verification',
    release: layout.identity,
    generationIdentity,
    manifest: {
      sha256: layout.identity.manifestSha256,
      payloadRosterSha256:
        layout.manifestEvidence.payloadRosterSha256,
      bundleRosterSha256:
        layout.manifestEvidence.bundleRosterSha256,
    },
  }
}

export function createRuntimeCacheQuarantinePlan(
  layout: RuntimeCacheLayout,
  input: {
    readonly source:
      | RuntimeCacheLayout['archive']
      | RuntimeCacheLayout['generation']
      | RuntimeCacheLayout['partial']
      | RuntimeStagingIdentity
    readonly expectedIdentity: RuntimeFileSystemIdentity
    readonly transactionNonce: string
  },
): RuntimeCacheQuarantinePlan {
  const sourceKind = input.source.kind
  const sourcePath =
    sourceKind === 'generation' || sourceKind === 'partial'
      ? input.source.root
      : input.source.path
  if (!isContained(layout.cacheRoot, sourcePath)) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'quarantine_source_escape',
      cacheRoot: layout.cacheRoot,
      sourcePath,
    })
  }
  return {
    source: {
      kind: sourceKind,
      path: sourcePath,
      expectedIdentity: input.expectedIdentity,
    },
    destination: createRuntimeQuarantineIdentity(
      layout,
      input.transactionNonce,
      sourceKind,
    ),
  }
}

export function createRuntimeStagingIdentity(
  layout: RuntimeCacheLayout,
  transactionNonce: string,
): RuntimeStagingIdentity {
  const nonce = decodeTransactionNonce(transactionNonce)
  return {
    kind: 'staging',
    path: containedJoin(
      layout.namespaces.staging,
      `${layout.identity.archiveSha256}-${nonce}`,
    ),
    transactionNonce: nonce,
  }
}

export function createRuntimeQuarantineIdentity(
  layout: RuntimeCacheLayout,
  transactionNonce: string,
  source: RuntimeQuarantineIdentity['source'] = 'generation',
): RuntimeQuarantineIdentity {
  const nonce = decodeTransactionNonce(transactionNonce)
  if (
    source !== 'archive' &&
    source !== 'generation' &&
    source !== 'partial' &&
    source !== 'staging'
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'quarantine_source_invalid',
      source,
    })
  }
  return {
    kind: 'quarantine',
    path: containedJoin(
      layout.namespaces.quarantine,
      `${source}-${layout.identity.archiveSha256}-${nonce}`,
    ),
    source,
    transactionNonce: nonce,
  }
}

export async function inspectRuntimeCacheRoot(input: {
  readonly appDataRoot: string
  readonly expectedOwnerUid?: number
}): Promise<RuntimeCacheRootInspection> {
  const appDataRoot = normalizeAbsoluteRoot(input.appDataRoot)
  const expectedOwnerUid =
    input.expectedOwnerUid ?? currentProcessOwnerUid()
  await assertNoSymlinkAncestors(appDataRoot)
  const appDataRootIdentity = await inspectOwnedDirectory(
    appDataRoot,
    expectedOwnerUid,
    undefined,
    'app_data_root',
  )
  let canonicalRoot: string
  try {
    canonicalRoot = await realpath(appDataRoot)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'app_data_root_realpath_unavailable',
      path: appDataRoot,
      cause: error,
    })
  }
  if (canonicalRoot !== appDataRoot) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'app_data_root_not_canonical',
      path: appDataRoot,
      canonicalPath: canonicalRoot,
    })
  }

  const runtimeCacheParent = containedJoin(
    appDataRoot,
    'runtime-cache',
  )
  const cacheRoot = containedJoin(runtimeCacheParent, 'v1')
  const runtimeCacheParentStats = await lstatIfPresent(runtimeCacheParent)
  if (runtimeCacheParentStats === undefined) {
    return {
      state: 'absent',
      appDataRootIdentity,
      namespaceIdentities: {},
    }
  }
  const runtimeCacheParentIdentity = assertOwnedDirectoryStats(
    runtimeCacheParentStats,
    runtimeCacheParent,
    expectedOwnerUid,
    appDataRootIdentity.device,
    'runtime_cache_parent',
  )
  const parentEntries = await readDirectoryNames(runtimeCacheParent)
  if (
    parentEntries.some((entry) => entry !== 'v1')
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_parent_residue_ambiguous',
      path: runtimeCacheParent,
      entries: parentEntries,
      identity: runtimeCacheParentIdentity,
    })
  }

  const cacheRootStats = await lstatIfPresent(cacheRoot)
  if (cacheRootStats === undefined) {
    return {
      state: 'absent',
      appDataRootIdentity,
      namespaceIdentities: {},
    }
  }
  const cacheRootIdentity = assertOwnedDirectoryStats(
    cacheRootStats,
    cacheRoot,
    expectedOwnerUid,
    appDataRootIdentity.device,
    'runtime_cache_root',
  )
  const cacheEntries = await readDirectoryNames(cacheRoot)
  const unknownEntries = cacheEntries.filter(
    (entry) =>
      !CACHE_NAMESPACE_NAMES.includes(
        entry as RuntimeCacheNamespaceName,
      ),
  )
  if (unknownEntries.length > 0) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_residue_ambiguous',
      path: cacheRoot,
      entries: unknownEntries,
      identity: cacheRootIdentity,
    })
  }

  const namespaceIdentities: Partial<
    Record<RuntimeCacheNamespaceName, RuntimeFileSystemIdentity>
  > = {}
  for (const namespace of CACHE_NAMESPACE_NAMES) {
    if (!cacheEntries.includes(namespace)) continue
    const namespacePath = containedJoin(cacheRoot, namespace)
    namespaceIdentities[namespace] = await inspectOwnedDirectory(
      namespacePath,
      expectedOwnerUid,
      appDataRootIdentity.device,
      `runtime_cache_${namespace}`,
    )
  }
  return {
    state: 'present',
    appDataRootIdentity,
    cacheRootIdentity,
    namespaceIdentities,
  }
}

function normalizeAbsoluteRoot(value: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\0') ||
    !path.isAbsolute(value)
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'cache_root_path_invalid',
      path: value,
    })
  }
  return path.normalize(value)
}

function containedJoin(root: string, ...segments: string[]): string {
  const candidate = path.join(root, ...segments)
  const relative = path.relative(root, candidate)
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'cache_path_escape',
      root,
      candidate,
    })
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

function decodeTransactionNonce(value: string): string {
  if (!/^[0-9a-f]{32}$/u.test(value)) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'transaction_nonce_invalid',
      value,
    })
  }
  return value
}

async function assertNoSymlinkAncestors(
  absolutePath: string,
): Promise<void> {
  const parsed = path.parse(absolutePath)
  const relative = absolutePath.slice(parsed.root.length)
  const segments = relative.split(path.sep).filter(Boolean)
  let cursor = parsed.root
  for (const segment of segments) {
    cursor = path.join(cursor, segment)
    let stats
    try {
      stats = await lstat(cursor, { bigint: true })
    } catch (error) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'cache_ancestor_unavailable',
        path: cursor,
        cause: error,
      })
    }
    if (stats.isSymbolicLink()) {
      throw runtimeAuthorityError('runtime_cache_unsafe', {
        kind: 'cache_ancestor_symlink',
        path: cursor,
      })
    }
  }
}

async function inspectOwnedDirectory(
  directory: string,
  expectedOwnerUid: number,
  expectedDevice: string | undefined,
  evidenceKind: string,
): Promise<RuntimeFileSystemIdentity> {
  let stats
  try {
    stats = await lstat(directory, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: `${evidenceKind}_unavailable`,
      path: directory,
      cause: error,
    })
  }
  return assertOwnedDirectoryStats(
    stats,
    directory,
    expectedOwnerUid,
    expectedDevice,
    evidenceKind,
  )
}

function assertOwnedDirectoryStats(
  stats: Awaited<ReturnType<typeof lstat>>,
  directory: string,
  expectedOwnerUid: number,
  expectedDevice: string | undefined,
  evidenceKind: string,
): RuntimeFileSystemIdentity {
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: `${evidenceKind}_not_owned_directory`,
      path: directory,
    })
  }
  const mode =
    typeof stats.mode === 'bigint'
      ? Number(stats.mode & 0o777n)
      : stats.mode & 0o777
  const ownerUid =
    typeof stats.uid === 'bigint' ? Number(stats.uid) : stats.uid
  const device = String(stats.dev)
  const inode = String(stats.ino)
  if (
    ownerUid !== expectedOwnerUid ||
    mode !== 0o700 ||
    (expectedDevice !== undefined && device !== expectedDevice)
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: `${evidenceKind}_ownership_invalid`,
      path: directory,
      expectedOwnerUid,
      expectedDevice,
      actual: {
        device,
        inode,
        mode,
        ownerUid,
      },
    })
  }
  return { device, inode, ownerUid }
}

async function lstatIfPresent(
  targetPath: string,
): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(targetPath, { bigint: true })
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'cache_path_observation_failed',
      path: targetPath,
      cause: error,
    })
  }
}

async function readDirectoryNames(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory)
    return entries.sort(compareUnicodeCodePoints)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'cache_directory_read_failed',
      path: directory,
      cause: error,
    })
  }
}

function currentProcessOwnerUid(): number {
  const uid = process.getuid?.()
  if (uid === undefined) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'owner_identity_unavailable',
    })
  }
  return uid
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0)!)
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
