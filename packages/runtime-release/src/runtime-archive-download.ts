/// <reference types="node" />

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  lstat,
  open,
} from 'node:fs/promises'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

import {
  RuntimeDirectoryCapability,
} from './runtime-archive-directory-capability.js'
import type {
  RuntimeCapabilityStats,
} from './runtime-archive-directory-capability.js'
import type {
  ArchiveTransport,
  ArchiveTransportResponse,
} from './runtime-archive-transport.js'
import {
  ArchiveTransportNetworkError,
  isStrongArchiveEtag,
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
  readonly testOptions?: RuntimeArchiveDownloadTestOptions
  readonly transport: ArchiveTransport
}

export type RuntimeArchiveDownloadTestOptions = {
  readonly afterArchivePublishStarted?: () => void | Promise<void>
  readonly beforeArchiveHash?: () => void | Promise<void>
  readonly beforeArchivePathReadback?: () => void | Promise<void>
}

type RuntimeArchivePartialJournal = {
  readonly schemaVersion: 1
  readonly kind: 'runtime_archive_partial'
  readonly descriptor: {
    readonly archiveAssetName: string
    readonly archiveBytes: number
    readonly archiveSha256: string
    readonly launcherPackageName: 'ay-ple'
    readonly launcherVersion: string
    readonly manifestSha256: string
    readonly releaseId: string
    readonly runtimeContractVersion: number
    readonly target: 'darwin-arm64'
  }
  readonly strongEtag: string
  readonly writtenBytes: number
}

type RuntimeArchivePartialWriter = {
  readonly handle: FileHandle
  readonly identity: RuntimeFileSystemIdentity
  readonly rootAuthority: RuntimeDirectoryMutationAuthority
  journalHandle?: FileHandle
  journalIdentity?: RuntimeFileSystemIdentity
  strongEtag: string | undefined
  writtenBytes: number
}

type RuntimeDirectoryMutationAuthority = {
  readonly capability: RuntimeDirectoryCapability
  readonly directoryHandle: FileHandle
  readonly identity: RuntimeFileSystemIdentity
  readonly namespace: 'archives' | 'partials' | 'partial_root'
}

type RuntimePartialRootAuthority = {
  readonly parent: RuntimeDirectoryMutationAuthority
  readonly root: RuntimeDirectoryMutationAuthority
}

class RuntimeArchiveFreshRestart extends Error {
  constructor() {
    super('The Runtime archive response requires a fresh request.')
    this.name = 'RuntimeArchiveFreshRestart'
  }
}

class RuntimeArchiveRedirect extends Error {
  readonly url: string

  constructor(url: string) {
    super('The Runtime archive request was redirected.')
    this.name = 'RuntimeArchiveRedirect'
    this.url = url
  }
}

class RuntimeArchiveTransientHttpFailure extends Error {
  constructor() {
    super('The Runtime archive HTTP response is transient.')
    this.name = 'RuntimeArchiveTransientHttpFailure'
  }
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
  const archiveAuthority = await openArchiveNamespaceAuthority(
    input,
    mutationAuthority,
  )
  let partial: RuntimeArchivePartialWriter | undefined
  let partialRootAuthority: RuntimePartialRootAuthority | undefined
  let freshRestartUsed = false
  let transientRetryUsed = false
  const initialUrl = input.admission.descriptor.archive.url
  let requestUrl = initialUrl
  let redirectHops = 0
  let redirectUrls = new Set([initialUrl])

