/// <reference types="node" />

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  chmod,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  readlink,
  realpath,
  rmdir,
  symlink,
  unlink,
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

const TAR_BLOCK_BYTES = 512
const TAR_TRAILER_BYTES = TAR_BLOCK_BYTES * 2
const RUNTIME_RECIPIENT_NAME = 'runtime'
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

type ObservedEntry = {
  readonly path: string
  readonly identity: RuntimeFileSystemIdentity
  readonly type: 'directory' | 'file' | 'symlink'
}

type ArchivePassMode =
  | { readonly kind: 'prescan' }
  | {
      readonly kind: 'materialize'
      readonly runtimeRoot: string
      readonly stagingIdentity: RuntimeFileSystemIdentity
      readonly created: ObservedEntry[]
      readonly identities: Map<string, RuntimeFileSystemIdentity>
      readonly testOptions: RuntimeArchiveExtractionTestOptions
    }

export type RuntimeVerifiedStaging = {
  readonly kind: 'runtime_verified_staging'
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
  readonly staging: RuntimeStagingIdentity
}

/**
 * Package-private fault/race seam. Production callers must omit this argument.
 */
export type RuntimeArchiveExtractionTestOptions = {
  readonly afterPrescan?: () => Promise<void>
  readonly beforeEntryMaterialization?: (input: {
    readonly path: string
    readonly type: 'directory' | 'file' | 'symlink'
  }) => Promise<void>
  readonly beforeFinalVerification?: () => Promise<void>
}

/**
 * Turns one descriptor-bound archive into a verified, unpublished staging
 * tree. The archive is fully scanned before the first recipient entry is
 * created, and the returned tree is independently re-read from disk.
 */
export async function extractVerifiedRuntimeArchive(
  input: RuntimeArchiveExtractionInput,
  testOptions: RuntimeArchiveExtractionTestOptions = {},
): Promise<RuntimeVerifiedStaging> {
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
  const created: ObservedEntry[] = []
  let runtimeRoot: string | undefined

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

    runtimeRoot = path.join(
      input.staging.path,
      RUNTIME_RECIPIENT_NAME,
    )
    const runtimeIdentity = await createOwnedDirectory(
      runtimeRoot,
      0o700,
      input.mutationAuthority.snapshot.expectedOwnerUid,
      stagingIdentity.device,
      input.staging.path,
      stagingIdentity,
      created,
      testOptions,
    )
    const identities = new Map<string, RuntimeFileSystemIdentity>([
      ['', runtimeIdentity],
    ])
    for (const directory of plan.directories) {
      const identity = await createPlannedDirectory(
        directory,
        runtimeRoot,
        input,
        stagingIdentity,
        identities,
        created,
        testOptions,
      )
      identities.set(directory.path, identity)
    }

    await runArchivePass(archive, input, plan, {
      kind: 'materialize',
      runtimeRoot,
      stagingIdentity,
      created,
      identities,
      testOptions,
    })
    await createPlannedSymlinks(
      plan,
      runtimeRoot,
      input,
      stagingIdentity,
      identities,
      created,
      testOptions,
    )
    await testOptions.beforeFinalVerification?.()
    const verified = await verifyMaterializedRuntime({
      admission: input.admission,
      canonicalManifestBytes,
      plan,
      runtimeRoot,
      stagingRoot: input.staging.path,
      stagingIdentity,
      expectedOwnerUid:
        input.mutationAuthority.snapshot.expectedOwnerUid,
    })
    return {
      kind: 'runtime_verified_staging',
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
    if (runtimeRoot !== undefined) {
      try {
        await cleanupCreatedEntries(
          created,
          input.staging.path,
          stagingIdentity,
        )
      } catch (cleanupError) {
        throw runtimeAuthorityError('runtime_recovery_required', {
          kind: 'runtime_staging_cleanup_ambiguous',
          stagingPath: input.staging.path,
          cause: cleanupError,
        })
      }
    }
    throw normalizeExtractionError(error)
  } finally {
    await archive.close().catch(() => undefined)
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
  parser.on('entry', (header, entry, next) => {
    void handleArchiveEntry({
      header,
      entry,
      next,
      input,
      plan,
      mode,
      observed,
      entryNumber: ++entryCount,
    })
  })

  try {
    await pipeline(
      archive.createReadStream({
        start: 0,
        end: input.admission.descriptor.archive.bytes - 1,
        autoClose: false,
      }),
      archiveMeter.stream,
      createGunzip(),
      tarMeter.stream,
      parser,
    )
  } catch (error) {
    throw normalizeArchivePassError(error)
  }

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

async function handleArchiveEntry(input: {
  readonly header: Headers
  readonly entry: Readable
  readonly next: (error?: unknown) => void
  readonly input: RuntimeArchiveExtractionInput
  readonly plan: RuntimeArchivePlan
  readonly mode: ArchivePassMode
  readonly observed: Set<string>
  readonly entryNumber: number
}): Promise<void> {
  try {
    if (input.entryNumber > input.plan.entries.size) {
      throw unsafeArchive('runtime_archive_entry_count_exceeded')
    }
    const entryPath = decodeArchiveEntryPath(input.header)
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
    input.next(error)
  }
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
  output: FileHandle | undefined,
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
  identities: Map<string, RuntimeFileSystemIdentity>,
  created: ObservedEntry[],
  testOptions: RuntimeArchiveExtractionTestOptions,
): Promise<RuntimeFileSystemIdentity> {
  const parentPath = path.posix.dirname(directory.path)
  const parentIdentity = identities.get(
    parentPath === '.' ? '' : parentPath,
  )
  if (parentIdentity === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_parent_identity_missing',
    })
  }
  const absolutePath = containedRuntimePath(
    runtimeRoot,
    directory.path,
  )
  return createOwnedDirectory(
    absolutePath,
    directory.mode,
    input.mutationAuthority.snapshot.expectedOwnerUid,
    stagingIdentity.device,
    parentPath === '.'
      ? runtimeRoot
      : containedRuntimePath(runtimeRoot, parentPath),
    parentIdentity,
    created,
    testOptions,
    directory.path,
  )
}

