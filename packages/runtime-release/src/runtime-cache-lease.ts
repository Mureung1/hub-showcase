/// <reference types="node" />

import { constants } from 'node:fs'
import {
  lstat,
  open,
  realpath,
  unlink,
} from 'node:fs/promises'
import type { BigIntStats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'

import type {
  RuntimeCacheLayout,
  RuntimeCacheLeaseCoordinator,
  RuntimeCacheLeaseHandle,
  RuntimeCacheLeaseOwnerIdentity,
  RuntimeFileSystemIdentity,
  RuntimeGenerationVerificationReceipt,
} from './runtime-cache-authority.js'
import {
  RuntimeReleaseAuthorityError,
  runtimeAuthorityError,
} from './runtime-release-authority.js'

const MAX_LEASE_BYTES = 4096

type LeaseCallerIdentity = Omit<
  RuntimeCacheLeaseOwnerIdentity,
  'transactionNonce'
>

type DurableRuntimeCacheLease = {
  readonly schemaVersion: 1
  readonly kind: 'runtime_cache_lease'
  readonly archiveSha256: string
  readonly owner: RuntimeCacheLeaseOwnerIdentity
}

type LeaseContext = {
  readonly appDataIdentity: RuntimeFileSystemIdentity
  readonly expectedOwnerUid: number
  readonly key: string
  readonly leaseDirectory: string
  readonly leaseDirectoryIdentity: RuntimeFileSystemIdentity
}

type InProcessFlight = {
  readonly caller: LeaseCallerIdentity
  readonly completion: Promise<RuntimeGenerationVerificationReceipt>
  readonly context: LeaseContext
  readonly durableBytes: Buffer
  readonly durableLease: DurableRuntimeCacheLease
  readonly lease: RuntimeCacheLayout['lease']
  readonly reject: (error: unknown) => void
  readonly resolve: (
    receipt: RuntimeGenerationVerificationReceipt,
  ) => void
  active: boolean
  leaseIdentity?: RuntimeFileSystemIdentity
}

type AcquiredLeaseHandle = Extract<
  RuntimeCacheLeaseHandle,
  { kind: 'acquired' }
>

const IN_PROCESS_FLIGHTS = new Map<string, InProcessFlight>()
const ACQUIRED_FLIGHTS = new WeakMap<
  AcquiredLeaseHandle,
  InProcessFlight
>()

export class FileRuntimeCacheLeaseCoordinator
  implements RuntimeCacheLeaseCoordinator
{
  async acquireOrJoin(input: {
    readonly lease: RuntimeCacheLayout['lease']
    readonly owner: RuntimeCacheLeaseOwnerIdentity
    readonly signal: AbortSignal
  }): Promise<RuntimeCacheLeaseHandle> {
    assertOwner(input.owner)
    assertNotCancelled(input.signal)
    const context = await inspectLeaseContext(input.lease)
    assertNotCancelled(input.signal)
    const caller = callerIdentity(input.owner)
    const existing = IN_PROCESS_FLIGHTS.get(context.key)
    if (existing !== undefined) {
      if (
        existing.active &&
        existing.lease.path === input.lease.path &&
        sameCaller(existing.caller, caller)
      ) {
        return {
          kind: 'joined',
          completion: detachOnAbort(
            existing.completion,
            input.signal,
          ),
        }
      }
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_cache_lease_owner_conflict',
      })
    }

    let resolveCompletion:
      | ((
          receipt: RuntimeGenerationVerificationReceipt,
        ) => void)
      | undefined
    let rejectCompletion:
      | ((error: unknown) => void)
      | undefined
    const completion =
      new Promise<RuntimeGenerationVerificationReceipt>(
        (resolve, reject) => {
          resolveCompletion = resolve
          rejectCompletion = reject
        },
      )
    void completion.catch(() => undefined)
    const durableLease: DurableRuntimeCacheLease = {
      schemaVersion: 1,
      kind: 'runtime_cache_lease',
      archiveSha256: input.lease.archiveSha256,
      owner: { ...input.owner },
    }
    const durableBytes = encodeDurableLease(durableLease)
    const flight: InProcessFlight = {
      active: true,
      caller,
      completion,
      context,
      durableBytes,
      durableLease,
      lease: input.lease,
      reject: rejectCompletion!,
      resolve: resolveCompletion!,
    }
    IN_PROCESS_FLIGHTS.set(context.key, flight)

    try {
      flight.leaseIdentity = await createDurableLease(
        flight,
        input.signal,
      )
      let handle: AcquiredLeaseHandle
      handle = {
        kind: 'acquired',
        leaseIdentity: flight.leaseIdentity,
        release: () =>
          this.fail(
            handle,
            runtimeAuthorityError('runtime_cancelled', {
              kind: 'runtime_cache_lease_released',
            }),
          ),
      }
      ACQUIRED_FLIGHTS.set(handle, flight)
      return handle
    } catch (error) {
      flight.active = false
      if (IN_PROCESS_FLIGHTS.get(context.key) === flight) {
        IN_PROCESS_FLIGHTS.delete(context.key)
      }
      const normalized = normalizeLeaseAcquisitionError(error)
      flight.reject(normalized)
      throw normalized
    }
  }

  async complete(
    handle: AcquiredLeaseHandle,
    receipt: RuntimeGenerationVerificationReceipt,
  ): Promise<void> {
    const flight = requireAcquiredFlight(handle)
    assertCompletionReceipt(flight, receipt)
    try {
      await removeDurableLease(flight)
    } catch (error) {
      const normalized = runtimeAuthorityError(
        'runtime_recovery_required',
        {
          kind: 'runtime_cache_lease_release_failed',
          cause: error,
        },
      )
      settleRejectedFlight(flight, normalized)
      throw normalized
    }
    settleCompletedFlight(flight, receipt)
  }

  async fail(
    handle: AcquiredLeaseHandle,
    failure: unknown,
  ): Promise<void> {
    const flight = requireAcquiredFlight(handle)
    let settledFailure = failure
    try {
      await removeDurableLease(flight)
    } catch (error) {
      settledFailure = runtimeAuthorityError(
        'runtime_recovery_required',
        {
          kind: 'runtime_cache_lease_failure_release_failed',
          cause: error,
        },
      )
    }
    settleRejectedFlight(flight, settledFailure)
    if (settledFailure !== failure) throw settledFailure
  }

  static forgetInProcessFlightForTesting(
    lease: RuntimeCacheLayout['lease'],
  ): void {
    for (const [key, flight] of IN_PROCESS_FLIGHTS) {
      if (flight.lease.path === lease.path) {
        IN_PROCESS_FLIGHTS.delete(key)
      }
    }
  }

  async abandonForTesting(
    handle: AcquiredLeaseHandle,
  ): Promise<void> {
    await this.fail(
      handle,
      runtimeAuthorityError('runtime_cancelled', {
        kind: 'runtime_cache_lease_test_abandon',
      }),
    )
  }
}