  try {
    const retained = await verifyRetainedArchiveIfPresent(
      input,
      mutationAuthority,
      archiveAuthority,
    )
    if (retained !== undefined) return retained
    partialRootAuthority = await preparePartialRoot(
      input,
      mutationAuthority,
    )
    partial = await loadPartialWriter(
      input,
      mutationAuthority,
      partialRootAuthority.root,
    )
    while (true) {
      try {
        return await input.transport.exchange(
          {
            url: requestUrl,
            range:
              partial?.strongEtag === undefined
                ? undefined
                : {
                    start: partial.writtenBytes,
                    ifRange: partial.strongEtag,
                  },
            signal: input.signal,
          },
          async (response) => {
            assertNotCancelled(input.signal)
            if (isTransientHttpStatus(response.statusCode)) {
              throw new RuntimeArchiveTransientHttpFailure()
            }
            if (
              response.statusCode === 401 ||
              response.statusCode === 403
            ) {
              throw runtimeAuthorityError('runtime_access_denied', {
                kind: 'runtime_archive_http_access_denied',
                statusCode: response.statusCode,
              })
            }
            if (
              response.statusCode === 404 ||
              response.statusCode === 410
            ) {
              throw runtimeAuthorityError(
                'runtime_release_unavailable',
                {
                  kind: 'runtime_archive_http_release_unavailable',
                  statusCode: response.statusCode,
                },
              )
            }
            if (isRedirectStatus(response.statusCode)) {
              throw new RuntimeArchiveRedirect(
                resolveRedirectUrl(
                  requestUrl,
                  response,
                  redirectUrls,
                  redirectHops,
                ),
              )
            }
            if (
              response.statusCode === 200 ||
              response.statusCode === 206
            ) {
              assertIdentityEncoding(response)
            }
            if (response.statusCode === 200) {
              assertFullContentLength(input.admission, response)
              partial = await prepareFreshPartialWriter(
                input,
                mutationAuthority,
                partialRootAuthority!.root,
                partial,
                decodeOptionalStrongEtag(response),
              )
            } else if (response.statusCode === 206) {
              if (partial === undefined) {
                throw runtimeAuthorityError(
                  'runtime_integrity_failed',
                  {
                    kind:
                      'runtime_archive_unsolicited_partial_response',
                  },
                )
              }
              try {
                assertPartialResponse(
                  input.admission,
                  response,
                  partial,
                )
              } catch (error) {
                if (error instanceof RuntimeReleaseAuthorityError) {
                  throw new RuntimeArchiveFreshRestart()
                }
                throw error
              }
            } else if (response.statusCode === 416) {
              if (partial === undefined) {
                throw runtimeAuthorityError(
                  'runtime_integrity_failed',
                  {
                    kind:
                      'runtime_archive_unsolicited_unsatisfied_range',
                  },
                )
              }
              try {
                assertCompleteUnsatisfiedRange(
                  input.admission,
                  response,
                  partial,
                )
              } catch (error) {
                if (error instanceof RuntimeReleaseAuthorityError) {
                  throw new RuntimeArchiveFreshRestart()
                }
                throw error
              }
              return finalizeCompletedPartial(
                input,
                mutationAuthority,
                archiveAuthority,
                partial,
              )
            } else {
              throw runtimeAuthorityError(
                'runtime_integrity_failed',
                {
                  kind: 'runtime_archive_http_status_unexpected',
                  statusCode: response.statusCode,
                },
              )
            }
            return retainResponse(
              input,
              mutationAuthority,
              archiveAuthority,
              response,
              partial,
            )
          },
        )
      } catch (error) {
        if (error instanceof RuntimeArchiveRedirect) {
          requestUrl = error.url
          redirectUrls.add(requestUrl)
          redirectHops += 1
          continue
        }
        if (error instanceof RuntimeArchiveFreshRestart) {
          if (freshRestartUsed || partial === undefined) {
            throw runtimeAuthorityError('runtime_integrity_failed', {
              kind: 'runtime_archive_fresh_restart_exhausted',
            })
          }
          freshRestartUsed = true
          await resetPartialForFreshRequest(input, partial)
          requestUrl = initialUrl
          redirectHops = 0
          redirectUrls = new Set([initialUrl])
          continue
        }
        const automaticTransient =
          error instanceof RuntimeArchiveTransientHttpFailure ||
          (error instanceof ArchiveTransportNetworkError &&
            error.automaticRetryAllowed)
        if (automaticTransient) {
          if (!transientRetryUsed) {
            transientRetryUsed = true
            requestUrl = initialUrl
            redirectHops = 0
            redirectUrls = new Set([initialUrl])
            continue
          }
          throw runtimeAuthorityError(
            'runtime_network_unavailable',
            {
              kind: 'runtime_archive_transient_retry_exhausted',
            },
          )
        }
        if (error instanceof RuntimeReleaseAuthorityError) throw error
        if (input.signal.aborted) {
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
  } finally {
    await partial?.handle.close().catch(() => undefined)
    await partial?.journalHandle?.close().catch(() => undefined)
    await partialRootAuthority?.root.capability
      .close()
      .catch(() => undefined)
    await partialRootAuthority?.root.directoryHandle
      .close()
      .catch(() => undefined)
    await partialRootAuthority?.parent.capability
      .close()
      .catch(() => undefined)
    await partialRootAuthority?.parent.directoryHandle
      .close()
      .catch(() => undefined)
    await archiveAuthority.capability.close().catch(() => undefined)
    await archiveAuthority.directoryHandle.close().catch(() => undefined)
  }
}

async function retainResponse(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
  response: ArchiveTransportResponse,
  partial: RuntimeArchivePartialWriter,
): Promise<RuntimeArchiveVerificationSnapshot> {
  try {
    for await (const chunkValue of response.body) {
      assertNotCancelled(input.signal)
      const chunk = Buffer.from(chunkValue)
      if (chunk.byteLength === 0) continue
      if (
        partial.writtenBytes >
        input.admission.descriptor.archive.bytes -
          chunk.byteLength
      ) {
        throw runtimeAuthorityError('runtime_integrity_failed', {
          kind: 'runtime_archive_stream_bound_exceeded',
        })
      }
      await writeFully(
        partial.handle,
        chunk,
        partial.writtenBytes,
      )
      partial.writtenBytes += chunk.byteLength
    }
  } catch (error) {
    await syncPartialAndJournal(input, partial)
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    if (error instanceof ArchiveTransportNetworkError) throw error
    if (input.signal.aborted) {
      throw runtimeAuthorityError('runtime_cancelled', {
        kind: 'runtime_archive_stream_cancelled',
      })
    }
    throw runtimeAuthorityError('runtime_network_unavailable', {
      kind: 'runtime_archive_stream_interrupted',
      cause: error,
    })
  }
  return finalizeCompletedPartial(
    input,
    mutationAuthority,
    archiveAuthority,
    partial,
  )
}

async function finalizeCompletedPartial(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
  partial: RuntimeArchivePartialWriter,
): Promise<RuntimeArchiveVerificationSnapshot> {
  if (input.signal.aborted) {
    await syncPartialAndJournal(input, partial)
  }
  assertNotCancelled(input.signal)
  if (
    partial.writtenBytes !==
    input.admission.descriptor.archive.bytes
  ) {
    await syncPartialAndJournal(input, partial)
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_stream_length_mismatch',
      expectedBytes: input.admission.descriptor.archive.bytes,
      actualBytes: partial.writtenBytes,
    })
  }
  try {
    await partial.handle.sync()
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_partial_sync_failed',
      cause: error,
    })
  }
  if (partial.strongEtag !== undefined) {
    await persistPartialJournal(input, partial)
  }
  await input.testOptions?.beforeArchiveHash?.()
  let digest: string
  try {
    digest = await hashRuntimeArchiveFile(
      partial.handle,
      input.admission.descriptor.archive.bytes,
      input.signal,
    )
  } catch (error) {
    if (
      error instanceof RuntimeReleaseAuthorityError &&
      error.failure.code === 'runtime_cancelled' &&
      partial.strongEtag === undefined
    ) {
      await resetRejectedPartial(input, partial)
    }
    throw error
  }
  if (digest !== input.admission.descriptor.archive.sha256) {
    await resetRejectedPartial(input, partial)
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_digest_mismatch',
    })
  }
  if (
    input.signal.aborted &&
    partial.strongEtag === undefined
  ) {
    await resetRejectedPartial(input, partial)
  }
  assertNotCancelled(input.signal)
  const verified = await publishVerifiedArchive(
    input,
    mutationAuthority,
    archiveAuthority,
    partial,
  )
  await preserveValidPartialResidue(partial)
  await assertPartialResidueReadback(input, partial)
  return verified
}

async function resetRejectedPartial(
  input: RuntimeArchiveDownloadInput,
  partial: RuntimeArchivePartialWriter,
): Promise<void> {
  try {
    await partial.handle.truncate(0)
    await partial.handle.sync()
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_rejected_partial_reset_failed',
      cause: error,
    })
  }
  partial.writtenBytes = 0
  if (partial.strongEtag !== undefined) {
    await persistPartialJournal(input, partial)
  }
}

async function preserveValidPartialResidue(
  partial: RuntimeArchivePartialWriter,
): Promise<void> {
  if (partial.strongEtag !== undefined) return
  try {
    await partial.handle.truncate(0)
    await partial.handle.sync()
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_residue_ambiguous',
      cause: error,
    })
  }
  partial.writtenBytes = 0
}

async function assertPartialResidueReadback(
  input: RuntimeArchiveDownloadInput,
  partial: RuntimeArchivePartialWriter,
): Promise<void> {
  let rootStats
  let archiveStats
  try {
    rootStats = await lstat(input.layout.partial.root, {
      bigint: true,
    })
    archiveStats = await lstat(input.layout.partial.archivePath, {
      bigint: true,
    })
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_residue_readback_failed',
      cause: error,
    })
  }
  if (
    !rootStats.isDirectory() ||
    Number(rootStats.mode & 0o7777n) !== 0o700 ||
    String(rootStats.dev) !== partial.rootAuthority.identity.device ||
    String(rootStats.ino) !== partial.rootAuthority.identity.inode ||
    Number(rootStats.uid) !==
      partial.rootAuthority.identity.ownerUid ||
    !archiveStats.isFile() ||
    archiveStats.nlink !== 1n ||
    Number(archiveStats.mode & 0o7777n) !== 0o600 ||
    String(archiveStats.dev) !== partial.identity.device ||
    String(archiveStats.ino) !== partial.identity.inode ||
    Number(archiveStats.uid) !== partial.identity.ownerUid ||
    archiveStats.size !== BigInt(partial.writtenBytes)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_residue_identity_changed',
    })
  }
  if (partial.journalIdentity === undefined) return
  let journalStats
  try {
    journalStats = await lstat(input.layout.partial.journalPath, {
      bigint: true,
    })
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_journal_residue_readback_failed',
      cause: error,
    })
  }
  if (
    !journalStats.isFile() ||
    journalStats.nlink !== 1n ||
    Number(journalStats.mode & 0o7777n) !== 0o600 ||
    String(journalStats.dev) !== partial.journalIdentity.device ||
    String(journalStats.ino) !== partial.journalIdentity.inode ||
    Number(journalStats.uid) !==
      partial.journalIdentity.ownerUid
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_journal_residue_identity_changed',
    })
  }
}