async function createOwnedDirectory(
  directory: string,
  mode: 0o700 | 0o755,
  expectedOwnerUid: number,
  expectedDevice: string,
  parentPath: string,
  parentIdentity: RuntimeFileSystemIdentity,
  created: ObservedEntry[],
  testOptions: RuntimeArchiveExtractionTestOptions,
  relativePath = '',
): Promise<RuntimeFileSystemIdentity> {
  await testOptions.beforeEntryMaterialization?.({
    path: relativePath,
    type: 'directory',
  })
  await assertIdentity(
    parentPath,
    parentIdentity,
    'runtime_archive_parent_changed',
  )
  try {
    await mkdir(directory, { mode })
    await chmod(directory, mode)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_directory_create_failed',
      cause: error,
    })
  }
  const identity = await inspectOwnedDirectory(
    directory,
    expectedOwnerUid,
    expectedDevice,
    mode,
    'runtime_archive_directory',
  )
  await assertIdentity(
    parentPath,
    parentIdentity,
    'runtime_archive_parent_changed',
  )
  created.push({ path: directory, identity, type: 'directory' })
  return identity
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
  const parentIdentity = mode.identities.get(
    parentRelative === '.' ? '' : parentRelative,
  )
  if (parentIdentity === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_file_parent_missing',
    })
  }
  const parentPath =
    parentRelative === '.'
      ? mode.runtimeRoot
      : containedRuntimePath(mode.runtimeRoot, parentRelative)
  await assertIdentity(
    input.staging.path,
    mode.stagingIdentity,
    'runtime_staging_identity_changed',
  )
  await assertIdentity(
    parentPath,
    parentIdentity,
    'runtime_archive_parent_changed',
  )
  const filePath = containedRuntimePath(
    mode.runtimeRoot,
    expected.path,
  )
  let output: FileHandle
  try {
    output = await open(
      filePath,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      fileMode(expected),
    )
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_file_create_failed',
      cause: error,
    })
  }
  try {
    await consumeAndVerifyFile(entry, expected, output)
    await output.chmod(fileMode(expected))
    await output.sync()
    const stats = await output.stat({ bigint: true })
    const identity = assertOwnedFileStats(
      stats,
      filePath,
      input.mutationAuthority.snapshot.expectedOwnerUid,
      mode.stagingIdentity.device,
      fileMode(expected),
    )
    mode.created.push({ path: filePath, identity, type: 'file' })
  } finally {
    await output.close().catch(() => undefined)
  }
  await assertIdentity(
    parentPath,
    parentIdentity,
    'runtime_archive_parent_changed',
  )
}