async function inspectLeaseContext(
  lease: RuntimeCacheLayout['lease'],
): Promise<LeaseContext> {
  if (
    lease.kind !== 'lease' ||
    !/^[0-9a-f]{64}$/u.test(lease.archiveSha256) ||
    !path.isAbsolute(lease.path) ||
    path.normalize(lease.path) !== lease.path ||
    path.basename(lease.path) !== `${lease.archiveSha256}.json`
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_lease_path_invalid',
    })
  }
  const leaseDirectory = path.dirname(lease.path)
  const cacheRoot = path.dirname(leaseDirectory)
  const cacheParent = path.dirname(cacheRoot)
  const appDataRoot = path.dirname(cacheParent)
  if (
    path.basename(leaseDirectory) !== 'leases' ||
    path.basename(cacheRoot) !== 'v1' ||
    path.basename(cacheParent) !== 'runtime-cache'
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_lease_layout_invalid',
    })
  }
  const expectedOwnerUid = currentOwnerUid()
  const canonicalAppDataRoot = await realpath(appDataRoot).catch(
    (error: unknown) => {
      throw runtimeAuthorityError('runtime_storage_unavailable', {
        kind: 'runtime_cache_lease_app_data_unavailable',
        cause: error,
      })
    },
  )
  if (canonicalAppDataRoot !== appDataRoot) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_lease_app_data_noncanonical',
    })
  }
  const appDataIdentity = await inspectOwnedDirectory(
    appDataRoot,
    expectedOwnerUid,
    undefined,
    'runtime_cache_lease_app_data',
  )
  const cacheParentIdentity = await inspectOwnedDirectory(
    cacheParent,
    expectedOwnerUid,
    appDataIdentity.device,
    'runtime_cache_lease_parent',
  )
  const cacheRootIdentity = await inspectOwnedDirectory(
    cacheRoot,
    expectedOwnerUid,
    cacheParentIdentity.device,
    'runtime_cache_lease_root',
  )
  const leaseDirectoryIdentity = await inspectOwnedDirectory(
    leaseDirectory,
    expectedOwnerUid,
    cacheRootIdentity.device,
    'runtime_cache_lease_directory',
  )
  return {
    appDataIdentity,
    expectedOwnerUid,
    key:
      `${appDataIdentity.device}:${appDataIdentity.inode}:` +
      lease.archiveSha256,
    leaseDirectory,
    leaseDirectoryIdentity,
  }
}