async function verifyRetainedArchiveIfPresent(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
): Promise<RuntimeArchiveVerificationSnapshot | undefined> {
  let observed: RuntimeCapabilityStats | undefined
  try {
    observed = await archiveAuthority.capability.inspectLeaf(
      path.basename(input.layout.archive.path),
    )
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_retained_inspection_failed',
      cause: error,
    })
  }
  if (observed === undefined) return undefined
  assertArchiveCapabilityEntry(
    observed,
    input,
    mutationAuthority,
    observed.identity,
    'runtime_archive_retained_identity_invalid',
  )
  return readBackVerifiedArchive(
    input,
    mutationAuthority,
    archiveAuthority,
    observed.identity,
  )
}

async function publishVerifiedArchive(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
  partial: RuntimeArchivePartialWriter,
): Promise<RuntimeArchiveVerificationSnapshot> {
  const leaf = path.basename(input.layout.archive.path)
  let archiveHandle: number | undefined
  let archiveIdentity: RuntimeFileSystemIdentity | undefined
  let mutationStarted = false
  try {
    mutationStarted = true
    const opened = await archiveAuthority.capability.openFile(
      leaf,
      0o600,
      () =>
        assertArchiveMutationAuthority(
          input,
          archiveAuthority,
        ),
    )
    archiveHandle = opened.handle
    await input.testOptions?.afterArchivePublishStarted?.()
    archiveIdentity = opened.stats.identity
    assertArchiveCapabilityEntry(
      opened.stats,
      input,
      mutationAuthority,
      archiveIdentity,
      'runtime_archive_new_identity_invalid',
      0,
    )
    await copyPartialToArchiveCapability(
      partial.handle,
      archiveAuthority.capability,
      archiveHandle,
      input.admission.descriptor.archive.bytes,
    )
    await archiveAuthority.capability.syncFile(archiveHandle)
    const finished = await archiveAuthority.capability.finishFile(
      archiveHandle,
    )
    archiveHandle = undefined
    assertArchiveCapabilityEntry(
      finished,
      input,
      mutationAuthority,
      archiveIdentity,
      'runtime_archive_new_identity_invalid',
    )
    await archiveAuthority.directoryHandle.sync()
    return await readBackVerifiedArchive(
      input,
      mutationAuthority,
      archiveAuthority,
      archiveIdentity,
      false,
    )
  } catch (error) {
    if (archiveHandle !== undefined) {
      await archiveAuthority.capability
        .closeHandle(archiveHandle)
        .catch(() => undefined)
    }
    if (
      mutationStarted ||
      (isNodeError(error) && error.code === 'EEXIST')
    ) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: mutationStarted
          ? 'runtime_archive_publish_residue_preserved'
          : 'runtime_archive_publish_destination_exists',
        cause: error,
      })
    }
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw storageOrCacheError(
      error,
      'runtime_archive_publish_failed',
    )
  }
}

async function openArchiveNamespaceAuthority(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
): Promise<RuntimeDirectoryMutationAuthority> {
  const identity =
    mutationAuthority.snapshot.namespaceIdentities.archives
  if (identity === undefined) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_namespace_missing',
    })
  }
  let directoryHandle: FileHandle | undefined
  let capability: RuntimeDirectoryCapability | undefined
  try {
    directoryHandle = await open(
      input.layout.namespaces.archives,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    await assertArchiveDirectoryHandle(
      directoryHandle,
      mutationAuthority,
      identity,
    )
    capability = await RuntimeDirectoryCapability.open({
      absolutePath: input.layout.namespaces.archives,
      identity,
      mode: 0o700,
    })
    assertArchiveDirectoryCapability(
      await capability.statDirectory(),
      mutationAuthority,
      identity,
    )
    return {
      capability,
      directoryHandle,
      identity,
      namespace: 'archives',
    }
  } catch (error) {
    await capability?.close().catch(() => undefined)
    await directoryHandle?.close().catch(() => undefined)
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_capability_unavailable',
      cause: error,
    })
  }
}

async function openPartialNamespaceAuthority(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
): Promise<RuntimeDirectoryMutationAuthority> {
  const identity =
    mutationAuthority.snapshot.namespaceIdentities.partials
  if (identity === undefined) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_partial_namespace_missing',
    })
  }
  let directoryHandle: FileHandle | undefined
  let capability: RuntimeDirectoryCapability | undefined
  try {
    directoryHandle = await open(
      input.layout.namespaces.partials,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    await assertArchiveDirectoryHandle(
      directoryHandle,
      mutationAuthority,
      identity,
    )
    capability = await RuntimeDirectoryCapability.open({
      absolutePath: input.layout.namespaces.partials,
      identity,
      mode: 0o700,
    })
    assertArchiveDirectoryCapability(
      await capability.statDirectory(),
      mutationAuthority,
      identity,
    )
    return {
      capability,
      directoryHandle,
      identity,
      namespace: 'partials',
    }
  } catch (error) {
    await capability?.close().catch(() => undefined)
    await directoryHandle?.close().catch(() => undefined)
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_namespace_capability_unavailable',
      cause: error,
    })
  }
}

async function assertArchiveMutationAuthority(
  input: RuntimeArchiveDownloadInput,
  authority: RuntimeDirectoryMutationAuthority,
): Promise<void> {
  const revalidated =
    await revalidateRuntimeCacheRootForMutation(
      input.mutationAuthority.snapshot,
    )
  const currentIdentity =
    revalidated.snapshot.namespaceIdentities.archives
  if (
    currentIdentity === undefined ||
    !sameFileSystemIdentity(currentIdentity, authority.identity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_identity_changed',
    })
  }
  await assertArchiveDirectoryHandle(
    authority.directoryHandle,
    revalidated,
    authority.identity,
  )
}

async function assertPartialNamespaceMutationAuthority(
  input: RuntimeArchiveDownloadInput,
  authority: RuntimeDirectoryMutationAuthority,
): Promise<void> {
  const revalidated =
    await revalidateRuntimeCacheRootForMutation(
      input.mutationAuthority.snapshot,
    )
  const currentIdentity =
    revalidated.snapshot.namespaceIdentities.partials
  if (
    currentIdentity === undefined ||
    !sameFileSystemIdentity(currentIdentity, authority.identity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_namespace_identity_changed',
    })
  }
  await assertArchiveDirectoryHandle(
    authority.directoryHandle,
    revalidated,
    authority.identity,
  )
}

