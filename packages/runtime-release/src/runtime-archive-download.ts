/// <reference types="node" />

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  rmdir,
  unlink,
} from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

import type {
  ArchiveTransport,
  ArchiveTransportResponse,
} from './runtime-archive-transport.js'
import {
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import type {
  RuntimeCacheLayout,
  RuntimeCacheMutationAuthority,
  RuntimeFileSystemIdentity,
} from './runtime-cache-authority.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmission,
} from './runtime-release-authority.js'

export type RuntimeArchiveVerificationSnapshot = {
  readonly kind: 'runtime_archive_verification_snapshot'
  readonly release: RuntimeReleaseAdmission['identity']
  readonly archivePath: string
  readonly archiveIdentity: RuntimeFileSystemIdentity
  readonly bytes: number
  readonly sha256: string
}

export type RuntimeArchiveDownloadInput = {
  readonly admission: RuntimeReleaseAdmission
  readonly layout: RuntimeCacheLayout
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly signal: AbortSignal
  readonly transport: ArchiveTransport
}

export async function downloadVerifiedRuntimeArchive(
  input: RuntimeArchiveDownloadInput,
): Promise<RuntimeArchiveVerificationSnapshot> {
  assertInputBindings(input)
  assertNotCancelled(input.signal)
  const mutationAuthority =
    await revalidateRuntimeCacheRootForMutation(
      input.mutationAuthority.snapshot,
    )
  await assertDownloadNamespaces(input.layout, mutationAuthority)
  await createEmptyPartialRoot(input.layout, mutationAuthority)

  try {
    return await input.transport.exchange(
      {
        url: input.admission.descriptor.archive.url,
        signal: input.signal,
      },
      async (response) => {
        assertNotCancelled(input.signal)
        if (response.statusCode !== 200) {
          throw runtimeAuthorityError('runtime_integrity_failed', {
            kind: 'runtime_archive_http_status_unexpected',
            statusCode: response.statusCode,
          })
        }
        assertIdentityEncoding(response)
        assertFullContentLength(input.admission, response)
        return retainFreshResponse(
          input,
          mutationAuthority,
          response,
        )
      },
    )
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    if (input.signal.aborted || isAbortError(error)) {
      throw runtimeAuthorityError('runtime_cancelled', {
        kind: 'runtime_archive_request_cancelled',
      })
    }
    throw runtimeAuthorityError('runtime_network_unavailable', {
      kind: 'runtime_archive_request_failed',
      cause: error,
    })
  }
}

