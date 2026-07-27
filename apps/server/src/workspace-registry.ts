import { randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  link,
  lstat,
  mkdir,
  open,
  readFile,
  realpath,
  rename,
  unlink,
} from 'node:fs/promises'
import path from 'node:path'

import {
  decodeSemesterWorkspaceStateV4Bytes,
  isWorkspaceIdV4,
  SemesterWorkspaceV4CodecError,
  type SemesterWorkspaceStateV4,
} from '@ay-ple/semester-workspace'

const registryKind = 'ay-ple.workspace-registry'
const registryFormatVersion = 1
const registryMaxBytes = 256 * 1024
const registryMaxEntries = 64
const registryDirectoryName = 'state'
const registryFileName = 'workspace-registry.json'
const writerLeaseName = '.workspace-registry-writer'
const writerLeaseStagePrefix = '.workspace-registry-writer-stage-'
const directoryMode = 0o700
const fileMode = 0o600

export type WorkspaceRegistryEntry = {
  readonly workspaceId: string
  readonly canonicalRoot: string
}

export type WorkspaceRegistryV1 = {
  readonly kind: 'ay-ple.workspace-registry'
  readonly formatVersion: 1
  readonly activeWorkspaceId: string | null
  readonly workspaces: readonly WorkspaceRegistryEntry[]
}

export type WorkspaceRegistryAuthority = {
  readonly openedBytes: Uint8Array
}

export type WorkspaceRegistryRead =
  | {
      readonly status: 'missing'
      readonly registry: WorkspaceRegistryV1
      readonly authority: null
    }
  | {
      readonly status: 'current'
      readonly registry: WorkspaceRegistryV1
      readonly authority: WorkspaceRegistryAuthority
    }
  | {
      readonly status: 'incompatible'
      readonly reason: 'malformed' | 'unsupported'
    }

export type WorkspaceRegistryWriteResult =
  | {
      readonly status: 'written'
      readonly registry: WorkspaceRegistryV1
      readonly authority: WorkspaceRegistryAuthority
    }
  | { readonly status: 'conflict' }

export type ResolvedRegistryWorkspace =
  | { readonly status: 'none' }
  | {
      readonly status: 'registry_incompatible'
      readonly reason: 'malformed' | 'unsupported'
    }
  | {
      readonly status: 'unavailable'
      readonly workspaceId: string
      readonly reason:
        | 'root_unavailable'
        | 'identity_incompatible'
        | 'identity_mismatch'
    }
  | {
      readonly status: 'available'
      readonly canonicalRoot: string
      readonly workspace: SemesterWorkspaceStateV4
    }

export type WorkspaceRegistryStoreFaultPoint =
  | 'after_temporary_sync'
  | 'before_final_compare'
  | 'after_replace'
  | 'after_directory_sync'

export type WorkspaceRegistryStoreOptions = {
  readonly appDataRoot: string
  readonly fault?: (
    point: WorkspaceRegistryStoreFaultPoint,
  ) => void | Promise<void>
}

export interface WorkspaceRegistryStore {
  read(): Promise<WorkspaceRegistryRead>
  compareAndReplace(input: {
    readonly expectedAuthority: WorkspaceRegistryAuthority | null
    readonly registry: WorkspaceRegistryV1
  }): Promise<WorkspaceRegistryWriteResult>
  resolveActiveWorkspace(): Promise<ResolvedRegistryWorkspace>
  commitActiveWorkspace(input: {
    readonly expectedAuthority: WorkspaceRegistryAuthority | null
    readonly canonicalRoot: string
    readonly expectedWorkspaceId: string
    readonly acceptCommit?: () => boolean
  }): Promise<
    | WorkspaceRegistryWriteResult
    | {
        readonly status: 'workspace_incompatible'
        readonly reason: 'root_unavailable' | 'identity_incompatible'
      }
  >
}

type OpenedRegistry = {
  readonly registry: WorkspaceRegistryV1
  readonly bytes: Buffer
  readonly identity: FileIdentity
}

type FileIdentity = {
  readonly device: number
  readonly inode: number
}