async function assertArchiveDirectoryHandle(
  handle: FileHandle,
  mutationAuthority: RuntimeCacheMutationAuthority,
  identity: RuntimeFileSystemIdentity,
): Promise<void> {
  let stats
  try {
    stats = await handle.stat({ bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_handle_observation_failed',
      cause: error,
    })
  }
  if (
    !stats.isDirectory() ||
    Number(stats.uid) !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    Number(stats.mode & 0o7777n) !== 0o700 ||
    String(stats.dev) !== identity.device ||
    String(stats.ino) !== identity.inode ||
    Number(stats.uid) !== identity.ownerUid
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_handle_identity_changed',
    })
  }
}

function assertArchiveDirectoryCapability(
  stats: RuntimeCapabilityStats,
  mutationAuthority: RuntimeCacheMutationAuthority,
  identity: RuntimeFileSystemIdentity,
): void {
  if (
    stats.type !== 'directory' ||
    stats.mode !== 0o700 ||
    stats.identity.ownerUid !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    !sameFileSystemIdentity(stats.identity, identity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_namespace_capability_identity_changed',
    })
  }
}

function assertPartialRootCapability(
  stats: RuntimeCapabilityStats,
  mutationAuthority: RuntimeCacheMutationAuthority,
  expectedDevice: string,
  expectedIdentity: RuntimeFileSystemIdentity,
): void {
  if (
    stats.type !== 'directory' ||
    stats.mode !== 0o700 ||
    stats.identity.ownerUid !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    stats.identity.device !== expectedDevice ||
    !sameFileSystemIdentity(stats.identity, expectedIdentity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_root_identity_invalid',
    })
  }
}

async function copyPartialToArchiveCapability(
  partial: FileHandle,
  capability: RuntimeDirectoryCapability,
  archiveHandle: number,
  expectedBytes: number,
): Promise<void> {
  const buffer = Buffer.allocUnsafe(1024 * 1024)
  let position = 0
  while (position < expectedBytes) {
    let result
    try {
      result = await partial.read(
        buffer,
        0,
        Math.min(buffer.byteLength, expectedBytes - position),
        position,
      )
    } catch (error) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_archive_publish_source_read_failed',
        cause: error,
      })
    }
    if (result.bytesRead <= 0) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_publish_source_changed',
      })
    }
    await writeCapabilityFully(
      capability,
      archiveHandle,
      Buffer.from(buffer.subarray(0, result.bytesRead)),
    )
    position += result.bytesRead
  }
}

async function writeCapabilityFully(
  capability: RuntimeDirectoryCapability,
  handle: number,
  chunk: Buffer,
): Promise<void> {
  let offset = 0
  while (offset < chunk.byteLength) {
    let bytesWritten: number
    try {
      bytesWritten = await capability.writeFile(
        handle,
        chunk.subarray(offset),
      )
    } catch (error) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_archive_publish_write_failed',
        cause: error,
      })
    }
    if (bytesWritten <= 0) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_archive_publish_short_write',
      })
    }
    offset += bytesWritten
  }
}

async function readBackVerifiedArchive(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
  expectedIdentity: RuntimeFileSystemIdentity,
  observeCancellation = true,
): Promise<RuntimeArchiveVerificationSnapshot> {
  let handle: number | undefined
  try {
    if (observeCancellation) assertNotCancelled(input.signal)
    const opened =
      await archiveAuthority.capability.openVerifiedFile(
        path.basename(input.layout.archive.path),
      )
    handle = opened.handle
    assertArchiveCapabilityEntry(
      opened.stats,
      input,
      mutationAuthority,
      expectedIdentity,
      'runtime_archive_retained_identity_invalid',
    )
    const verified =
      await archiveAuthority.capability.hashVerifiedFile(
        handle,
        input.admission.descriptor.archive.bytes,
      )
    handle = undefined
    if (observeCancellation) assertNotCancelled(input.signal)
    assertArchiveCapabilityEntry(
      verified.stats,
      input,
      mutationAuthority,
      expectedIdentity,
      'runtime_archive_retained_identity_invalid',
    )
    if (
      verified.bytes !==
        input.admission.descriptor.archive.bytes ||
      verified.sha256 !==
        input.admission.descriptor.archive.sha256
    ) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_retained_digest_mismatch',
      })
    }
    await input.testOptions?.beforeArchivePathReadback?.()
    await verifyArchivePathReadback(
      input,
      mutationAuthority,
      archiveAuthority,
      expectedIdentity,
      observeCancellation,
    )
    return {
      kind: 'runtime_archive_verification_snapshot',
      release: input.admission.identity,
      archivePath: input.layout.archive.path,
      archiveIdentity: expectedIdentity,
      bytes: verified.bytes,
      sha256: verified.sha256,
    }
  } catch (error) {
    if (handle !== undefined) {
      await archiveAuthority.capability
        .closeHandle(handle)
        .catch(() => undefined)
    }
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_retained_readback_failed',
      cause: error,
    })
  }
}

async function verifyArchivePathReadback(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
  expectedIdentity: RuntimeFileSystemIdentity,
  observeCancellation: boolean,
): Promise<void> {
  let archive: FileHandle | undefined
  try {
    await assertArchiveMutationAuthority(input, archiveAuthority)
    archive = await open(
      input.layout.archive.path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    const before = await archive.stat({ bigint: true })
    assertArchivePathStats(
      before,
      mutationAuthority,
      archiveAuthority,
      expectedIdentity,
      input.admission.descriptor.archive.bytes,
    )
    const digest = await hashRuntimeArchiveFile(
      archive,
      input.admission.descriptor.archive.bytes,
      observeCancellation ? input.signal : undefined,
    )
    if (digest !== input.admission.descriptor.archive.sha256) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_path_digest_mismatch',
      })
    }
    const after = await lstat(input.layout.archive.path, {
      bigint: true,
    })
    assertArchivePathStats(
      after,
      mutationAuthority,
      archiveAuthority,
      expectedIdentity,
      input.admission.descriptor.archive.bytes,
    )
    await assertArchiveMutationAuthority(input, archiveAuthority)
  } catch (error) {
    if (
      error instanceof RuntimeReleaseAuthorityError &&
      error.failure.code === 'runtime_cancelled'
    ) {
      throw error
    }
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_path_readback_failed',
      cause: error,
    })
  } finally {
    await archive?.close().catch(() => undefined)
  }
}

function assertArchivePathStats(
  stats: BigIntStats,
  mutationAuthority: RuntimeCacheMutationAuthority,
  archiveAuthority: RuntimeDirectoryMutationAuthority,
  expectedIdentity: RuntimeFileSystemIdentity,
  expectedBytes: number,
): void {
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1n ||
    Number(stats.mode & 0o7777n) !== 0o600 ||
    Number(stats.uid) !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    String(stats.dev) !== archiveAuthority.identity.device ||
    String(stats.dev) !== expectedIdentity.device ||
    String(stats.ino) !== expectedIdentity.inode ||
    Number(stats.uid) !== expectedIdentity.ownerUid ||
    stats.size !== BigInt(expectedBytes)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_path_identity_changed',
    })
  }
}