async function createDurableLease(
  flight: InProcessFlight,
  signal: AbortSignal,
): Promise<RuntimeFileSystemIdentity> {
  let handle: FileHandle | undefined
  try {
    assertNotCancelled(signal)
    handle = await open(
      flight.lease.path,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    )
    await handle.chmod(0o600)
    await handle.writeFile(flight.durableBytes)
    await handle.sync()
    const stats = await handle.stat({ bigint: true })
    const identity = assertLeaseFileStats(
      stats,
      flight,
      undefined,
    )
    await handle.close()
    handle = undefined
    await syncLeaseDirectory(flight)
    assertNotCancelled(signal)
    await assertDurableLeaseReadback(flight, identity)
    return identity
  } catch (error) {
    await handle?.close().catch(() => undefined)
    if (isNodeError(error) && error.code === 'EEXIST') {
      await assertExistingLeaseIsPreserved(flight)
      throw runtimeAuthorityError('runtime_recovery_required', {
        kind: 'runtime_cache_lease_already_exists',
      })
    }
    if (error instanceof RuntimeReleaseAuthorityError) throw error
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: 'runtime_cache_lease_create_failed',
      cause: error,
    })
  }
}

async function assertExistingLeaseIsPreserved(
  flight: InProcessFlight,
): Promise<void> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      flight.lease.path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    const stats = await handle.stat({ bigint: true })
    assertLeaseFileStats(stats, flight, undefined)
    const bytes = await handle.readFile()
    if (bytes.byteLength > MAX_LEASE_BYTES) {
      throw new Error('Runtime cache lease exceeds its bound')
    }
    decodeDurableLease(bytes)
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_lease_existing_ambiguous',
      cause: error,
    })
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

async function assertDurableLeaseReadback(
  flight: InProcessFlight,
  expectedIdentity: RuntimeFileSystemIdentity,
): Promise<void> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      flight.lease.path,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    assertLeaseFileStats(
      await handle.stat({ bigint: true }),
      flight,
      expectedIdentity,
    )
    const bytes = await handle.readFile()
    if (!bytes.equals(flight.durableBytes)) {
      throw new Error('Runtime cache lease bytes changed')
    }
    assertLeaseFileStats(
      await lstat(flight.lease.path, { bigint: true }),
      flight,
      expectedIdentity,
    )
  } catch (error) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_lease_readback_failed',
      cause: error,
    })
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