type WriterLease = {
  readonly path: string
  readonly bytes: Buffer
  readonly identity: FileIdentity
  readonly owner: {
    readonly ownerPid: number
    readonly token: string
  }
}

type WorkspaceIdentityRead =
  | {
      readonly status: 'current'
      readonly state: SemesterWorkspaceStateV4
    }
  | {
      readonly status: 'unavailable'
      readonly reason: 'root_unavailable' | 'identity_incompatible'
    }

export class WorkspaceRegistryCodecError extends TypeError {
  readonly reason: 'malformed' | 'unsupported'

  constructor(reason: 'malformed' | 'unsupported') {
    super('The WorkspaceRegistry v1 envelope is invalid.')
    this.name = 'WorkspaceRegistryCodecError'
    this.reason = reason
  }
}

export class WorkspaceRegistryStorageError extends Error {
  readonly code = 'workspace_registry_unavailable'

  constructor() {
    super('The WorkspaceRegistry store is unavailable.')
    this.name = 'WorkspaceRegistryStorageError'
  }
}

export function createWorkspaceRegistryStore(
  options: WorkspaceRegistryStoreOptions,
): WorkspaceRegistryStore {
  const appDataRoot = options.appDataRoot

  return {
    async read(): Promise<WorkspaceRegistryRead> {
      const root = await assertCanonicalAppDataRoot(appDataRoot)
      return readRegistryAt(root)
    },

    async compareAndReplace(input): Promise<WorkspaceRegistryWriteResult> {
      return writeRegistry(
        appDataRoot,
        input.expectedAuthority,
        input.registry,
        options,
      )
    },

    async resolveActiveWorkspace(): Promise<ResolvedRegistryWorkspace> {
      const root = await assertCanonicalAppDataRoot(appDataRoot)
      const observed = await readRegistryAt(root)
      if (observed.status === 'missing') return { status: 'none' }
      if (observed.status === 'incompatible') {
        return {
          status: 'registry_incompatible',
          reason: observed.reason,
        }
      }
      if (observed.registry.activeWorkspaceId === null) {
        return { status: 'none' }
      }
      const workspaceId = observed.registry.activeWorkspaceId
      const entry = observed.registry.workspaces.find(
        (candidate) => candidate.workspaceId === workspaceId,
      )
      if (!entry) {
        throw new WorkspaceRegistryStorageError()
      }
      const identity = await readWorkspaceIdentity(entry.canonicalRoot)
      if (identity.status === 'unavailable') {
        return {
          status: 'unavailable',
          workspaceId,
          reason: identity.reason,
        }
      }
      if (identity.state.workspaceId !== workspaceId) {
        return {
          status: 'unavailable',
          workspaceId,
          reason: 'identity_mismatch',
        }
      }
      return {
        status: 'available',
        canonicalRoot: entry.canonicalRoot,
        workspace: identity.state,
      }
    },

    async commitActiveWorkspace(input) {
      const canonicalRoot = await canonicalSelectedRoot(
        input.canonicalRoot,
      )
      if (!canonicalRoot) {
        return {
          status: 'workspace_incompatible',
          reason: 'root_unavailable',
        }
      }
      const identity = await readWorkspaceIdentity(canonicalRoot)
      if (identity.status === 'unavailable') {
        return {
          status: 'workspace_incompatible',
          reason: identity.reason,
        }
      }
      if (identity.state.workspaceId !== input.expectedWorkspaceId) {
        return { status: 'conflict' }
      }

      let current: WorkspaceRegistryV1
      if (input.expectedAuthority === null) {
        current = emptyWorkspaceRegistry()
      } else {
        try {
          current = decodeWorkspaceRegistryBytes(
            input.expectedAuthority.openedBytes,
          )
        } catch {
          return { status: 'conflict' }
        }
      }
      const conflictingRoot = current.workspaces.some(
        (entry) =>
          entry.canonicalRoot === canonicalRoot &&
          entry.workspaceId !== identity.state.workspaceId,
      )
      if (conflictingRoot) return { status: 'conflict' }
      const workspaces = current.workspaces.filter(
        (entry) => entry.workspaceId !== identity.state.workspaceId,
      )
      workspaces.push({
        workspaceId: identity.state.workspaceId,
        canonicalRoot,
      })
      const next: WorkspaceRegistryV1 = {
        kind: registryKind,
        formatVersion: registryFormatVersion,
        activeWorkspaceId: identity.state.workspaceId,
        workspaces,
      }
      return writeRegistry(
        appDataRoot,
        input.expectedAuthority,
        next,
        options,
        {
          canonicalRoot,
          workspaceId: identity.state.workspaceId,
        },
        input.acceptCommit,
      )
    },
  }
}