async function retainFreshResponse(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  response: ArchiveTransportResponse,
): Promise<RuntimeArchiveVerificationSnapshot> {
  let partial: FileHandle
  try {
    partial = await open(
      input.layout.partial.archivePath,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_RDWR |
        constants.O_NOFOLLOW,
      0o600,
    )
  } catch (error) {
    throw storageOrCacheError(
      error,
      'runtime_archive_partial_create_failed',
    )
  }

  let published = false
  try {
    const partialIdentity = await assertOwnedRegularFile(
      partial,
      mutationAuthority,
      input.layout.namespaces.partials,
      0,
      'runtime_archive_partial_identity_invalid',
    )
    let writtenBytes = 0
    try {
      for await (const chunkValue of response.body) {
        assertNotCancelled(input.signal)
        const chunk = Buffer.from(chunkValue)
        if (chunk.byteLength === 0) continue
        if (
          writtenBytes >
          input.admission.descriptor.archive.bytes -
            chunk.byteLength
        ) {
          throw runtimeAuthorityError('runtime_integrity_failed', {
            kind: 'runtime_archive_stream_bound_exceeded',
          })
        }
        await writeFully(partial, chunk, writtenBytes)
        writtenBytes += chunk.byteLength
      }
    } catch (error) {
      if (error instanceof RuntimeReleaseAuthorityError) throw error
      if (input.signal.aborted || isAbortError(error)) {
        throw runtimeAuthorityError('runtime_cancelled', {
          kind: 'runtime_archive_stream_cancelled',
        })
      }
      throw runtimeAuthorityError('runtime_network_unavailable', {
        kind: 'runtime_archive_stream_interrupted',
        cause: error,
      })
    }
    assertNotCancelled(input.signal)
    if (writtenBytes !== input.admission.descriptor.archive.bytes) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_stream_length_mismatch',
        expectedBytes: input.admission.descriptor.archive.bytes,
        actualBytes: writtenBytes,
      })
    }
    try {
      await partial.sync()
    } catch (error) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_archive_partial_sync_failed',
        cause: error,
      })
    }
    const digest = await hashFile(
      partial,
      input.admission.descriptor.archive.bytes,
    )
    if (digest !== input.admission.descriptor.archive.sha256) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_digest_mismatch',
      })
    }
    await assertPartialPathIdentity(
      input.layout.partial.archivePath,
      partialIdentity,
      input.admission.descriptor.archive.bytes,
    )
    try {
      await link(
        input.layout.partial.archivePath,
        input.layout.archive.path,
      )
      published = true
    } catch (error) {
      if (isNodeError(error) && error.code === 'EEXIST') {
        throw runtimeAuthorityError('runtime_recovery_required', {
          kind: 'runtime_archive_publish_destination_exists',
        })
      }
      throw storageOrCacheError(
        error,
        'runtime_archive_publish_failed',
      )
    }
    await syncDirectory(input.layout.namespaces.archives)
  } finally {
    await partial.close().catch(() => undefined)
  }

  if (published) {
    try {
      await unlink(input.layout.partial.archivePath)
      await syncDirectory(input.layout.partial.root)
      await rmdir(input.layout.partial.root)
      await syncDirectory(input.layout.namespaces.partials)
    } catch (error) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_partial_cleanup_ambiguous',
        cause: error,
      })
    }
  }

  return verifyRetainedArchive(input, mutationAuthority)
}

async function verifyRetainedArchive(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
): Promise<RuntimeArchiveVerificationSnapshot> {
  let archive: FileHandle
  try {
    archive = await open(
      input.layout.archive.path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
  } catch (error) {
    throw storageOrCacheError(
      error,
      'runtime_archive_retained_open_failed',
    )
  }
  try {
    const archiveIdentity = await assertOwnedRegularFile(
      archive,
      mutationAuthority,
      input.layout.namespaces.archives,
      input.admission.descriptor.archive.bytes,
      'runtime_archive_retained_identity_invalid',
    )
    const digest = await hashFile(
      archive,
      input.admission.descriptor.archive.bytes,
    )
    if (digest !== input.admission.descriptor.archive.sha256) {
      throw runtimeAuthorityError('runtime_integrity_failed', {
        kind: 'runtime_archive_retained_digest_mismatch',
      })
    }
    return {
      kind: 'runtime_archive_verification_snapshot',
      release: input.admission.identity,
      archivePath: input.layout.archive.path,
      archiveIdentity,
      bytes: input.admission.descriptor.archive.bytes,
      sha256: digest,
    }
  } finally {
    await archive.close().catch(() => undefined)
  }
}

function assertInputBindings(input: RuntimeArchiveDownloadInput): void {
  const admissionIdentity = input.admission.identity
  const layoutIdentity = input.layout.identity
  if (
    input.layout.appDataRoot !==
      input.mutationAuthority.snapshot.appDataRoot ||
    input.layout.cacheRoot !==
      input.mutationAuthority.snapshot.cacheRoot ||
    admissionIdentity.archiveSha256 !==
      layoutIdentity.archiveSha256 ||
    admissionIdentity.manifestSha256 !==
      layoutIdentity.manifestSha256 ||
    admissionIdentity.releaseId !== layoutIdentity.releaseId ||
    admissionIdentity.runtimeContractVersion !==
      layoutIdentity.runtimeContractVersion ||
    admissionIdentity.target !== layoutIdentity.target ||
    input.layout.archive.path !==
      path.join(
        input.layout.namespaces.archives,
        `${admissionIdentity.archiveSha256}.tar.gz`,
      )
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_download_binding_mismatch',
    })
  }
}