function assertArchiveCapabilityEntry(
  stats: RuntimeCapabilityStats,
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  expectedIdentity: RuntimeFileSystemIdentity,
  evidenceKind: string,
  expectedBytes = input.admission.descriptor.archive.bytes,
): void {
  if (
    stats.type !== 'file' ||
    stats.mode !== 0o600 ||
    stats.nlink !== 1 ||
    stats.size !== String(expectedBytes) ||
    stats.identity.ownerUid !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    stats.identity.device !==
      archiveAuthorityDevice(mutationAuthority) ||
    !sameFileSystemIdentity(stats.identity, expectedIdentity)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
    })
  }
}

function archiveAuthorityDevice(
  mutationAuthority: RuntimeCacheMutationAuthority,
): string | undefined {
  return mutationAuthority.snapshot.namespaceIdentities.archives
    ?.device
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

function assertInputBindings(input: RuntimeArchiveDownloadInput): void {
  const admissionIdentity = input.admission.identity
  const layoutIdentity = input.layout.identity
  const expectedArchives = path.join(
    input.layout.cacheRoot,
    'archives',
  )
  const expectedPartials = path.join(
    input.layout.cacheRoot,
    'partials',
  )
  const expectedPartialRoot = path.join(
    expectedPartials,
    admissionIdentity.archiveSha256,
  )
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
    input.layout.namespaces.archives !== expectedArchives ||
    input.layout.namespaces.partials !== expectedPartials ||
    input.layout.archive.path !==
      path.join(
        expectedArchives,
        `${admissionIdentity.archiveSha256}.tar.gz`,
      ) ||
    input.layout.partial.root !== expectedPartialRoot ||
    input.layout.partial.archivePath !==
      path.join(expectedPartialRoot, 'archive.part') ||
    input.layout.partial.journalPath !==
      path.join(expectedPartialRoot, 'journal.json')
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

async function preparePartialRoot(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
): Promise<RuntimePartialRootAuthority> {
  const layout = input.layout
  const expectedParent =
    mutationAuthority.snapshot.namespaceIdentities.partials
  if (expectedParent === undefined) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_archive_partial_namespace_missing',
    })
  }
  const parent = await openPartialNamespaceAuthority(
    input,
    mutationAuthority,
  )
  const leaf = path.basename(layout.partial.root)
  let rootCapability: RuntimeDirectoryCapability | undefined
  let rootHandle: FileHandle | undefined
  let createdHandle: number | undefined
  let mutationStarted = false
  try {
    const observed = await parent.capability.inspectLeaf(leaf)
    let rootIdentity: RuntimeFileSystemIdentity
    if (observed === undefined) {
      mutationStarted = true
      const created = await parent.capability.createDirectory(
        leaf,
        0o700,
        () =>
          assertPartialNamespaceMutationAuthority(input, parent),
      )
      createdHandle = created.handle
      rootIdentity = created.stats.identity
      assertPartialRootCapability(
        created.stats,
        mutationAuthority,
        expectedParent.device,
        rootIdentity,
      )
      const finished = await parent.capability.finishDirectory(
        createdHandle,
        0o700,
      )
      createdHandle = undefined
      assertPartialRootCapability(
        finished,
        mutationAuthority,
        expectedParent.device,
        rootIdentity,
      )
      await parent.directoryHandle.sync()
    } else {
      rootIdentity = observed.identity
      assertPartialRootCapability(
        observed,
        mutationAuthority,
        expectedParent.device,
        rootIdentity,
      )
    }
    rootHandle = await open(
      layout.partial.root,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    await assertArchiveDirectoryHandle(
      rootHandle,
      mutationAuthority,
      rootIdentity,
    )
    rootCapability = await RuntimeDirectoryCapability.open({
      absolutePath: layout.partial.root,
      identity: rootIdentity,
      mode: 0o700,
    })
    assertPartialRootCapability(
      await rootCapability.statDirectory(),
      mutationAuthority,
      expectedParent.device,
      rootIdentity,
    )
    const entries = await rootCapability.readDirectory()
    const expectedLeaves = new Set(['archive.part', 'journal.json'])
    if (entries.some((entry) => !expectedLeaves.has(entry))) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_partial_residue_ambiguous',
        entries,
      })
    }
    return {
      parent,
      root: {
        capability: rootCapability,
        directoryHandle: rootHandle,
        identity: rootIdentity,
        namespace: 'partial_root',
      },
    }
  } catch (error) {
    if (createdHandle !== undefined) {
      await parent.capability
        .closeHandle(createdHandle)
        .catch(() => undefined)
    }
    await rootCapability?.close().catch(() => undefined)
    await rootHandle?.close().catch(() => undefined)
    await parent.capability.close().catch(() => undefined)
    await parent.directoryHandle.close().catch(() => undefined)
    if (error instanceof RuntimeReleaseAuthorityError) {
      if (!mutationStarted) throw error
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_partial_root_residue_preserved',
        cause: error,
      })
    }
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: mutationStarted
        ? 'runtime_archive_partial_root_residue_preserved'
        : 'runtime_archive_partial_root_capability_unavailable',
      cause: error,
    })
  }
}

async function createAnchoredPartialFile(input: {
  readonly absolutePath: string
  readonly evidenceKind: string
  readonly leaf: 'archive.part' | 'journal.json'
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly rootAuthority: RuntimeDirectoryMutationAuthority
}): Promise<{
  readonly handle: FileHandle
  readonly identity: RuntimeFileSystemIdentity
}> {
  // D1d supplies the cooperative per-digest cache lease. This lower
  // boundary still treats path substitution as hostile: creation is
  // relative to a retained cwd, and a pathname-opened descriptor is not
  // mutated until it matches the capability-observed inode. Completion
  // evidence is a fresh point-in-time readback; ambiguous residue is
  // preserved for D1d instead of being removed by pathname.
  let capabilityHandle: number | undefined
  let identity: RuntimeFileSystemIdentity | undefined
  let mutationStarted = false
  try {
    mutationStarted = true
    const opened = await input.rootAuthority.capability.openFile(
      input.leaf,
      0o600,
      () =>
        assertPartialRootMutationAuthority(
          input.mutationAuthority,
          input.rootAuthority,
        ),
    )
    capabilityHandle = opened.handle
    identity = opened.stats.identity
    assertPartialCapabilityFile(
      opened.stats,
      input.mutationAuthority,
      input.rootAuthority,
      identity,
      input.evidenceKind,
      0,
    )
    await input.rootAuthority.capability.syncFile(
      capabilityHandle,
    )
    const finished =
      await input.rootAuthority.capability.finishFile(
        capabilityHandle,
      )
    capabilityHandle = undefined
    assertPartialCapabilityFile(
      finished,
      input.mutationAuthority,
      input.rootAuthority,
      identity,
      input.evidenceKind,
      0,
    )
    await input.rootAuthority.directoryHandle.sync()
    return await openAnchoredPartialFile({
      ...input,
      expectedBytes: 0,
      expectedIdentity: identity,
    })
  } catch (error) {
    if (capabilityHandle !== undefined) {
      await input.rootAuthority.capability
        .closeHandle(capabilityHandle)
        .catch(() => undefined)
    }
    if (
      mutationStarted ||
      (isNodeError(error) && error.code === 'EEXIST')
    ) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: mutationStarted
          ? 'runtime_archive_partial_file_residue_preserved'
          : 'runtime_archive_partial_file_destination_exists',
        cause: error,
      })
    }
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw storageOrCacheError(error, input.evidenceKind)
  }
}