export function encodeWorkspaceRegistry(
  registry: WorkspaceRegistryV1,
): Buffer {
  const normalized = decodeWorkspaceRegistry(registry)
  const bytes = Buffer.from(
    `${JSON.stringify(normalized, null, 2)}\n`,
    'utf8',
  )
  if (bytes.byteLength > registryMaxBytes) {
    throw new WorkspaceRegistryCodecError('malformed')
  }
  return bytes
}

export function decodeWorkspaceRegistryBytes(
  bytes: Uint8Array,
): WorkspaceRegistryV1 {
  if (bytes.byteLength === 0 || bytes.byteLength > registryMaxBytes) {
    throw new WorkspaceRegistryCodecError('malformed')
  }
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown
  } catch {
    throw new WorkspaceRegistryCodecError('malformed')
  }
  return decodeWorkspaceRegistry(value)
}

function decodeWorkspaceRegistry(value: unknown): WorkspaceRegistryV1 {
  if (
    isRecord(value) &&
    value.kind === registryKind &&
    Number.isSafeInteger(value.formatVersion) &&
    value.formatVersion !== registryFormatVersion
  ) {
    throw new WorkspaceRegistryCodecError('unsupported')
  }
  if (
    !isExactRecord(value, [
      'activeWorkspaceId',
      'formatVersion',
      'kind',
      'workspaces',
    ]) ||
    value.kind !== registryKind ||
    value.formatVersion !== registryFormatVersion ||
    (value.activeWorkspaceId !== null &&
      !isWorkspaceIdV4(value.activeWorkspaceId)) ||
    !Array.isArray(value.workspaces) ||
    value.workspaces.length > registryMaxEntries
  ) {
    throw new WorkspaceRegistryCodecError('malformed')
  }

  const workspaceIds = new Set<string>()
  const canonicalRoots = new Set<string>()
  const workspaces: WorkspaceRegistryEntry[] = []
  for (const entry of value.workspaces) {
    if (
      !isExactRecord(entry, ['canonicalRoot', 'workspaceId']) ||
      !isWorkspaceIdV4(entry.workspaceId) ||
      !isNormalizedAbsolutePath(entry.canonicalRoot) ||
      workspaceIds.has(entry.workspaceId) ||
      canonicalRoots.has(entry.canonicalRoot)
    ) {
      throw new WorkspaceRegistryCodecError('malformed')
    }
    workspaceIds.add(entry.workspaceId)
    canonicalRoots.add(entry.canonicalRoot)
    workspaces.push({
      workspaceId: entry.workspaceId,
      canonicalRoot: entry.canonicalRoot,
    })
  }
  if (
    value.activeWorkspaceId !== null &&
    !workspaceIds.has(value.activeWorkspaceId)
  ) {
    throw new WorkspaceRegistryCodecError('malformed')
  }
  return {
    kind: registryKind,
    formatVersion: registryFormatVersion,
    activeWorkspaceId: value.activeWorkspaceId,
    workspaces,
  }
}