async function removeDurableLease(
  flight: InProcessFlight,
): Promise<void> {
  if (!flight.active || flight.leaseIdentity === undefined) {
    throw new Error('Runtime cache lease is not active')
  }
  await assertDurableLeaseReadback(
    flight,
    flight.leaseIdentity,
  )
  await unlink(flight.lease.path)
  await syncLeaseDirectory(flight)
  try {
    await lstat(flight.lease.path)
    throw new Error('Runtime cache lease still exists')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return
    throw error
  }
}

async function syncLeaseDirectory(
  flight: InProcessFlight,
): Promise<void> {
  let handle: FileHandle | undefined
  try {
    handle = await open(
      flight.context.leaseDirectory,
      constants.O_RDONLY |
        constants.O_DIRECTORY |
        constants.O_NOFOLLOW,
    )
    const stats = await handle.stat({ bigint: true })
    const identity = identityFromStats(stats)
    const mode = Number(stats.mode & 0o7777n)
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      mode !== 0o700 ||
      !sameIdentity(
        identity,
        flight.context.leaseDirectoryIdentity,
      )
    ) {
      throw new Error('Runtime cache lease directory changed')
    }
    await handle.sync()
  } finally {
    await handle?.close().catch(() => undefined)
  }
}

function assertLeaseFileStats(
  stats: BigIntStats,
  flight: InProcessFlight,
  expectedIdentity: RuntimeFileSystemIdentity | undefined,
): RuntimeFileSystemIdentity {
  const identity = identityFromStats(stats)
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1n ||
    Number(stats.mode & 0o7777n) !== 0o600 ||
    identity.ownerUid !== flight.context.expectedOwnerUid ||
    identity.device !==
      flight.context.leaseDirectoryIdentity.device ||
    stats.size !== BigInt(flight.durableBytes.byteLength) ||
    (expectedIdentity !== undefined &&
      !sameIdentity(identity, expectedIdentity))
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_lease_identity_invalid',
    })
  }
  return identity
}

function assertCompletionReceipt(
  flight: InProcessFlight,
  receipt: RuntimeGenerationVerificationReceipt,
): void {
  if (
    receipt.schemaVersion !== 1 ||
    receipt.kind !== 'runtime_generation_verification' ||
    receipt.release.archiveSha256 !==
      flight.lease.archiveSha256
  ) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_lease_completion_invalid',
    })
  }
}

function settleCompletedFlight(
  flight: InProcessFlight,
  receipt: RuntimeGenerationVerificationReceipt,
): void {
  if (!flight.active) return
  flight.active = false
  if (IN_PROCESS_FLIGHTS.get(flight.context.key) === flight) {
    IN_PROCESS_FLIGHTS.delete(flight.context.key)
  }
  flight.resolve(receipt)
}

function settleRejectedFlight(
  flight: InProcessFlight,
  error: unknown,
): void {
  if (!flight.active) return
  flight.active = false
  if (IN_PROCESS_FLIGHTS.get(flight.context.key) === flight) {
    IN_PROCESS_FLIGHTS.delete(flight.context.key)
  }
  flight.reject(error)
}

function requireAcquiredFlight(
  handle: AcquiredLeaseHandle,
): InProcessFlight {
  const flight = ACQUIRED_FLIGHTS.get(handle)
  if (flight === undefined || !flight.active) {
    throw runtimeAuthorityError('runtime_recovery_required', {
      kind: 'runtime_cache_lease_handle_invalid',
    })
  }
  return flight
}