async function assertDownloadNamespaces(
  layout: RuntimeCacheLayout,
  mutationAuthority: RuntimeCacheMutationAuthority,
): Promise<void> {
  const archiveIdentity =
    mutationAuthority.snapshot.namespaceIdentities.archives
  const partialIdentity =
    mutationAuthority.snapshot.namespaceIdentities.partials
  if (
    archiveIdentity === undefined ||
    partialIdentity === undefined ||
    archiveIdentity.device !== partialIdentity.device ||
    path.dirname(layout.archive.path) !==
      layout.namespaces.archives ||
    path.dirname(layout.partial.root) !==
      layout.namespaces.partials ||
    path.dirname(layout.partial.archivePath) !==
      layout.partial.root ||
    path.dirname(layout.partial.journalPath) !==
      layout.partial.root
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_download_namespace_invalid',
    })
  }
  await assertDirectoryIdentity(
    layout.namespaces.archives,
    archiveIdentity,
  )
  await assertDirectoryIdentity(
    layout.namespaces.partials,
    partialIdentity,
  )
}

async function createEmptyPartialRoot(
  layout: RuntimeCacheLayout,
  mutationAuthority: RuntimeCacheMutationAuthority,
): Promise<void> {
  try {
    await mkdir(layout.partial.root, { mode: 0o700 })
  } catch (error) {
    if (!(isNodeError(error) && error.code === 'EEXIST')) {
      throw storageOrCacheError(
        error,
        'runtime_archive_partial_root_create_failed',
      )
    }
  }
  const expectedParent =
    mutationAuthority.snapshot.namespaceIdentities.partials
  if (expectedParent === undefined) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_partial_namespace_missing',
    })
  }
  let stats
  try {
    stats = await lstat(layout.partial.root, { bigint: true })
  } catch (error) {
    throw storageOrCacheError(
      error,
      'runtime_archive_partial_root_observation_failed',
    )
  }
  if (
    stats.isSymbolicLink() ||
    !stats.isDirectory() ||
    Number(stats.uid) !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    Number(stats.mode & 0o7777n) !== 0o700 ||
    String(stats.dev) !== expectedParent.device
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_partial_root_identity_invalid',
    })
  }
  let entries: string[]
  try {
    entries = await readdir(layout.partial.root)
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_partial_root_read_failed',
      cause: error,
    })
  }
  if (entries.length !== 0) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_residue_ambiguous',
      entries,
    })
  }
  await syncDirectory(layout.namespaces.partials)
}

function assertIdentityEncoding(
  response: ArchiveTransportResponse,
): void {
  const encoding = header(response, 'content-encoding')
  if (
    encoding !== undefined &&
    encoding.trim().toLowerCase() !== 'identity'
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_content_encoding_unsupported',
    })
  }
}

function assertFullContentLength(
  admission: RuntimeReleaseAdmission,
  response: ArchiveTransportResponse,
): void {
  const value = header(response, 'content-length')
  if (value === undefined) return
  const contentLength = decodeDecimalHeader(value)
  if (contentLength !== admission.descriptor.archive.bytes) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_content_length_mismatch',
    })
  }
}

function header(
  response: ArchiveTransportResponse,
  name: string,
): string | undefined {
  const values =
    response.headers[
      name as keyof ArchiveTransportResponse['headers']
    ]
  if (values === undefined) return undefined
  if (values.length !== 1) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_response_header_ambiguous',
      header: name,
    })
  }
  return values[0]
}

function decodeDecimalHeader(value: string): number {
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_decimal_header_invalid',
    })
  }
  const decoded = Number(value)
  if (!Number.isSafeInteger(decoded)) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_decimal_header_invalid',
    })
  }
  return decoded
}