async function writeRegistry(
  configuredRoot: string,
  expectedAuthority: WorkspaceRegistryAuthority | null,
  candidate: WorkspaceRegistryV1,
  options: WorkspaceRegistryStoreOptions,
  expectedWorkspace?: WorkspaceRegistryEntry,
  acceptCommit?: () => boolean,
): Promise<WorkspaceRegistryWriteResult> {
  const registry = decodeWorkspaceRegistryBytes(
    encodeWorkspaceRegistry(candidate),
  )
  await assertRegistryRootsCurrent(registry)
  const root = await assertCanonicalAppDataRoot(configuredRoot)
  const directory = await ensureRegistryDirectory(root)
  const token = randomUUID()
  const lease = await acquireWriterLease(directory, token)
  if (!lease) return { status: 'conflict' }

  const target = path.join(directory, registryFileName)
  const temporary = path.join(
    directory,
    `.${registryFileName}.${token}.tmp`,
  )
  const guard = path.join(
    directory,
    `.${registryFileName}.${token}.compare-guard`,
  )
  let temporaryExists = false
  let guardExists = false
  let commitAccepted = false
  try {
    const observed = await readRegistryAt(root)
    const expectedBytes =
      expectedAuthority === null
        ? null
        : Buffer.from(expectedAuthority.openedBytes)
    if (
      expectedBytes === null
        ? observed.status !== 'missing'
        : observed.status !== 'current' ||
          !Buffer.from(observed.authority.openedBytes).equals(
            expectedBytes,
          )
    ) {
      return { status: 'conflict' }
    }

    const nextBytes = encodeWorkspaceRegistry(registry)
    await writeSyncedExclusiveFile(temporary, nextBytes)
    temporaryExists = true
    await syncDirectory(directory)
    await inject(options, 'after_temporary_sync')

    if (expectedBytes === null) {
      await inject(options, 'before_final_compare')
      if ((await readRegistryAt(root)).status !== 'missing') {
        return { status: 'conflict' }
      }
      await assertRegistryRootsCurrent(registry)
      if (
        expectedWorkspace &&
        !(await workspaceIdentityStillMatches(expectedWorkspace))
      ) {
        return { status: 'conflict' }
      }
      try {
        await link(temporary, target)
      } catch (error) {
        if (hasErrnoCode(error, 'EEXIST')) {
          return { status: 'conflict' }
        }
        throw new WorkspaceRegistryStorageError()
      }
      await unlink(temporary)
      temporaryExists = false
    } else {
      try {
        await link(target, guard)
        guardExists = true
      } catch {
        return { status: 'conflict' }
      }
      const guarded = await openRegistryFile(guard)
      const compared = await openRegistryFile(target)
      if (
        !guarded.bytes.equals(expectedBytes) ||
        !compared.bytes.equals(expectedBytes) ||
        !sameIdentity(guarded.identity, compared.identity)
      ) {
        return { status: 'conflict' }
      }

      await assertRegistryRootsCurrent(registry)
      if (
        expectedWorkspace &&
        !(await workspaceIdentityStillMatches(expectedWorkspace))
      ) {
        return { status: 'conflict' }
      }
      await inject(options, 'before_final_compare')
      const finalGuard = await openRegistryFile(guard)
      const finalCompared = await openRegistryFile(target)
      if (
        !finalGuard.bytes.equals(expectedBytes) ||
        !finalCompared.bytes.equals(expectedBytes) ||
        !sameIdentity(finalGuard.identity, finalCompared.identity) ||
        (expectedWorkspace &&
          !(await workspaceIdentityStillMatches(expectedWorkspace)))
      ) {
        return { status: 'conflict' }
      }
      await rename(temporary, target)
      temporaryExists = false
    }

    await inject(options, 'after_replace')
    await syncDirectory(directory)
    await inject(options, 'after_directory_sync')
    const written = await readRegistryAt(root)
    if (
      written.status !== 'current' ||
      !Buffer.from(written.authority.openedBytes).equals(
        encodeWorkspaceRegistry(registry),
      )
    ) {
      throw new WorkspaceRegistryStorageError()
    }
    if (acceptCommit && !acceptCommit()) {
      if (expectedBytes === null) {
        await unlink(target)
      } else {
        await rename(guard, target)
        guardExists = false
      }
      await syncDirectory(directory)
      return { status: 'conflict' }
    }
    commitAccepted = acceptCommit !== undefined
    if (guardExists) {
      if (commitAccepted) {
        try {
          await unlink(guard)
          guardExists = false
          await syncDirectory(directory)
        } catch {
          // The committed authority is already public. Owned residue is
          // reconciled by the next registry writer.
        }
      } else {
        await unlink(guard)
        guardExists = false
        await syncDirectory(directory)
      }
    }
    return {
      status: 'written',
      registry: written.registry,
      authority: written.authority,
    }
  } finally {
    let cleanupFailed = false
    if (temporaryExists) {
      try {
        await unlink(temporary)
      } catch {
        cleanupFailed = true
      }
    }
    if (guardExists) {
      try {
        await unlink(guard)
        await syncDirectory(directory)
      } catch {
        cleanupFailed = true
      }
    }
    try {
      await releaseWriterLease(directory, lease)
    } catch {
      cleanupFailed = true
    }
    if (cleanupFailed && !commitAccepted) {
      throw new WorkspaceRegistryStorageError()
    }
  }
}