async function createPlannedSymlinks(
  plan: RuntimeArchivePlan,
  runtimeRoot: string,
  input: RuntimeArchiveExtractionInput,
  stagingIdentity: RuntimeFileSystemIdentity,
  identities: Map<string, RuntimeFileSystemIdentity>,
  created: ObservedEntry[],
  testOptions: RuntimeArchiveExtractionTestOptions,
): Promise<void> {
  for (const expected of orderSymlinks(plan.symlinks)) {
    await testOptions.beforeEntryMaterialization?.({
      path: expected.path,
      type: 'symlink',
    })
    const parentRelative = path.posix.dirname(expected.path)
    const parentIdentity = identities.get(
      parentRelative === '.' ? '' : parentRelative,
    )
    if (parentIdentity === undefined) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_symlink_parent_missing',
      })
    }
    const parentPath =
      parentRelative === '.'
        ? runtimeRoot
        : containedRuntimePath(runtimeRoot, parentRelative)
    await assertIdentity(
      input.staging.path,
      stagingIdentity,
      'runtime_staging_identity_changed',
    )
    await assertIdentity(
      parentPath,
      parentIdentity,
      'runtime_archive_parent_changed',
    )
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
    const resolvedTarget = await realpath(lexicalTarget).catch(
      (error: unknown) => {
        throw runtimeAuthorityError('runtime_integrity_failed', {
          kind: 'runtime_archive_symlink_target_missing',
          cause: error,
        })
      },
    )
    if (!isContained(runtimeRoot, resolvedTarget)) {
      throw unsafeArchive('runtime_archive_symlink_target_unsafe')
    }
    try {
      await symlink(expected.target, destination)
    } catch (error) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_archive_symlink_create_failed',
        cause: error,
      })
    }
    const identity = await inspectOwnedSymlink(
      destination,
      input.mutationAuthority.snapshot.expectedOwnerUid,
      stagingIdentity.device,
    )
    created.push({ path: destination, identity, type: 'symlink' })
    await assertIdentity(
      parentPath,
      parentIdentity,
      'runtime_archive_parent_changed',
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

async function verifyMaterializedRuntime(input: {
  readonly admission: RuntimeReleaseAdmission
  readonly canonicalManifestBytes: Buffer
  readonly plan: RuntimeArchivePlan
  readonly runtimeRoot: string
  readonly stagingRoot: string
  readonly stagingIdentity: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
}): Promise<{ readonly runtimeIdentity: RuntimeFileSystemIdentity }> {
  await assertIdentity(
    input.stagingRoot,
    input.stagingIdentity,
    'runtime_staging_identity_changed',
  )
  const runtimeIdentity = await inspectOwnedDirectory(
    input.runtimeRoot,
    input.expectedOwnerUid,
    input.stagingIdentity.device,
    0o700,
    'runtime_archive_recipient',
  )
  const observed = new Set<string>()
  await visitMaterializedDirectory(
    input.runtimeRoot,
    '',
    input,
    observed,
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
  const topLevel = (await readdir(input.runtimeRoot)).sort(
    compareUnicodeCodePoints,
  )
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
  const materializedManifest = await readFile(
    path.join(input.runtimeRoot, 'manifest.json'),
  )
  if (!materializedManifest.equals(input.canonicalManifestBytes)) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_canonical_manifest_mismatch',
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
  runtimeRoot: string,
  relativeRoot: string,
  input: Parameters<typeof verifyMaterializedRuntime>[0],
  observed: Set<string>,
): Promise<void> {
  const directory =
    relativeRoot === ''
      ? runtimeRoot
      : containedRuntimePath(runtimeRoot, relativeRoot)
  const names = (await readdir(directory)).sort(
    compareUnicodeCodePoints,
  )
  for (const name of names) {
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
    const absolute = containedRuntimePath(runtimeRoot, relative)
    const stats = await lstat(absolute, { bigint: true })
    if (expected.type === 'directory') {
      assertOwnedDirectoryStats(
        stats,
        absolute,
        input.expectedOwnerUid,
        input.stagingIdentity.device,
        expected.mode,
        'runtime_archive_extracted_directory',
      )
      await visitMaterializedDirectory(
        runtimeRoot,
        relative,
        input,
        observed,
      )
      continue
    }
    if (expected.type === 'file') {
      assertOwnedFileStats(
        stats,
        absolute,
        input.expectedOwnerUid,
        input.stagingIdentity.device,
        fileMode(expected),
      )
      const bytes = await readFile(absolute)
      if (
        bytes.byteLength !== expected.bytes ||
        sha256(bytes) !== expected.sha256
      ) {
        throw runtimeAuthorityError('runtime_integrity_failed', {
          kind: 'runtime_archive_extracted_file_mismatch',
          path: relative,
        })
      }
      continue
    }
    assertOwnedSymlinkStats(
      stats,
      absolute,
      input.expectedOwnerUid,
      input.stagingIdentity.device,
    )
    if ((await readlink(absolute)) !== expected.target) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_extracted_symlink_mismatch',
        path: relative,
      })
    }
    const resolved = await realpath(absolute).catch(
      (error: unknown) => {
        throw runtimeAuthorityError('runtime_integrity_failed', {
          kind: 'runtime_archive_extracted_symlink_dangling',
          path: relative,
          cause: error,
        })
      },
    )
    if (!isContained(runtimeRoot, resolved)) {
      throw unsafeArchive('runtime_archive_symlink_target_unsafe')
    }
  }
}