async function openAnchoredPartialFile(input: {
  readonly absolutePath: string
  readonly evidenceKind: string
  readonly expectedBytes?: number
  readonly expectedIdentity?: RuntimeFileSystemIdentity
  readonly leaf: 'archive.part' | 'journal.json'
  readonly mutationAuthority: RuntimeCacheMutationAuthority
  readonly rootAuthority: RuntimeDirectoryMutationAuthority
}): Promise<{
  readonly handle: FileHandle
  readonly identity: RuntimeFileSystemIdentity
}> {
  let observed: RuntimeCapabilityStats | undefined
  try {
    observed = await input.rootAuthority.capability.inspectLeaf(
      input.leaf,
    )
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: `${input.evidenceKind}_inspection_failed`,
      cause: error,
    })
  }
  if (observed === undefined) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: `${input.evidenceKind}_missing`,
    })
  }
  const expectedIdentity =
    input.expectedIdentity ?? observed.identity
  assertPartialCapabilityFile(
    observed,
    input.mutationAuthority,
    input.rootAuthority,
    expectedIdentity,
    input.evidenceKind,
    input.expectedBytes,
  )
  let handle: FileHandle
  try {
    handle = await open(
      input.absolutePath,
      constants.O_RDWR | constants.O_NOFOLLOW,
    )
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: `${input.evidenceKind}_open_failed`,
      cause: error,
    })
  }
  try {
    const identity = await assertOwnedRegularFile(
      handle,
      input.mutationAuthority,
      input.rootAuthority.identity.device,
      input.expectedBytes,
      input.evidenceKind,
    )
    if (!sameFileSystemIdentity(identity, expectedIdentity)) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: `${input.evidenceKind}_identity_changed`,
      })
    }
    return { handle, identity }
  } catch (error) {
    await handle.close().catch(() => undefined)
    throw error
  }
}

async function assertPartialRootMutationAuthority(
  mutationAuthority: RuntimeCacheMutationAuthority,
  rootAuthority: RuntimeDirectoryMutationAuthority,
): Promise<void> {
  const revalidated =
    await revalidateRuntimeCacheRootForMutation(
      mutationAuthority.snapshot,
    )
  const partialsIdentity =
    revalidated.snapshot.namespaceIdentities.partials
  if (
    partialsIdentity === undefined ||
    partialsIdentity.device !== rootAuthority.identity.device
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_root_authority_changed',
    })
  }
  await assertArchiveDirectoryHandle(
    rootAuthority.directoryHandle,
    revalidated,
    rootAuthority.identity,
  )
}

function assertPartialCapabilityFile(
  stats: RuntimeCapabilityStats,
  mutationAuthority: RuntimeCacheMutationAuthority,
  rootAuthority: RuntimeDirectoryMutationAuthority,
  expectedIdentity: RuntimeFileSystemIdentity,
  evidenceKind: string,
  expectedBytes?: number,
): void {
  if (
    stats.type !== 'file' ||
    stats.mode !== 0o600 ||
    stats.nlink !== 1 ||
    stats.identity.ownerUid !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    stats.identity.device !== rootAuthority.identity.device ||
    !sameFileSystemIdentity(stats.identity, expectedIdentity) ||
    (expectedBytes !== undefined &&
      stats.size !== String(expectedBytes))
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: evidenceKind,
    })
  }
}

async function loadPartialWriter(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  rootAuthority: RuntimeDirectoryMutationAuthority,
): Promise<RuntimeArchivePartialWriter | undefined> {
  const entries = [
    ...(await rootAuthority.capability.readDirectory()),
  ].sort()
  const hasArchive = entries.includes('archive.part')
  const hasJournal = entries.includes('journal.json')
  if (!hasArchive && !hasJournal) return undefined
  if (hasArchive && !hasJournal) {
    const opened = await openAnchoredPartialFile({
      absolutePath: input.layout.partial.archivePath,
      evidenceKind: 'runtime_archive_partial_identity_invalid',
      leaf: 'archive.part',
      mutationAuthority,
      rootAuthority,
    })
    const handle = opened.handle
    try {
      const stats = await handle.stat({ bigint: true })
      if (
        stats.size >
        BigInt(input.admission.descriptor.archive.bytes)
      ) {
        throw runtimeAuthorityError('runtime_cache_unsafe', {
          kind: 'runtime_archive_partial_identity_invalid',
        })
      }
      await handle.truncate(0)
      await handle.sync()
      return {
        handle,
        identity: opened.identity,
        rootAuthority,
        strongEtag: undefined,
        writtenBytes: 0,
      }
    } catch (error) {
      await handle.close().catch(() => undefined)
      throw error
    }
  }
  if (!hasArchive && hasJournal) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_partial_pair_incomplete',
    })
  }

  const openedJournal = await openAnchoredPartialFile({
    absolutePath: input.layout.partial.journalPath,
    evidenceKind: 'runtime_archive_journal_identity_invalid',
    leaf: 'journal.json',
    mutationAuthority,
    rootAuthority,
  })
  let journalEvidence: Awaited<
    ReturnType<typeof readPartialJournal>
  >
  try {
    journalEvidence = await readPartialJournal(
      input,
      mutationAuthority,
      openedJournal.handle,
      openedJournal.identity,
    )
  } catch (error) {
    await openedJournal.handle.close().catch(() => undefined)
    throw error
  }
  const journal = journalEvidence.journal
  let openedArchive: Awaited<
    ReturnType<typeof openAnchoredPartialFile>
  >
  try {
    openedArchive = await openAnchoredPartialFile({
      absolutePath: input.layout.partial.archivePath,
      evidenceKind: 'runtime_archive_partial_identity_invalid',
      expectedBytes: journal.writtenBytes,
      leaf: 'archive.part',
      mutationAuthority,
      rootAuthority,
    })
  } catch (error) {
    await openedJournal.handle.close().catch(() => undefined)
    throw error
  }
  const handle = openedArchive.handle
  try {
    return {
      handle,
      identity: openedArchive.identity,
      journalIdentity: journalEvidence.identity,
      journalHandle: openedJournal.handle,
      rootAuthority,
      strongEtag:
        journal.writtenBytes === 0
          ? undefined
          : journal.strongEtag,
      writtenBytes: journal.writtenBytes,
    }
  } catch (error) {
    await handle.close().catch(() => undefined)
    await openedJournal.handle.close().catch(() => undefined)
    throw error
  }
}