async function assertOwnedRegularFile(
  handle: FileHandle,
  mutationAuthority: RuntimeCacheMutationAuthority,
  namespace: string,
  expectedBytes: number,
  evidenceKind: string,
): Promise<RuntimeFileSystemIdentity> {
  let stats
  try {
    stats = await handle.stat({ bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: `${evidenceKind}_observation_failed`,
      cause: error,
    })
  }
  const namespaceIdentity =
    namespace ===
    path.join(mutationAuthority.snapshot.cacheRoot, 'archives')
      ? mutationAuthority.snapshot.namespaceIdentities.archives
      : mutationAuthority.snapshot.namespaceIdentities.partials
  if (
    namespaceIdentity === undefined ||
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1n ||
    Number(stats.uid) !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    Number(stats.mode & 0o7777n) !== 0o600 ||
    String(stats.dev) !== namespaceIdentity.device ||
    stats.size !== BigInt(expectedBytes)
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: evidenceKind,
    })
  }
  return {
    device: String(stats.dev),
    inode: String(stats.ino),
    ownerUid: Number(stats.uid),
  }
}

async function assertPartialPathIdentity(
  partialPath: string,
  expected: RuntimeFileSystemIdentity,
  expectedBytes: number,
): Promise<void> {
  let stats
  try {
    stats = await lstat(partialPath, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_reopen_failed',
      cause: error,
    })
  }
  if (
    stats.isSymbolicLink() ||
    !stats.isFile() ||
    String(stats.dev) !== expected.device ||
    String(stats.ino) !== expected.inode ||
    Number(stats.uid) !== expected.ownerUid ||
    stats.size !== BigInt(expectedBytes)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_identity_changed',
    })
  }
}

async function assertDirectoryIdentity(
  directory: string,
  expected: RuntimeFileSystemIdentity,
): Promise<void> {
  let stats
  try {
    stats = await lstat(directory, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_observation_failed',
      cause: error,
    })
  }
  if (
    stats.isSymbolicLink() ||
    !stats.isDirectory() ||
    String(stats.dev) !== expected.device ||
    String(stats.ino) !== expected.inode ||
    Number(stats.uid) !== expected.ownerUid ||
    Number(stats.mode & 0o7777n) !== 0o700
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_identity_changed',
    })
  }
}

async function writeFully(
  handle: FileHandle,
  chunk: Uint8Array,
  position: number,
): Promise<void> {
  let offset = 0
  try {
    while (offset < chunk.byteLength) {
      const { bytesWritten } = await handle.write(
        chunk,
        offset,
        chunk.byteLength - offset,
        position + offset,
      )
      if (bytesWritten <= 0) {
        throw new Error('archive write made no progress')
      }
      offset += bytesWritten
    }
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_partial_write_failed',
      cause: error,
    })
  }
}

async function hashFile(
  handle: FileHandle,
  expectedBytes: number,
): Promise<string> {
  const hash = createHash('sha256')
  const buffer = Buffer.allocUnsafe(64 * 1024)
  let position = 0
  try {
    while (position < expectedBytes) {
      const { bytesRead } = await handle.read(
        buffer,
        0,
        Math.min(buffer.byteLength, expectedBytes - position),
        position,
      )
      if (bytesRead <= 0) break
      hash.update(buffer.subarray(0, bytesRead))
      position += bytesRead
    }
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_hash_read_failed',
      cause: error,
    })
  }
  if (position !== expectedBytes) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_hash_length_mismatch',
    })
  }
  return hash.digest('hex')
}

async function syncDirectory(directory: string): Promise<void> {
  let handle: FileHandle
  try {
    handle = await open(
      directory,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    )
  } catch (error) {
    throw storageOrCacheError(
      error,
      'runtime_archive_directory_open_failed',
    )
  }
  try {
    await handle.sync()
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_directory_sync_failed',
      cause: error,
    })
  } finally {
    await handle.close().catch(() => undefined)
  }
}

function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) {
    throw runtimeAuthorityError('runtime_cancelled', {
      kind: 'runtime_archive_cancelled',
    })
  }
}

function storageOrCacheError(
  error: unknown,
  kind: string,
): RuntimeReleaseAuthorityError {
  if (
    isNodeError(error) &&
    (error.code === 'ELOOP' || error.code === 'ENOTDIR')
  ) {
    return runtimeAuthorityError('runtime_cache_unsafe', {
      kind,
      cause: error,
    })
  }
  return runtimeAuthorityError('runtime_storage_unavailable', {
    kind,
    cause: error,
  })
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}