async function readRegistryAt(
  appDataRoot: string,
): Promise<WorkspaceRegistryRead> {
  const directory = path.join(appDataRoot, registryDirectoryName)
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      return { status: 'incompatible', reason: 'malformed' }
    }
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) {
      return {
        status: 'missing',
        registry: emptyWorkspaceRegistry(),
        authority: null,
      }
    }
    throw new WorkspaceRegistryStorageError()
  }

  const target = path.join(directory, registryFileName)
  let opened: OpenedRegistry
  try {
    opened = await openRegistryFile(target)
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) {
      return {
        status: 'missing',
        registry: emptyWorkspaceRegistry(),
        authority: null,
      }
    }
    if (error instanceof WorkspaceRegistryCodecError) {
      return { status: 'incompatible', reason: error.reason }
    }
    return { status: 'incompatible', reason: 'malformed' }
  }
  return {
    status: 'current',
    registry: opened.registry,
    authority: { openedBytes: Buffer.from(opened.bytes) },
  }
}

async function openRegistryFile(target: string): Promise<OpenedRegistry> {
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
  } catch (error) {
    throw error
  }
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.size <= 0 ||
      stats.size > registryMaxBytes
    ) {
      throw new WorkspaceRegistryCodecError('malformed')
    }
    const bytes = await handle.readFile()
    return {
      registry: decodeWorkspaceRegistryBytes(bytes),
      bytes,
      identity: { device: stats.dev, inode: stats.ino },
    }
  } finally {
    await handle.close()
  }
}

async function readWorkspaceIdentity(
  canonicalRoot: string,
): Promise<WorkspaceIdentityRead> {
  const actualRoot = await canonicalSelectedRoot(canonicalRoot)
  if (actualRoot !== canonicalRoot) {
    return { status: 'unavailable', reason: 'root_unavailable' }
  }
  const target = path.join(canonicalRoot, 'workspace-state.json')
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    const stats = await handle.stat()
    if (!stats.isFile() || stats.isSymbolicLink()) {
      return {
        status: 'unavailable',
        reason: 'identity_incompatible',
      }
    }
    return {
      status: 'current',
      state: decodeSemesterWorkspaceStateV4Bytes(
        await handle.readFile(),
      ),
    }
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) {
      return { status: 'unavailable', reason: 'root_unavailable' }
    }
    if (error instanceof SemesterWorkspaceV4CodecError) {
      return {
        status: 'unavailable',
        reason: 'identity_incompatible',
      }
    }
    return {
      status: 'unavailable',
      reason: 'identity_incompatible',
    }
  } finally {
    await handle?.close()
  }
}

async function workspaceIdentityStillMatches(expected: {
  readonly canonicalRoot: string
  readonly workspaceId: string
}): Promise<boolean> {
  const identity = await readWorkspaceIdentity(expected.canonicalRoot)
  return (
    identity.status === 'current' &&
    identity.state.workspaceId === expected.workspaceId
  )
}

async function assertRegistryRootsCurrent(
  registry: WorkspaceRegistryV1,
): Promise<void> {
  for (const entry of registry.workspaces) {
    if ((await canonicalSelectedRoot(entry.canonicalRoot)) !== entry.canonicalRoot) {
      throw new WorkspaceRegistryStorageError()
    }
  }
}