async function prepareFreshPartialWriter(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  rootAuthority: RuntimeDirectoryMutationAuthority,
  existing: RuntimeArchivePartialWriter | undefined,
  strongEtag: string | undefined,
): Promise<RuntimeArchivePartialWriter> {
  let partial = existing
  const previousStrongEtag = partial?.strongEtag
  let createdHere = false
  if (partial === undefined) {
    const created = await createAnchoredPartialFile({
      absolutePath: input.layout.partial.archivePath,
      evidenceKind: 'runtime_archive_partial_identity_invalid',
      leaf: 'archive.part',
      mutationAuthority,
      rootAuthority,
    })
    partial = {
      handle: created.handle,
      identity: created.identity,
      rootAuthority,
      strongEtag,
      writtenBytes: 0,
    }
    createdHere = true
  }
  try {
    if (!createdHere) {
      await partial.handle.truncate(0)
      await partial.handle.sync()
      partial.writtenBytes = 0
      partial.strongEtag = strongEtag
    }
    if (strongEtag !== undefined) {
      await persistPartialJournal(input, partial)
    } else if (
      partial.journalIdentity !== undefined &&
      previousStrongEtag !== undefined
    ) {
      partial.strongEtag = previousStrongEtag
      await persistPartialJournal(input, partial)
      partial.strongEtag = undefined
    }
    return partial
  } catch (error) {
    if (createdHere) {
      await partial.journalHandle?.close().catch(() => undefined)
      await partial.handle.close().catch(() => undefined)
    }
    if (
      !createdHere &&
      !(error instanceof RuntimeReleaseAuthorityError)
    ) {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_archive_partial_truncate_failed',
        cause: error,
      })
    }
    throw error
  }
}

async function resetPartialForFreshRequest(
  input: RuntimeArchiveDownloadInput,
  partial: RuntimeArchivePartialWriter,
): Promise<void> {
  try {
    await partial.handle.truncate(0)
    await partial.handle.sync()
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_partial_truncate_failed',
      cause: error,
    })
  }
  partial.writtenBytes = 0
  if (partial.strongEtag !== undefined) {
    await persistPartialJournal(input, partial)
  }
  partial.strongEtag = undefined
}

function assertPartialResponse(
  admission: RuntimeReleaseAdmission,
  response: ArchiveTransportResponse,
  partial: RuntimeArchivePartialWriter,
): void {
  const etag = decodeRequiredStrongEtag(response)
  if (
    partial.strongEtag === undefined ||
    etag !== partial.strongEtag
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_resume_validator_mismatch',
    })
  }
  const expectedEnd = admission.descriptor.archive.bytes - 1
  const contentRange = header(response, 'content-range')
  const match =
    contentRange === undefined
      ? null
      : /^bytes (0|[1-9][0-9]*)-(0|[1-9][0-9]*)\/(0|[1-9][0-9]*)$/u.exec(
          contentRange,
        )
  if (
    match === null ||
    decodeDecimalHeader(match[1]) !== partial.writtenBytes ||
    decodeDecimalHeader(match[2]) !== expectedEnd ||
    decodeDecimalHeader(match[3]) !==
      admission.descriptor.archive.bytes
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_content_range_mismatch',
    })
  }
  const expectedSuffix =
    admission.descriptor.archive.bytes - partial.writtenBytes
  const contentLength = header(response, 'content-length')
  if (
    contentLength !== undefined &&
    decodeDecimalHeader(contentLength) !== expectedSuffix
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_content_length_mismatch',
    })
  }
}

function assertCompleteUnsatisfiedRange(
  admission: RuntimeReleaseAdmission,
  response: ArchiveTransportResponse,
  partial: RuntimeArchivePartialWriter,
): void {
  const contentRange = header(response, 'content-range')
  const match =
    contentRange === undefined
      ? null
      : /^bytes \*\/(0|[1-9][0-9]*)$/u.exec(contentRange)
  if (
    match === null ||
    decodeDecimalHeader(match[1]) !==
      admission.descriptor.archive.bytes ||
    partial.writtenBytes !== admission.descriptor.archive.bytes
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_unsatisfied_range_mismatch',
    })
  }
}

function decodeOptionalStrongEtag(
  response: ArchiveTransportResponse,
): string | undefined {
  const etag = header(response, 'etag')
  if (etag === undefined) return undefined
  if (isStrongArchiveEtag(etag)) return etag
  if (
    etag.startsWith('W/') &&
    isStrongArchiveEtag(etag.slice(2))
  ) {
    return undefined
  }
  throw runtimeAuthorityError('runtime_integrity_failed', {
    kind: 'runtime_archive_response_validator_invalid',
  })
}

function decodeRequiredStrongEtag(
  response: ArchiveTransportResponse,
): string {
  const etag = header(response, 'etag')
  if (etag === undefined || !isStrongArchiveEtag(etag)) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_resume_validator_invalid',
    })
  }
  return etag
}

async function syncPartialAndJournal(
  input: RuntimeArchiveDownloadInput,
  partial: RuntimeArchivePartialWriter,
): Promise<void> {
  try {
    await partial.handle.sync()
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_partial_sync_failed',
      cause: error,
    })
  }
  if (partial.strongEtag === undefined) {
    if (partial.writtenBytes > 0) {
      try {
        await partial.handle.truncate(0)
        await partial.handle.sync()
      } catch (error) {
        throw runtimeAuthorityError('runtime_storage_unavailable', {
          kind: 'runtime_archive_weak_partial_reset_failed',
          cause: error,
        })
      }
      partial.writtenBytes = 0
    }
    return
  }
  if (
    partial.writtenBytes > 0
  ) {
    await persistPartialJournal(input, partial)
  }
}

async function persistPartialJournal(
  input: RuntimeArchiveDownloadInput,
  partial: RuntimeArchivePartialWriter,
): Promise<void> {
  if (partial.strongEtag === undefined) return
  const journal = createPartialJournal(input, partial)
  const bytes = Buffer.from(`${JSON.stringify(journal)}\n`)
  if (partial.journalHandle === undefined) {
    const created = await createAnchoredPartialFile({
      absolutePath: input.layout.partial.journalPath,
      evidenceKind: 'runtime_archive_journal_identity_invalid',
      leaf: 'journal.json',
      mutationAuthority: input.mutationAuthority,
      rootAuthority: partial.rootAuthority,
    })
    partial.journalHandle = created.handle
    partial.journalIdentity = created.identity
  }
  const handle = partial.journalHandle
  try {
    const identity = await assertOwnedRegularFile(
      handle,
      input.mutationAuthority,
      partial.rootAuthority.identity.device,
      undefined,
      'runtime_archive_journal_identity_invalid',
    )
    if (
      partial.journalIdentity === undefined ||
      !sameFileSystemIdentity(identity, partial.journalIdentity)
    ) {
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_archive_journal_identity_invalid',
      })
    }
    await writeFully(handle, bytes, 0)
    await handle.truncate(bytes.byteLength)
    await handle.sync()
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_journal_write_failed',
      cause: error,
    })
  }
}