async function cleanupCreatedEntries(
  created: readonly ObservedEntry[],
  stagingRoot: string,
  stagingIdentity: RuntimeFileSystemIdentity,
): Promise<void> {
  await assertIdentity(
    stagingRoot,
    stagingIdentity,
    'runtime_staging_identity_changed',
  )
  for (const entry of [...created].reverse()) {
    const stats = await lstat(entry.path, { bigint: true }).catch(
      (error: unknown) => {
        if (isNodeError(error) && error.code === 'ENOENT') return undefined
        throw error
      },
    )
    if (stats === undefined) continue
    const actual = identityFromStats(stats)
    if (
      !sameIdentity(entry.identity, actual) ||
      (entry.type === 'directory' && !stats.isDirectory()) ||
      (entry.type === 'file' && !stats.isFile()) ||
      (entry.type === 'symlink' && !stats.isSymbolicLink())
    ) {
      throw new Error('Created staging entry identity changed')
    }
    if (entry.type === 'directory') await rmdir(entry.path)
    else await unlink(entry.path)
  }
  await assertIdentity(
    stagingRoot,
    stagingIdentity,
    'runtime_staging_identity_changed',
  )
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

function assertOwnedFileStats(
  stats: BigIntStats,
  filePath: string,
  expectedOwnerUid: number,
  expectedDevice: string,
  expectedMode: 0o644 | 0o755,
): RuntimeFileSystemIdentity {
  const identity = identityFromStats(stats)
  const mode = Number(stats.mode & 0o7777n)
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    identity.ownerUid !== expectedOwnerUid ||
    identity.device !== expectedDevice ||
    mode !== expectedMode
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_extracted_file_identity_invalid',
      path: filePath,
    })
  }
  return identity
}

async function inspectOwnedSymlink(
  linkPath: string,
  expectedOwnerUid: number,
  expectedDevice: string,
): Promise<RuntimeFileSystemIdentity> {
  const stats = await lstat(linkPath, { bigint: true })
  return assertOwnedSymlinkStats(
    stats,
    linkPath,
    expectedOwnerUid,
    expectedDevice,
  )
}

function assertOwnedSymlinkStats(
  stats: BigIntStats,
  linkPath: string,
  expectedOwnerUid: number,
  expectedDevice: string,
): RuntimeFileSystemIdentity {
  const identity = identityFromStats(stats)
  if (
    !stats.isSymbolicLink() ||
    identity.ownerUid !== expectedOwnerUid ||
    identity.device !== expectedDevice
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_extracted_symlink_identity_invalid',
      path: linkPath,
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