async function canonicalSelectedRoot(
  candidate: string,
): Promise<string | null> {
  if (!isNormalizedAbsolutePath(candidate)) return null
  try {
    const stats = await lstat(candidate)
    if (!stats.isDirectory() || stats.isSymbolicLink()) return null
    return await realpath(candidate)
  } catch {
    return null
  }
}

async function assertCanonicalAppDataRoot(
  configuredRoot: string,
): Promise<string> {
  if (!isNormalizedAbsolutePath(configuredRoot)) {
    throw new WorkspaceRegistryStorageError()
  }
  try {
    const stats = await lstat(configuredRoot)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new WorkspaceRegistryStorageError()
    }
    const canonical = await realpath(configuredRoot)
    if (canonical !== configuredRoot) {
      throw new WorkspaceRegistryStorageError()
    }
    return canonical
  } catch (error) {
    if (error instanceof WorkspaceRegistryStorageError) throw error
    throw new WorkspaceRegistryStorageError()
  }
}

async function ensureRegistryDirectory(
  appDataRoot: string,
): Promise<string> {
  const directory = path.join(appDataRoot, registryDirectoryName)
  try {
    await mkdir(directory, { mode: directoryMode })
    await syncDirectory(appDataRoot)
  } catch (error) {
    if (!hasErrnoCode(error, 'EEXIST')) {
      throw new WorkspaceRegistryStorageError()
    }
  }
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new WorkspaceRegistryStorageError()
    }
  } catch (error) {
    if (error instanceof WorkspaceRegistryStorageError) throw error
    throw new WorkspaceRegistryStorageError()
  }
  return directory
}

async function writeSyncedExclusiveFile(
  target: string,
  bytes: Uint8Array,
): Promise<void> {
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_WRONLY |
        fsConstants.O_NOFOLLOW,
      fileMode,
    )
    await handle.writeFile(bytes)
    await handle.sync()
  } catch {
    throw new WorkspaceRegistryStorageError()
  } finally {
    await handle?.close()
  }
}

async function acquireWriterLease(
  directory: string,
  token: string,
): Promise<WriterLease | null> {
  const target = path.join(directory, writerLeaseName)
  const existing = await readWriterLease(target)
  if (existing.status === 'current') {
    if (isProcessAlive(existing.lease.owner.ownerPid)) return null
    if (
      !(await cleanupAbandonedWriterLease(
        directory,
        existing.lease,
      ))
    ) {
      return null
    }
  } else if (existing.status === 'incompatible') {
    return null
  }

  const owner = {
    formatVersion: 1 as const,
    ownerPid: process.pid,
    token,
  }
  const bytes = Buffer.from(`${JSON.stringify(owner)}\n`, 'utf8')
  const stage = path.join(
    directory,
    `${writerLeaseStagePrefix}${process.pid}-${token}`,
  )
  let stageExists = false
  try {
    await writeSyncedExclusiveFile(stage, bytes)
    stageExists = true
    await syncDirectory(directory)
    try {
      await link(stage, target)
    } catch (error) {
      if (hasErrnoCode(error, 'EEXIST')) return null
      throw new WorkspaceRegistryStorageError()
    }
    const [staged, published] = await Promise.all([
      readOwnedBytes(stage, 4096),
      readOwnedBytes(target, 4096),
    ])
    if (
      !staged.bytes.equals(bytes) ||
      !published.bytes.equals(bytes) ||
      !sameIdentity(staged.identity, published.identity)
    ) {
      throw new WorkspaceRegistryStorageError()
    }
    await unlink(stage)
    stageExists = false
    await syncDirectory(directory)
    return {
      path: target,
      bytes,
      identity: published.identity,
      owner: { ownerPid: owner.ownerPid, token: owner.token },
    }
  } finally {
    if (stageExists) {
      await unlink(stage).catch(() => undefined)
      await syncDirectory(directory).catch(() => undefined)
    }
  }
}

async function releaseWriterLease(
  directory: string,
  lease: WriterLease,
): Promise<void> {
  const current = await readOwnedBytes(lease.path, 4096)
  if (
    !current.bytes.equals(lease.bytes) ||
    !sameIdentity(current.identity, lease.identity)
  ) {
    throw new WorkspaceRegistryStorageError()
  }
  await unlink(lease.path)
  await syncDirectory(directory)
}