function createPartialJournal(
  input: RuntimeArchiveDownloadInput,
  partial: Pick<
    RuntimeArchivePartialWriter,
    'strongEtag' | 'writtenBytes'
  >,
): RuntimeArchivePartialJournal {
  return {
    schemaVersion: 1,
    kind: 'runtime_archive_partial',
    descriptor: {
      archiveAssetName:
        input.admission.descriptor.archive.assetName,
      archiveBytes: input.admission.descriptor.archive.bytes,
      archiveSha256: input.admission.descriptor.archive.sha256,
      launcherPackageName: 'ay-ple',
      launcherVersion:
        input.admission.descriptor.launcher.version,
      manifestSha256: input.admission.identity.manifestSha256,
      releaseId: input.admission.identity.releaseId,
      runtimeContractVersion:
        input.admission.identity.runtimeContractVersion,
      target: input.admission.identity.target,
    },
    strongEtag: partial.strongEtag!,
    writtenBytes: partial.writtenBytes,
  }
}

async function readPartialJournal(
  input: RuntimeArchiveDownloadInput,
  mutationAuthority: RuntimeCacheMutationAuthority,
  handle: FileHandle,
  expectedIdentity: RuntimeFileSystemIdentity,
): Promise<{
  readonly identity: RuntimeFileSystemIdentity
  readonly journal: RuntimeArchivePartialJournal
}> {
  let encoded: string
  let identity: RuntimeFileSystemIdentity
  try {
    const stats = await handle.stat({ bigint: true })
    const namespaceIdentity =
      mutationAuthority.snapshot.namespaceIdentities.partials
    if (
      namespaceIdentity === undefined ||
      !stats.isFile() ||
      stats.nlink !== 1n ||
      Number(stats.uid) !==
        mutationAuthority.snapshot.expectedOwnerUid ||
      Number(stats.mode & 0o7777n) !== 0o600 ||
      String(stats.dev) !== namespaceIdentity.device ||
      String(stats.dev) !== expectedIdentity.device ||
      String(stats.ino) !== expectedIdentity.inode ||
      Number(stats.uid) !== expectedIdentity.ownerUid ||
      stats.size <= 0n ||
      stats.size > 4096n
    ) {
      throw runtimeAuthorityError('runtime_cache_unsafe', {
        kind: 'runtime_archive_journal_identity_invalid',
      })
    }
    identity = {
      device: String(stats.dev),
      inode: String(stats.ino),
      ownerUid: Number(stats.uid),
    }
    encoded = await handle.readFile('utf8')
  } catch (error) {
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_archive_journal_read_failed',
      cause: error,
    })
  }
  let value: unknown
  try {
    value = JSON.parse(encoded) as unknown
  } catch {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_journal_invalid',
    })
  }
  const journal = decodePartialJournal(value)
  if (!samePartialDescriptor(journal, input)) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_journal_descriptor_mismatch',
    })
  }
  return { identity, journal }
}

function decodePartialJournal(
  value: unknown,
): RuntimeArchivePartialJournal {
  if (
    !isExactObject(value, [
      'descriptor',
      'kind',
      'schemaVersion',
      'strongEtag',
      'writtenBytes',
    ]) ||
    value.schemaVersion !== 1 ||
    value.kind !== 'runtime_archive_partial' ||
    !isExactObject(value.descriptor, [
      'archiveAssetName',
      'archiveBytes',
      'archiveSha256',
      'launcherPackageName',
      'launcherVersion',
      'manifestSha256',
      'releaseId',
      'runtimeContractVersion',
      'target',
    ]) ||
    value.descriptor.launcherPackageName !== 'ay-ple' ||
    value.descriptor.target !== 'darwin-arm64' ||
    typeof value.descriptor.archiveAssetName !== 'string' ||
    typeof value.descriptor.launcherVersion !== 'string' ||
    typeof value.descriptor.releaseId !== 'string' ||
    typeof value.descriptor.archiveSha256 !== 'string' ||
    typeof value.descriptor.manifestSha256 !== 'string' ||
    !Number.isSafeInteger(value.descriptor.archiveBytes) ||
    !Number.isSafeInteger(
      value.descriptor.runtimeContractVersion,
    ) ||
    !Number.isSafeInteger(value.writtenBytes) ||
    Number(value.writtenBytes) < 0 ||
    Number(value.writtenBytes) >
      Number(value.descriptor.archiveBytes) ||
    typeof value.strongEtag !== 'string' ||
    !isStrongArchiveEtag(value.strongEtag)
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_archive_journal_invalid',
    })
  }
  return value as RuntimeArchivePartialJournal
}

function samePartialDescriptor(
  journal: RuntimeArchivePartialJournal,
  input: RuntimeArchiveDownloadInput,
): boolean {
  const expected = createPartialJournal(input, {
    strongEtag: journal.strongEtag,
    writtenBytes: journal.writtenBytes,
  })
  return (
    JSON.stringify(journal.descriptor) ===
    JSON.stringify(expected.descriptor)
  )
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
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

function isRedirectStatus(statusCode: number): boolean {
  return (
    statusCode === 301 ||
    statusCode === 302 ||
    statusCode === 303 ||
    statusCode === 307 ||
    statusCode === 308
  )
}

function isTransientHttpStatus(statusCode: number): boolean {
  return (
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504
  )
}

function resolveRedirectUrl(
  currentUrl: string,
  response: ArchiveTransportResponse,
  seen: ReadonlySet<string>,
  redirectHops: number,
): string {
  if (redirectHops >= 5) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_redirect_hop_limit_exceeded',
    })
  }
  const location = header(response, 'location')
  if (location === undefined || location.length > 8192) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_redirect_location_invalid',
    })
  }
  let redirected: URL
  try {
    redirected = new URL(location, currentUrl)
  } catch {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_redirect_location_invalid',
    })
  }
  if (
    redirected.protocol !== 'https:' ||
    redirected.username !== '' ||
    redirected.password !== '' ||
    redirected.hash !== '' ||
    redirected.href.length > 8192
  ) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_redirect_policy_failed',
    })
  }
  if (seen.has(redirected.href)) {
    throw runtimeAuthorityError('runtime_integrity_failed', {
      kind: 'runtime_archive_redirect_cycle',
    })
  }
  return redirected.href
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
  expectedDevice: string,
  expectedBytes: number | undefined,
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
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1n ||
    Number(stats.uid) !==
      mutationAuthority.snapshot.expectedOwnerUid ||
    Number(stats.mode & 0o7777n) !== 0o600 ||
    String(stats.dev) !== expectedDevice ||
    (expectedBytes !== undefined &&
      stats.size !== BigInt(expectedBytes))
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

export async function hashRuntimeArchiveFile(
  handle: FileHandle,
  expectedBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  const hash = createHash('sha256')
  const buffer = Buffer.allocUnsafe(64 * 1024)
  let position = 0
  try {
    while (position < expectedBytes) {
      if (signal !== undefined) assertNotCancelled(signal)
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
    if (error instanceof RuntimeReleaseAuthorityError) throw error
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

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}