function encodeDurableLease(
  value: DurableRuntimeCacheLease,
): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`)
}

function decodeDurableLease(
  bytes: Uint8Array,
): DurableRuntimeCacheLease {
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown
  } catch {
    throw new TypeError('Runtime cache lease is invalid')
  }
  if (
    !isExactObject(value, [
      'archiveSha256',
      'kind',
      'owner',
      'schemaVersion',
    ]) ||
    value.schemaVersion !== 1 ||
    value.kind !== 'runtime_cache_lease' ||
    typeof value.archiveSha256 !== 'string' ||
    !/^[0-9a-f]{64}$/u.test(value.archiveSha256) ||
    !isExactObject(value.owner, [
      'applicationInstanceNonce',
      'processId',
      'processStartIdentity',
      'transactionNonce',
    ])
  ) {
    throw new TypeError('Runtime cache lease is invalid')
  }
  const owner = value.owner as Record<string, unknown>
  const decodedOwner = {
    applicationInstanceNonce: owner.applicationInstanceNonce,
    processId: owner.processId,
    processStartIdentity: owner.processStartIdentity,
    transactionNonce: owner.transactionNonce,
  } as RuntimeCacheLeaseOwnerIdentity
  assertOwner(decodedOwner)
  return {
    schemaVersion: 1,
    kind: 'runtime_cache_lease',
    archiveSha256: value.archiveSha256,
    owner: decodedOwner,
  }
}

function normalizeLeaseAcquisitionError(error: unknown): unknown {
  if (error instanceof RuntimeReleaseAuthorityError) return error
  return runtimeAuthorityError('runtime_storage_unavailable', {
    kind: 'runtime_cache_lease_acquisition_failed',
    cause: error,
  })
}

function detachOnAbort<T>(
  completion: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(cancelledError())
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort)
      reject(cancelledError())
    }
    signal.addEventListener('abort', onAbort, { once: true })
    void completion.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

function assertNotCancelled(signal: AbortSignal): void {
  if (signal.aborted) throw cancelledError()
}

function cancelledError(): RuntimeReleaseAuthorityError {
  return runtimeAuthorityError('runtime_cancelled', {
    kind: 'runtime_cache_lease_cancelled',
  })
}

function callerIdentity(
  owner: RuntimeCacheLeaseOwnerIdentity,
): LeaseCallerIdentity {
  return {
    applicationInstanceNonce: owner.applicationInstanceNonce,
    processId: owner.processId,
    processStartIdentity: owner.processStartIdentity,
  }
}

function sameCaller(
  left: LeaseCallerIdentity,
  right: LeaseCallerIdentity,
): boolean {
  return (
    left.applicationInstanceNonce ===
      right.applicationInstanceNonce &&
    left.processId === right.processId &&
    left.processStartIdentity === right.processStartIdentity
  )
}

function assertOwner(
  owner: RuntimeCacheLeaseOwnerIdentity,
): void {
  if (
    !/^[0-9a-f]{32}$/u.test(owner.applicationInstanceNonce) ||
    !Number.isSafeInteger(owner.processId) ||
    owner.processId <= 0 ||
    typeof owner.processStartIdentity !== 'string' ||
    owner.processStartIdentity.length === 0 ||
    owner.processStartIdentity.length > 256 ||
    !/^[\u0021-\u007e]+$/u.test(owner.processStartIdentity) ||
    !/^[0-9a-f]{32}$/u.test(owner.transactionNonce)
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: 'runtime_cache_lease_owner_invalid',
    })
  }
}

function currentOwnerUid(): number {
  const uid = process.getuid?.()
  if (uid === undefined) {
    throw runtimeAuthorityError('runtime_incompatible', {
      kind: 'runtime_cache_lease_owner_unavailable',
    })
  }
  return uid
}

async function inspectOwnedDirectory(
  directory: string,
  expectedOwnerUid: number,
  expectedDevice: string | undefined,
  evidenceKind: string,
): Promise<RuntimeFileSystemIdentity> {
  let stats: BigIntStats
  try {
    stats = await lstat(directory, { bigint: true })
  } catch (error) {
    throw runtimeAuthorityError('runtime_storage_unavailable', {
      kind: `${evidenceKind}_unavailable`,
      cause: error,
    })
  }
  const identity = identityFromStats(stats)
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    Number(stats.mode & 0o7777n) !== 0o700 ||
    identity.ownerUid !== expectedOwnerUid ||
    (expectedDevice !== undefined &&
      identity.device !== expectedDevice)
  ) {
    throw runtimeAuthorityError('runtime_cache_unsafe', {
      kind: `${evidenceKind}_invalid`,
    })
  }
  return identity
}

function identityFromStats(stats: BigIntStats): RuntimeFileSystemIdentity {
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

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && 'code' in value
}