async function readWriterLease(
  target: string,
): Promise<
  | { readonly status: 'absent' }
  | { readonly status: 'incompatible' }
  | { readonly status: 'current'; readonly lease: WriterLease }
> {
  let opened: Awaited<ReturnType<typeof readOwnedBytes>>
  try {
    opened = await readOwnedBytes(target, 4096)
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return { status: 'absent' }
    return { status: 'incompatible' }
  }
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(opened.bytes),
    ) as unknown
  } catch {
    return { status: 'incompatible' }
  }
  if (
    !isExactRecord(value, ['formatVersion', 'ownerPid', 'token']) ||
    value.formatVersion !== 1 ||
    !Number.isSafeInteger(value.ownerPid) ||
    Number(value.ownerPid) < 1 ||
    typeof value.token !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      value.token,
    )
  ) {
    return { status: 'incompatible' }
  }
  const owner = {
    formatVersion: 1 as const,
    ownerPid: Number(value.ownerPid),
    token: value.token,
  }
  const canonical = Buffer.from(`${JSON.stringify(owner)}\n`, 'utf8')
  if (!canonical.equals(opened.bytes)) {
    return { status: 'incompatible' }
  }
  return {
    status: 'current',
    lease: {
      path: target,
      bytes: opened.bytes,
      identity: opened.identity,
      owner: {
        ownerPid: owner.ownerPid,
        token: owner.token,
      },
    },
  }
}

async function cleanupAbandonedWriterLease(
  directory: string,
  lease: WriterLease,
): Promise<boolean> {
  const token = lease.owner.token
  const ownedNames = [
    `.${registryFileName}.${token}.tmp`,
    `.${registryFileName}.${token}.compare-guard`,
    `${writerLeaseStagePrefix}${lease.owner.ownerPid}-${token}`,
  ]
  try {
    for (const name of ownedNames) {
      const target = path.join(directory, name)
      let stats
      try {
        stats = await lstat(target)
      } catch (error) {
        if (hasErrnoCode(error, 'ENOENT')) continue
        return false
      }
      if (!stats.isFile() || stats.isSymbolicLink()) return false
      await unlink(target)
    }
    const current = await readOwnedBytes(lease.path, 4096)
    if (
      !current.bytes.equals(lease.bytes) ||
      !sameIdentity(current.identity, lease.identity)
    ) {
      return false
    }
    await unlink(lease.path)
    await syncDirectory(directory)
    return true
  } catch {
    return false
  }
}

async function readOwnedBytes(
  target: string,
  maxBytes: number,
): Promise<{ readonly bytes: Buffer; readonly identity: FileIdentity }> {
  const handle = await open(
    target,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.size <= 0 ||
      stats.size > maxBytes
    ) {
      throw new WorkspaceRegistryStorageError()
    }
    return {
      bytes: await handle.readFile(),
      identity: { device: stats.dev, inode: stats.ino },
    }
  } finally {
    await handle.close()
  }
}

async function syncDirectory(directory: string): Promise<void> {
  let handle
  try {
    handle = await open(directory, fsConstants.O_RDONLY)
    await handle.sync()
  } catch {
    throw new WorkspaceRegistryStorageError()
  } finally {
    await handle?.close()
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return hasErrnoCode(error, 'EPERM')
  }
}

function emptyWorkspaceRegistry(): WorkspaceRegistryV1 {
  return {
    kind: registryKind,
    formatVersion: registryFormatVersion,
    activeWorkspaceId: null,
    workspaces: [],
  }
}

function isNormalizedAbsolutePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\0') &&
    path.isAbsolute(value) &&
    path.normalize(value) === value
  )
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.device === right.device && left.inode === right.inode
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (error as NodeJS.ErrnoException).code === code
}

async function inject(
  options: WorkspaceRegistryStoreOptions,
  point: WorkspaceRegistryStoreFaultPoint,
): Promise<void> {
  await options.fault?.(point)
}
