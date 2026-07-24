/// <reference types="node" />

import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rmdir,
  unlink,
} from 'node:fs/promises'
import path from 'node:path'

import type {
  ActiveReadyPointer,
  LaunchBinding,
  PendingSetupReceipt,
  SemesterIdentity,
  SetupEnvelopeRead,
  SetupEnvelopeStore,
  SetupEnvelopeWriteResult,
  SetupStateEnvelope,
} from './contract.js'
import { isSemesterIdentity, isWorkspaceId } from './v3-codec.js'

const setupDirectoryName = 'setup'
const versionDirectoryName = 'v1'
const stateFileName = 'state.json'
const writerLeaseName = '.setup-state-writer'
const writerIntentName = 'intent.json'
const replacementGuardName = '.state.json.compare-guard'
const directoryMode = 0o700
const fileMode = 0o600
const setupEnvelopeMaxBytes = 512 * 1024
const opaqueValueMaxBytes = 512

export type SetupEnvelopeStoreFaultPoint =
  | 'before_temp_create'
  | 'after_temp_create'
  | 'before_temp_write'
  | 'after_temp_write'
  | 'before_file_sync'
  | 'after_file_sync'
  | 'before_compare_guard'
  | 'after_compare_guard'
  | 'before_prior_compare'
  | 'after_prior_compare'
  | 'before_rename'
  | 'after_rename'
  | 'before_temp_unlink'
  | 'after_temp_unlink'
  | 'before_guard_unlink'
  | 'after_guard_unlink'
  | 'before_directory_sync'
  | 'after_directory_sync'
  | 'before_readback'
  | 'after_readback'

export type SetupEnvelopeStoreOptions = {
  readonly appDataRoot: string
  readonly fault?: (
    point: SetupEnvelopeStoreFaultPoint,
  ) => void | Promise<void>
}

type WriterLease = {
  readonly path: string
  readonly identity: FileIdentity
}

type FileIdentity = {
  readonly device: string
  readonly inode: string
  readonly birthtimeNs: string
}

type SetupWriteIntent = {
  readonly formatVersion: 1
  readonly ownerPid: number
  readonly operation: 'initial' | 'replace'
  readonly token: string
  readonly leaseIdentity: FileIdentity
  readonly expectedRevisionToken: string | null
  readonly nextRevisionToken: string
}

type PersistedSetupWriteIntent = {
  readonly value: SetupWriteIntent
  readonly bytes: Buffer
  readonly identity: FileIdentity
}

export interface RecoverableSetupEnvelopeStore
  extends SetupEnvelopeStore {
  reconcileAbandonedWrite(): Promise<SetupEnvelopeRead>
}

export class SetupStateCodecError extends TypeError {
  readonly reason: 'malformed' | 'unsupported'

  constructor(reason: 'malformed' | 'unsupported') {
    super('The setup state envelope is invalid.')
    this.name = 'SetupStateCodecError'
    this.reason = reason
  }
}

export class SetupEnvelopeStorageError extends Error {
  readonly code = 'setup_storage_unavailable'

  constructor() {
    super('The setup state store is unavailable.')
    this.name = 'SetupEnvelopeStorageError'
  }
}

export function createSetupEnvelopeStore(
  options: SetupEnvelopeStoreOptions,
): RecoverableSetupEnvelopeStore {
  const configuredRoot = options.appDataRoot
  return {
    async read(): Promise<SetupEnvelopeRead> {
      const root = await assertOwnerOnlyRoot(configuredRoot)
      return readEnvelopeAt(root)
    },

    async compareAndReplace(input): Promise<SetupEnvelopeWriteResult> {
      const root = await assertOwnerOnlyRoot(configuredRoot)
      const envelope = decodeSetupStateEnvelopeBytes(
        encodeSetupStateEnvelope(input.envelope),
      )
      const lease = await acquireWriterLease(root)
      if (!lease) return { status: 'conflict' }
      let persistedIntent: PersistedSetupWriteIntent | undefined
      let safeToRelease = true
      try {
        const observed = await readEnvelopeAt(root, {
          allowWriterLease: lease,
        })
        if (input.expectedRevisionToken === null) {
          if (observed.status !== 'absent') {
            return { status: 'conflict' }
          }
          persistedIntent = await persistWriteIntent(
            root,
            lease,
            'initial',
            null,
            envelope,
          )
          return await publishInitialEnvelope(
            root,
            lease,
            envelope,
            persistedIntent,
            options,
          )
        }
        if (
          observed.status !== 'current' ||
          observed.revisionToken !== input.expectedRevisionToken
        ) {
          return { status: 'conflict' }
        }
        persistedIntent = await persistWriteIntent(
          root,
          lease,
          'replace',
          observed.revisionToken,
          envelope,
        )
        return await replaceEnvelope(
          root,
          lease,
          observed.revisionToken,
          envelope,
          persistedIntent,
          options,
        )
      } catch (error) {
        if (persistedIntent) {
          try {
            safeToRelease = await reconcileWriteIntent(
              root,
              lease,
              persistedIntent,
            )
          } catch {
            safeToRelease = false
          }
        }
        throw error
      } finally {
        if (safeToRelease) {
          await releaseWriterLease(root, lease, persistedIntent)
        }
      }
    },

    async reconcileAbandonedWrite(): Promise<SetupEnvelopeRead> {
      const root = await assertOwnerOnlyRoot(configuredRoot)
      let lease: WriterLease | null
      try {
        lease = await readWriterLease(root)
      } catch {
        return { status: 'incompatible', reason: 'missing_state' }
      }
      if (!lease) return readEnvelopeAt(root)
      const persistedIntent = await readPersistedWriteIntent(lease)
      if (
        !persistedIntent ||
        (persistedIntent.value.ownerPid !== process.pid &&
          isProcessAlive(persistedIntent.value.ownerPid))
      ) {
        return { status: 'incompatible', reason: 'missing_state' }
      }
      const settled = await reconcileWriteIntent(
        root,
        lease,
        persistedIntent,
      )
      if (!settled) {
        return { status: 'incompatible', reason: 'missing_state' }
      }
      await releaseWriterLease(root, lease, persistedIntent)
      return readEnvelopeAt(root)
    },
  }
}

export function encodeSetupStateEnvelope(
  envelope: SetupStateEnvelope,
): Buffer {
  const normalized = decodeSetupStateEnvelope(envelope)
  return Buffer.from(`${JSON.stringify(normalized)}\n`, 'utf8')
}

export function decodeSetupStateEnvelopeBytes(
  bytes: Uint8Array,
): SetupStateEnvelope {
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > setupEnvelopeMaxBytes
  ) {
    throw new SetupStateCodecError('malformed')
  }
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown
  } catch {
    throw new SetupStateCodecError('malformed')
  }
  return decodeSetupStateEnvelope(value)
}

function decodeSetupStateEnvelope(value: unknown): SetupStateEnvelope {
  if (!isRecord(value) || value.formatVersion !== 1) {
    if (
      isRecord(value) &&
      Number.isSafeInteger(value.formatVersion) &&
      value.formatVersion !== 1
    ) {
      throw new SetupStateCodecError('unsupported')
    }
    throw new SetupStateCodecError('malformed')
  }
  if (
    !isExactRecord(value, ['formatVersion', 'revision', 'state']) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !isRecord(value.state) ||
    typeof value.state.kind !== 'string'
  ) {
    throw new SetupStateCodecError('malformed')
  }
  const revision = Number(value.revision)
  if (value.state.kind === 'empty') {
    if (!isExactRecord(value.state, ['kind'])) {
      throw new SetupStateCodecError('malformed')
    }
    return {
      formatVersion: 1,
      revision,
      state: { kind: 'empty' },
    }
  }
  if (value.state.kind === 'pending') {
    if (!isExactRecord(value.state, ['kind', 'receipt'])) {
      throw new SetupStateCodecError('malformed')
    }
    return {
      formatVersion: 1,
      revision,
      state: {
        kind: 'pending',
        receipt: decodePendingReceipt(value.state.receipt),
      },
    }
  }
  if (value.state.kind === 'active_ready') {
    if (!isExactRecord(value.state, ['kind', 'pointer'])) {
      throw new SetupStateCodecError('malformed')
    }
    return {
      formatVersion: 1,
      revision,
      state: {
        kind: 'active_ready',
        pointer: decodeActiveReadyPointer(value.state.pointer),
      },
    }
  }
  throw new SetupStateCodecError('malformed')
}

function decodePendingReceipt(value: unknown): PendingSetupReceipt {
  if (
    !isExactRecord(value, [
      'lifecycle',
      'plan',
      'release',
      'setupId',
      'setupPlanId',
      'workspace',
    ]) ||
    !isOpaqueValue(value.setupId) ||
    !isOpaqueValue(value.setupPlanId)
  ) {
    throw new SetupStateCodecError('malformed')
  }
  return {
    setupId: value.setupId,
    setupPlanId: value.setupPlanId,
    lifecycle: decodeLifecycle(value.lifecycle),
    plan: decodePlanBinding(value.plan),
    release: decodeLaunchBinding(value.release),
    workspace: decodeWorkspaceBinding(value.workspace),
  }
}

function decodeLifecycle(
  value: unknown,
): PendingSetupReceipt['lifecycle'] {
  if (!isRecord(value) || typeof value.phase !== 'string') {
    throw new SetupStateCodecError('malformed')
  }
  if (
    (value.phase === 'approved' || value.phase === 'prepared') &&
    isExactRecord(value, ['phase'])
  ) {
    return { phase: value.phase }
  }
  if (
    value.phase === 'discard_requested' &&
    isExactRecord(value, ['phase', 'rootFileIdentity']) &&
    isExactRecord(value.rootFileIdentity, [
      'birthtimeNs',
      'device',
      'inode',
    ]) &&
    isDecimalIdentity(value.rootFileIdentity.device) &&
    isDecimalIdentity(value.rootFileIdentity.inode) &&
    isDecimalIdentity(value.rootFileIdentity.birthtimeNs)
  ) {
    return {
      phase: 'discard_requested',
      rootFileIdentity: {
        device: value.rootFileIdentity.device,
        inode: value.rootFileIdentity.inode,
        birthtimeNs: value.rootFileIdentity.birthtimeNs,
      },
    }
  }
  throw new SetupStateCodecError('malformed')
}

function decodePlanBinding(
  value: unknown,
): PendingSetupReceipt['plan'] {
  if (
    !isExactRecord(value, [
      'canonicalBytesSha256',
      'semester',
      'target',
    ]) ||
    !isSha256(value.canonicalBytesSha256) ||
    !isSemesterIdentity(value.semester) ||
    !isExactRecord(value.target, [
      'canonicalParent',
      'canonicalTarget',
      'leafName',
      'parentDevice',
      'parentInode',
    ]) ||
    !isCanonicalAbsolutePath(value.target.canonicalParent) ||
    !isCanonicalAbsolutePath(value.target.canonicalTarget) ||
    !isSafeLeafName(value.target.leafName) ||
    !isDecimalIdentity(value.target.parentDevice) ||
    !isDecimalIdentity(value.target.parentInode) ||
    path.join(value.target.canonicalParent, value.target.leafName) !==
      value.target.canonicalTarget ||
    !isStrictChild(
      value.target.canonicalParent,
      value.target.canonicalTarget,
    )
  ) {
    throw new SetupStateCodecError('malformed')
  }
  return {
    canonicalBytesSha256: value.canonicalBytesSha256,
    semester: cloneSemester(value.semester),
    target: {
      canonicalParent: value.target.canonicalParent,
      parentDevice: value.target.parentDevice,
      parentInode: value.target.parentInode,
      leafName: value.target.leafName,
      canonicalTarget: value.target.canonicalTarget,
    },
  }
}

function decodeWorkspaceBinding(
  value: unknown,
): PendingSetupReceipt['workspace'] {
  if (
    !isExactRecord(value, [
      'expectedInitialAggregateSha256',
      'formatVersion',
      'ownedScaffoldPlanSha256',
      'rootMarkerSha256',
      'workspaceId',
    ]) ||
    !isWorkspaceId(value.workspaceId) ||
    value.formatVersion !== 3 ||
    !isSha256(value.rootMarkerSha256) ||
    !isSha256(value.ownedScaffoldPlanSha256) ||
    !isSha256(value.expectedInitialAggregateSha256)
  ) {
    throw new SetupStateCodecError('malformed')
  }
  return {
    workspaceId: value.workspaceId,
    formatVersion: 3,
    rootMarkerSha256: value.rootMarkerSha256,
    ownedScaffoldPlanSha256: value.ownedScaffoldPlanSha256,
    expectedInitialAggregateSha256:
      value.expectedInitialAggregateSha256,
  }
}

function decodeLaunchBinding(value: unknown): LaunchBinding {
  if (
    !isExactRecord(value, ['application', 'bundle', 'runtime']) ||
    !isExactRecord(value.application, [
      'packageName',
      'packageVersion',
    ]) ||
    value.application.packageName !== 'ay-ple' ||
    !isOpaqueValue(value.application.packageVersion) ||
    !isExactRecord(value.runtime, [
      'manifestSha256',
      'releaseDescriptorSha256',
      'releaseId',
      'runtimeContractVersion',
      'target',
    ]) ||
    !isSha256(value.runtime.releaseDescriptorSha256) ||
    !isSha256(value.runtime.manifestSha256) ||
    !isOpaqueValue(value.runtime.releaseId) ||
    value.runtime.target !== 'darwin-arm64' ||
    !Number.isSafeInteger(value.runtime.runtimeContractVersion) ||
    Number(value.runtime.runtimeContractVersion) < 1 ||
    !isExactRecord(value.bundle, [
      'completeTreeSha256',
      'descriptorSha256',
    ]) ||
    !isSha256(value.bundle.descriptorSha256) ||
    !isSha256(value.bundle.completeTreeSha256)
  ) {
    throw new SetupStateCodecError('malformed')
  }
  return {
    application: {
      packageName: 'ay-ple',
      packageVersion: value.application.packageVersion,
    },
    runtime: {
      releaseDescriptorSha256:
        value.runtime.releaseDescriptorSha256,
      manifestSha256: value.runtime.manifestSha256,
      releaseId: value.runtime.releaseId,
      target: 'darwin-arm64',
      runtimeContractVersion: Number(
        value.runtime.runtimeContractVersion,
      ),
    },
    bundle: {
      descriptorSha256: value.bundle.descriptorSha256,
      completeTreeSha256: value.bundle.completeTreeSha256,
    },
  }
}

function decodeActiveReadyPointer(value: unknown): ActiveReadyPointer {
  if (
    !isExactRecord(value, ['release', 'setupId', 'workspace']) ||
    !isOpaqueValue(value.setupId) ||
    !isExactRecord(value.workspace, [
      'canonicalRoot',
      'formatVersion',
      'workspaceId',
    ]) ||
    !isCanonicalAbsolutePath(value.workspace.canonicalRoot) ||
    !isWorkspaceId(value.workspace.workspaceId) ||
    value.workspace.formatVersion !== 3
  ) {
    throw new SetupStateCodecError('malformed')
  }
  return {
    setupId: value.setupId,
    release: decodeLaunchBinding(value.release),
    workspace: {
      canonicalRoot: value.workspace.canonicalRoot,
      workspaceId: value.workspace.workspaceId,
      formatVersion: 3,
    },
  }
}

async function publishInitialEnvelope(
  root: string,
  lease: WriterLease,
  envelope: SetupStateEnvelope,
  persistedIntent: PersistedSetupWriteIntent,
  options: SetupEnvelopeStoreOptions,
): Promise<SetupEnvelopeWriteResult> {
  const finalSetup = path.join(root, setupDirectoryName)
  const finalVersion = path.join(finalSetup, versionDirectoryName)
  const finalState = path.join(finalVersion, stateFileName)
  const temporaryState = temporaryStatePath(
    finalVersion,
    persistedIntent.value,
  )
  await inject(options, 'before_temp_create')
  try {
    try {
      await mkdir(finalSetup, { mode: directoryMode })
    } catch (error) {
      if (hasErrnoCode(error, 'EEXIST')) {
        return { status: 'conflict' }
      }
      throw unavailable()
    }
    const setupIdentity = await directoryIdentity(finalSetup)
    await mkdir(finalVersion, { mode: directoryMode })
    const versionIdentity = await directoryIdentity(finalVersion)
    const temporaryIdentity = await writeAndSyncExclusiveState(
      temporaryState,
      envelope,
      options,
    )
    await syncDirectory(finalVersion)
    await syncDirectory(finalSetup)
    await inject(options, 'before_prior_compare')
    await assertDirectoryIdentity(finalSetup, setupIdentity)
    await assertDirectoryIdentity(finalVersion, versionIdentity)
    if ((await entryKind(finalState)) !== 'absent') {
      return { status: 'conflict' }
    }
    await assertRegularFileIdentity(
      temporaryState,
      temporaryIdentity,
      1,
    )
    await inject(options, 'after_prior_compare')
    await inject(options, 'before_rename')
    try {
      await link(temporaryState, finalState)
    } catch (error) {
      if (hasErrnoCode(error, 'EEXIST')) {
        return { status: 'conflict' }
      }
      throw unavailable()
    }
    await assertLinkedPair(
      temporaryState,
      finalState,
      temporaryIdentity,
    )
    await inject(options, 'after_rename')
    await inject(options, 'before_temp_unlink')
    await unlink(temporaryState)
    await inject(options, 'after_temp_unlink')
    await inject(options, 'before_directory_sync')
    await syncDirectory(finalVersion)
    await syncDirectory(finalSetup)
    await syncDirectory(root)
    await inject(options, 'after_directory_sync')
    await assertDirectoryIdentity(finalSetup, setupIdentity)
    await assertDirectoryIdentity(finalVersion, versionIdentity)
    return await strictReadback(root, lease, envelope, options)
  } catch (error) {
    if (error instanceof SetupEnvelopeStorageError) throw error
    throw error
  }
}

async function replaceEnvelope(
  root: string,
  lease: WriterLease,
  expectedRevisionToken: string,
  envelope: SetupStateEnvelope,
  persistedIntent: PersistedSetupWriteIntent,
  options: SetupEnvelopeStoreOptions,
): Promise<SetupEnvelopeWriteResult> {
  const versionRoot = await assertCurrentStoreDirectories(root)
  const statePath = path.join(versionRoot, stateFileName)
  const temporaryPath = temporaryStatePath(
    versionRoot,
    persistedIntent.value,
  )
  const guardPath = path.join(versionRoot, replacementGuardName)
  await inject(options, 'before_temp_create')
  const temporaryIdentity = await writeAndSyncExclusiveState(
    temporaryPath,
    envelope,
    options,
  )
  await syncDirectory(versionRoot)
  await inject(options, 'before_compare_guard')
  try {
    await link(statePath, guardPath)
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) {
      throw unavailable()
    }
    throw unavailable()
  }
  const guarded = await readStateFile(statePath, [2])
  const guard = await readStateFile(guardPath, [2])
  if (
    !sameIdentity(guarded.identity, guard.identity) ||
    sha256(guarded.bytes) !== expectedRevisionToken ||
    sha256(guard.bytes) !== expectedRevisionToken
  ) {
    throw unavailable()
  }
  await inject(options, 'after_compare_guard')
  await inject(options, 'before_prior_compare')
  const compared = await readStateFile(statePath, [2])
  if (
    !sameIdentity(compared.identity, guarded.identity) ||
    sha256(compared.bytes) !== expectedRevisionToken
  ) {
    throw unavailable()
  }
  await assertRegularFileIdentity(
    temporaryPath,
    temporaryIdentity,
    1,
  )
  await inject(options, 'after_prior_compare')
  await inject(options, 'before_rename')
  try {
    await rename(temporaryPath, statePath)
  } catch {
    throw unavailable()
  }
  await inject(options, 'after_rename')
  const replaced = await readStateFile(statePath)
  const retainedPrior = await readStateFile(guardPath)
  if (
    !sameIdentity(replaced.identity, temporaryIdentity) ||
    !sameIdentity(retainedPrior.identity, guarded.identity) ||
    sha256(replaced.bytes) !== persistedIntent.value.nextRevisionToken ||
    sha256(retainedPrior.bytes) !== expectedRevisionToken
  ) {
    throw unavailable()
  }
  await inject(options, 'before_directory_sync')
  await syncDirectory(versionRoot)
  await inject(options, 'after_directory_sync')
  await inject(options, 'before_guard_unlink')
  await unlink(guardPath)
  await inject(options, 'after_guard_unlink')
  await syncDirectory(versionRoot)
  return strictReadback(root, lease, envelope, options)
}

async function writeAndSyncExclusiveState(
  target: string,
  envelope: SetupStateEnvelope,
  options: SetupEnvelopeStoreOptions,
): Promise<FileIdentity> {
  const bytes = encodeSetupStateEnvelope(envelope)
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
  } catch {
    throw unavailable()
  }
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.nlink !== 1 ||
      (stats.mode & 0o7777) !== fileMode
    ) {
      throw unavailable()
    }
    const identity = identityFromStats(stats)
    await inject(options, 'after_temp_create')
    await inject(options, 'before_temp_write')
    await handle.writeFile(bytes)
    await inject(options, 'after_temp_write')
    await inject(options, 'before_file_sync')
    await handle.sync()
    await inject(options, 'after_file_sync')
    return identity
  } finally {
    await handle.close()
  }
}

async function strictReadback(
  root: string,
  lease: WriterLease,
  expected: SetupStateEnvelope,
  options: SetupEnvelopeStoreOptions,
): Promise<SetupEnvelopeWriteResult> {
  await inject(options, 'before_readback')
  const readback = await readEnvelopeAt(root, {
    allowWriterLease: lease,
  })
  await inject(options, 'after_readback')
  if (
    readback.status !== 'current' ||
    !encodeSetupStateEnvelope(readback.envelope).equals(
      encodeSetupStateEnvelope(expected),
    )
  ) {
    throw unavailable()
  }
  return {
    status: 'written',
    envelope: readback.envelope,
    revisionToken: readback.revisionToken,
  }
}

async function readEnvelopeAt(
  root: string,
  options: {
    readonly allowWriterLease?: WriterLease
  } = {},
): Promise<SetupEnvelopeRead> {
  let writerLease: WriterLease | null
  try {
    writerLease = await readWriterLease(root)
  } catch {
    return { status: 'incompatible', reason: 'missing_state' }
  }
  if (
    writerLease &&
    (!options.allowWriterLease ||
      !sameIdentity(
        writerLease.identity,
        options.allowWriterLease.identity,
      ))
  ) {
    return { status: 'incompatible', reason: 'missing_state' }
  }
  const setupPath = path.join(root, setupDirectoryName)
  const setupKind = await entryKind(setupPath)
  if (setupKind === 'absent') return { status: 'absent' }
  if (setupKind !== 'directory') {
    return { status: 'incompatible', reason: 'missing_state' }
  }
  let versionRoot: string
  try {
    versionRoot = await assertCurrentStoreDirectories(root)
    if (
      !(await hasExactDirectoryEntries(setupPath, [
        versionDirectoryName,
      ])) ||
      !(await hasExactDirectoryEntries(versionRoot, [stateFileName]))
    ) {
      return { status: 'incompatible', reason: 'missing_state' }
    }
  } catch {
    return { status: 'incompatible', reason: 'missing_state' }
  }
  const statePath = path.join(versionRoot, stateFileName)
  let current: Awaited<ReturnType<typeof readStateFile>>
  try {
    current = await readStateFile(statePath)
  } catch (error) {
    if (error instanceof SetupStateCodecError) {
      return { status: 'incompatible', reason: error.reason }
    }
    return { status: 'incompatible', reason: 'missing_state' }
  }
  return {
    status: 'current',
    envelope: current.envelope,
    revisionToken: sha256(current.bytes),
  }
}

async function readStateFile(
  target: string,
  allowedLinkCounts: readonly number[] = [1],
): Promise<{
  bytes: Buffer
  envelope: SetupStateEnvelope
  identity: FileIdentity
}> {
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
  } catch {
    throw unavailable()
  }
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      !allowedLinkCounts.includes(stats.nlink) ||
      (stats.mode & 0o7777) !== fileMode ||
      (typeof process.getuid === 'function' &&
        stats.uid !== process.getuid()) ||
      stats.size <= 0 ||
      stats.size > setupEnvelopeMaxBytes
    ) {
      throw unavailable()
    }
    const bytes = await handle.readFile()
    return {
      bytes,
      envelope: decodeSetupStateEnvelopeBytes(bytes),
      identity: identityFromStats(stats),
    }
  } finally {
    await handle.close()
  }
}

async function acquireWriterLease(
  root: string,
): Promise<WriterLease | null> {
  const leasePath = path.join(root, writerLeaseName)
  try {
    await mkdir(leasePath, { mode: directoryMode })
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) return null
    throw unavailable()
  }
  const lease = {
    path: leasePath,
    identity: await directoryIdentity(leasePath),
  }
  await syncDirectory(root)
  return lease
}

async function readWriterLease(
  root: string,
): Promise<WriterLease | null> {
  const leasePath = path.join(root, writerLeaseName)
  if ((await entryKind(leasePath)) === 'absent') return null
  return {
    path: leasePath,
    identity: await directoryIdentity(leasePath),
  }
}

async function persistWriteIntent(
  root: string,
  lease: WriterLease,
  operation: SetupWriteIntent['operation'],
  expectedRevisionToken: string | null,
  envelope: SetupStateEnvelope,
): Promise<PersistedSetupWriteIntent> {
  await assertDirectoryIdentity(lease.path, lease.identity)
  const value: SetupWriteIntent = {
    formatVersion: 1,
    ownerPid: process.pid,
    operation,
    token: randomHex(),
    leaseIdentity: lease.identity,
    expectedRevisionToken,
    nextRevisionToken: sha256(encodeSetupStateEnvelope(envelope)),
  }
  const bytes = encodeWriteIntent(value)
  const target = path.join(lease.path, writerIntentName)
  const identity = await writeAndSyncExclusiveBytes(target, bytes)
  await syncDirectory(lease.path)
  await syncDirectory(root)
  return { value, bytes, identity }
}

async function readPersistedWriteIntent(
  lease: WriterLease,
): Promise<PersistedSetupWriteIntent | null> {
  try {
    await assertDirectoryIdentity(lease.path, lease.identity)
    if (
      !(await hasExactDirectoryEntries(lease.path, [
        writerIntentName,
      ]))
    ) {
      return null
    }
    const file = await readOwnedFile(
      path.join(lease.path, writerIntentName),
      16 * 1024,
      [1],
      false,
    )
    const value = decodeWriteIntent(file.bytes)
    if (!sameIdentity(value.leaseIdentity, lease.identity)) {
      return null
    }
    return {
      value,
      bytes: file.bytes,
      identity: file.identity,
    }
  } catch {
    return null
  }
}

async function releaseWriterLease(
  root: string,
  lease: WriterLease,
  persistedIntent?: PersistedSetupWriteIntent,
): Promise<void> {
  await assertDirectoryIdentity(lease.path, lease.identity)
  if (persistedIntent) {
    const current = await readPersistedWriteIntent(lease)
    if (
      !current ||
      !current.bytes.equals(persistedIntent.bytes) ||
      !sameIdentity(current.identity, persistedIntent.identity)
    ) {
      throw unavailable()
    }
    await unlink(path.join(lease.path, writerIntentName))
    await syncDirectory(lease.path)
  }
  if (!(await hasExactDirectoryEntries(lease.path, []))) {
    throw unavailable()
  }
  await assertDirectoryIdentity(lease.path, lease.identity)
  await rmdir(lease.path)
  await syncDirectory(root)
}

function encodeWriteIntent(value: SetupWriteIntent): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8')
}

function decodeWriteIntent(bytes: Uint8Array): SetupWriteIntent {
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    ) as unknown
  } catch {
    throw unavailable()
  }
  if (
    !isExactRecord(value, [
      'expectedRevisionToken',
      'formatVersion',
      'leaseIdentity',
      'nextRevisionToken',
      'operation',
      'ownerPid',
      'token',
    ]) ||
    value.formatVersion !== 1 ||
    !Number.isSafeInteger(value.ownerPid) ||
    Number(value.ownerPid) < 1 ||
    (value.operation !== 'initial' && value.operation !== 'replace') ||
    !isHexToken(value.token) ||
    !isFileIdentity(value.leaseIdentity) ||
    (value.expectedRevisionToken !== null &&
      !isSha256(value.expectedRevisionToken)) ||
    !isSha256(value.nextRevisionToken)
  ) {
    throw unavailable()
  }
  const decoded: SetupWriteIntent = {
    formatVersion: 1,
    ownerPid: Number(value.ownerPid),
    operation: value.operation,
    token: value.token,
    leaseIdentity: value.leaseIdentity,
    expectedRevisionToken: value.expectedRevisionToken,
    nextRevisionToken: value.nextRevisionToken,
  }
  if (!encodeWriteIntent(decoded).equals(Buffer.from(bytes))) {
    throw unavailable()
  }
  return decoded
}

async function reconcileWriteIntent(
  root: string,
  lease: WriterLease,
  persistedIntent: PersistedSetupWriteIntent,
): Promise<boolean> {
  const currentIntent = await readPersistedWriteIntent(lease)
  if (
    !currentIntent ||
    !currentIntent.bytes.equals(persistedIntent.bytes) ||
    !sameIdentity(currentIntent.identity, persistedIntent.identity)
  ) {
    return false
  }
  return persistedIntent.value.operation === 'initial'
    ? reconcileInitialWrite(root, persistedIntent.value)
    : reconcileReplacementWrite(root, persistedIntent.value)
}

async function reconcileInitialWrite(
  root: string,
  intent: SetupWriteIntent,
): Promise<boolean> {
  const setupPath = path.join(root, setupDirectoryName)
  const setupKind = await entryKind(setupPath)
  if (setupKind === 'absent') return true
  if (setupKind !== 'directory') return false
  const versionPath = path.join(setupPath, versionDirectoryName)
  const versionKind = await entryKind(versionPath)
  if (versionKind === 'absent') {
    if (!(await hasExactDirectoryEntries(setupPath, []))) return false
    const setupIdentity = await directoryIdentity(setupPath)
    await removeEmptyDirectoryIfIdentity(setupPath, setupIdentity)
    await syncDirectory(root)
    return true
  }
  if (versionKind !== 'directory') return false
  try {
    await assertCurrentStoreDirectories(root)
  } catch {
    return false
  }
  if (
    !(await hasExactDirectoryEntries(setupPath, [
      versionDirectoryName,
    ]))
  ) {
    return false
  }
  const temporaryPath = temporaryStatePath(versionPath, intent)
  const allowed = new Set([stateFileName, path.basename(temporaryPath)])
  const entries = await readdir(versionPath)
  if (entries.some((entry) => !allowed.has(entry))) return false

  const statePath = path.join(versionPath, stateFileName)
  const state = await readOptionalOwnedFile(statePath, [1, 2])
  const temporary = await readOptionalOwnedFile(
    temporaryPath,
    [1, 2],
  )
  if (temporary && !isCanonicalNextEnvelope(temporary, intent)) {
    if (temporary.linkCount !== 1) return false
    await unlink(temporaryPath)
    await syncDirectory(versionPath)
    return rollbackEmptyInitial(root, setupPath, versionPath)
  }
  if (state && !isCanonicalNextEnvelope(state, intent)) return false

  if (!state && !temporary) {
    return rollbackEmptyInitial(root, setupPath, versionPath)
  }
  if (!state && temporary) {
    if (temporary.linkCount !== 1) return false
    await syncRegularFile(temporaryPath, temporary.identity)
    try {
      await link(temporaryPath, statePath)
    } catch {
      return false
    }
    await assertLinkedPair(
      temporaryPath,
      statePath,
      temporary.identity,
    )
    await syncDirectory(versionPath)
    await unlink(temporaryPath)
    await syncDirectory(versionPath)
    await syncDirectory(setupPath)
    await syncDirectory(root)
    return true
  }
  if (state && temporary) {
    if (
      state.linkCount !== 2 ||
      temporary.linkCount !== 2 ||
      !sameIdentity(state.identity, temporary.identity)
    ) {
      return false
    }
    await unlink(temporaryPath)
    await syncDirectory(versionPath)
  } else if (state?.linkCount !== 1) {
    return false
  }
  await syncDirectory(versionPath)
  await syncDirectory(setupPath)
  await syncDirectory(root)
  return true
}

async function rollbackEmptyInitial(
  root: string,
  setupPath: string,
  versionPath: string,
): Promise<boolean> {
  if (!(await hasExactDirectoryEntries(versionPath, []))) return false
  const versionIdentity = await directoryIdentity(versionPath)
  const setupIdentity = await directoryIdentity(setupPath)
  await removeEmptyDirectoryIfIdentity(versionPath, versionIdentity)
  await removeEmptyDirectoryIfIdentity(setupPath, setupIdentity)
  await syncDirectory(root)
  return (await entryKind(setupPath)) === 'absent'
}

async function reconcileReplacementWrite(
  root: string,
  intent: SetupWriteIntent,
): Promise<boolean> {
  if (!intent.expectedRevisionToken) return false
  let versionPath: string
  try {
    versionPath = await assertCurrentStoreDirectories(root)
  } catch {
    return false
  }
  const setupPath = path.dirname(versionPath)
  if (
    !(await hasExactDirectoryEntries(setupPath, [
      versionDirectoryName,
    ]))
  ) {
    return false
  }
  const temporaryPath = temporaryStatePath(versionPath, intent)
  const statePath = path.join(versionPath, stateFileName)
  const guardPath = path.join(versionPath, replacementGuardName)
  const allowed = new Set([
    stateFileName,
    replacementGuardName,
    path.basename(temporaryPath),
  ])
  const entries = await readdir(versionPath)
  if (entries.some((entry) => !allowed.has(entry))) return false

  const state = await readOptionalOwnedFile(statePath, [1, 2])
  const guard = await readOptionalOwnedFile(guardPath, [1, 2])
  const temporary = await readOptionalOwnedFile(
    temporaryPath,
    [1],
  )
  if (!state) return false
  if (temporary && !isCanonicalNextEnvelope(temporary, intent)) {
    await unlink(temporaryPath)
    await syncDirectory(versionPath)
    return settlePriorReplacement(
      versionPath,
      statePath,
      guardPath,
      state,
      guard,
      intent,
    )
  }
  const stateToken = sha256(state.bytes)
  const guardToken = guard ? sha256(guard.bytes) : null

  if (
    stateToken === intent.nextRevisionToken &&
    state.linkCount === 1
  ) {
    if (
      guard &&
      (guardToken !== intent.expectedRevisionToken ||
        guard.linkCount !== 1)
    ) {
      return false
    }
    await syncDirectory(versionPath)
    if (guard) {
      await unlink(guardPath)
      await syncDirectory(versionPath)
    }
    if (temporary) return false
    return true
  }
  if (
    stateToken !== intent.expectedRevisionToken ||
    !isCanonicalEnvelopeBytes(state.bytes)
  ) {
    return false
  }
  if (!guard) {
    if (state.linkCount !== 1) return false
    if (temporary) {
      await unlink(temporaryPath)
      await syncDirectory(versionPath)
    }
    return true
  }
  if (
    guardToken !== intent.expectedRevisionToken ||
    state.linkCount !== 2 ||
    guard.linkCount !== 2 ||
    !sameIdentity(state.identity, guard.identity)
  ) {
    return false
  }
  if (!temporary) {
    await unlink(guardPath)
    await syncDirectory(versionPath)
    return true
  }
  await syncRegularFile(temporaryPath, temporary.identity)
  try {
    await rename(temporaryPath, statePath)
  } catch {
    return false
  }
  await syncDirectory(versionPath)
  const replaced = await readOptionalOwnedFile(statePath, [1])
  const retainedPrior = await readOptionalOwnedFile(guardPath, [1])
  if (
    !replaced ||
    !retainedPrior ||
    sha256(replaced.bytes) !== intent.nextRevisionToken ||
    sha256(retainedPrior.bytes) !== intent.expectedRevisionToken
  ) {
    return false
  }
  await unlink(guardPath)
  await syncDirectory(versionPath)
  return true
}

async function settlePriorReplacement(
  versionPath: string,
  statePath: string,
  guardPath: string,
  state: OwnedFile,
  guard: OwnedFile | null,
  intent: SetupWriteIntent,
): Promise<boolean> {
  if (
    sha256(state.bytes) !== intent.expectedRevisionToken ||
    !isCanonicalEnvelopeBytes(state.bytes)
  ) {
    return false
  }
  if (!guard) return state.linkCount === 1
  if (
    sha256(guard.bytes) !== intent.expectedRevisionToken ||
    state.linkCount !== 2 ||
    guard.linkCount !== 2 ||
    !sameIdentity(state.identity, guard.identity)
  ) {
    return false
  }
  await unlink(guardPath)
  await syncDirectory(versionPath)
  const current = await readOptionalOwnedFile(statePath, [1])
  return Boolean(
    current &&
      sha256(current.bytes) === intent.expectedRevisionToken,
  )
}

type OwnedFile = {
  readonly bytes: Buffer
  readonly identity: FileIdentity
  readonly linkCount: number
}

async function readOwnedFile(
  target: string,
  maxBytes: number,
  allowedLinkCounts: readonly number[],
  requireNonEmpty = true,
): Promise<OwnedFile> {
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
  } catch {
    throw unavailable()
  }
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      !allowedLinkCounts.includes(stats.nlink) ||
      (stats.mode & 0o7777) !== fileMode ||
      (typeof process.getuid === 'function' &&
        stats.uid !== process.getuid()) ||
      (requireNonEmpty && stats.size <= 0) ||
      stats.size > maxBytes
    ) {
      throw unavailable()
    }
    return {
      bytes: await handle.readFile(),
      identity: identityFromStats(stats),
      linkCount: stats.nlink,
    }
  } finally {
    await handle.close()
  }
}

async function readOptionalOwnedFile(
  target: string,
  allowedLinkCounts: readonly number[],
): Promise<OwnedFile | null> {
  try {
    return await readOwnedFile(
      target,
      setupEnvelopeMaxBytes,
      allowedLinkCounts,
      false,
    )
  } catch (error) {
    if ((await entryKind(target)) === 'absent') return null
    if (error instanceof SetupEnvelopeStorageError) throw error
    throw unavailable()
  }
}

async function writeAndSyncExclusiveBytes(
  target: string,
  bytes: Uint8Array,
): Promise<FileIdentity> {
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
  } catch {
    throw unavailable()
  }
  try {
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.nlink !== 1 ||
      (stats.mode & 0o7777) !== fileMode
    ) {
      throw unavailable()
    }
    await handle.writeFile(bytes)
    await handle.sync()
    return identityFromStats(stats)
  } finally {
    await handle.close()
  }
}

async function syncRegularFile(
  target: string,
  identity: FileIdentity,
): Promise<void> {
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    const stats = await handle.stat()
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      !sameIdentity(identityFromStats(stats), identity)
    ) {
      throw unavailable()
    }
    await handle.sync()
  } catch (error) {
    if (error instanceof SetupEnvelopeStorageError) throw error
    throw unavailable()
  } finally {
    await handle?.close()
  }
}

function isCanonicalNextEnvelope(
  file: OwnedFile,
  intent: SetupWriteIntent,
): boolean {
  return (
    sha256(file.bytes) === intent.nextRevisionToken &&
    isCanonicalEnvelopeBytes(file.bytes)
  )
}

function isCanonicalEnvelopeBytes(bytes: Uint8Array): boolean {
  try {
    return encodeSetupStateEnvelope(
      decodeSetupStateEnvelopeBytes(bytes),
    ).equals(Buffer.from(bytes))
  } catch {
    return false
  }
}

function temporaryStatePath(
  versionPath: string,
  intent: SetupWriteIntent,
): string {
  return path.join(
    versionPath,
    `.${stateFileName}.${intent.token}.tmp`,
  )
}

async function hasExactDirectoryEntries(
  directory: string,
  expected: readonly string[],
): Promise<boolean> {
  const actual = (await readdir(directory)).sort()
  const sortedExpected = [...expected].sort()
  return (
    actual.length === sortedExpected.length &&
    actual.every((entry, index) => entry === sortedExpected[index])
  )
}

async function directoryIdentity(
  target: string,
): Promise<FileIdentity> {
  const stats = await lstat(target)
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    (stats.mode & 0o7777) !== directoryMode ||
    (typeof process.getuid === 'function' &&
      stats.uid !== process.getuid())
  ) {
    throw unavailable()
  }
  return identityFromStats(stats)
}

async function assertDirectoryIdentity(
  target: string,
  identity: FileIdentity,
): Promise<void> {
  const current = await directoryIdentity(target)
  if (!sameIdentity(current, identity)) throw unavailable()
}

async function assertRegularFileIdentity(
  target: string,
  identity: FileIdentity,
  expectedLinks: number,
): Promise<void> {
  const file = await readOwnedFile(
    target,
    setupEnvelopeMaxBytes,
    [expectedLinks],
    false,
  )
  if (!sameIdentity(file.identity, identity)) throw unavailable()
}

async function assertLinkedPair(
  first: string,
  second: string,
  identity: FileIdentity,
): Promise<void> {
  const [left, right] = await Promise.all([
    readOwnedFile(first, setupEnvelopeMaxBytes, [2], false),
    readOwnedFile(second, setupEnvelopeMaxBytes, [2], false),
  ])
  if (
    !sameIdentity(left.identity, identity) ||
    !sameIdentity(right.identity, identity) ||
    !left.bytes.equals(right.bytes)
  ) {
    throw unavailable()
  }
}

async function removeEmptyDirectoryIfIdentity(
  target: string,
  identity: FileIdentity,
): Promise<void> {
  await assertDirectoryIdentity(target, identity)
  if (!(await hasExactDirectoryEntries(target, []))) {
    throw unavailable()
  }
  await rmdir(target)
}

function identityFromStats(stats: {
  readonly dev: number
  readonly ino: number
  readonly birthtimeMs: number
}): FileIdentity {
  return {
    device: String(stats.dev),
    inode: String(stats.ino),
    birthtimeNs: String(Math.trunc(stats.birthtimeMs * 1_000_000)),
  }
}

function sameIdentity(
  left: FileIdentity,
  right: FileIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.birthtimeNs === right.birthtimeNs
  )
}

function isFileIdentity(value: unknown): value is FileIdentity {
  return (
    isExactRecord(value, ['birthtimeNs', 'device', 'inode']) &&
    isDecimalIdentity(value.device) &&
    isDecimalIdentity(value.inode) &&
    isDecimalIdentity(value.birthtimeNs)
  )
}

function isHexToken(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value)
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return !hasErrnoCode(error, 'ESRCH')
  }
}

async function assertOwnerOnlyRoot(configuredRoot: string): Promise<string> {
  if (
    !path.isAbsolute(configuredRoot) ||
    path.resolve(configuredRoot) !== configuredRoot
  ) {
    throw unavailable()
  }
  try {
    const [canonicalRoot, stats] = await Promise.all([
      realpath(configuredRoot),
      lstat(configuredRoot),
    ])
    if (
      canonicalRoot !== configuredRoot ||
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      (stats.mode & 0o7777) !== directoryMode ||
      (typeof process.getuid === 'function' &&
        stats.uid !== process.getuid())
    ) {
      throw unavailable()
    }
    return canonicalRoot
  } catch (error) {
    if (error instanceof SetupEnvelopeStorageError) throw error
    throw unavailable()
  }
}

async function assertCurrentStoreDirectories(
  root: string,
): Promise<string> {
  const setupPath = path.join(root, setupDirectoryName)
  const versionPath = path.join(setupPath, versionDirectoryName)
  for (const directory of [setupPath, versionPath]) {
    const stats = await lstat(directory)
    if (
      !stats.isDirectory() ||
      stats.isSymbolicLink() ||
      (stats.mode & 0o7777) !== directoryMode ||
      (typeof process.getuid === 'function' &&
        stats.uid !== process.getuid())
    ) {
      throw unavailable()
    }
  }
  return versionPath
}

async function syncDirectory(directory: string): Promise<void> {
  let handle
  try {
    handle = await open(directory, fsConstants.O_RDONLY)
    const stats = await handle.stat()
    if (!stats.isDirectory()) throw unavailable()
    await handle.sync()
  } catch (error) {
    if (error instanceof SetupEnvelopeStorageError) throw error
    throw unavailable()
  } finally {
    await handle?.close()
  }
}

async function entryKind(
  target: string,
): Promise<'absent' | 'directory' | 'other'> {
  try {
    const stats = await lstat(target)
    return stats.isDirectory() && !stats.isSymbolicLink()
      ? 'directory'
      : 'other'
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return 'absent'
    throw unavailable()
  }
}

async function inject(
  options: SetupEnvelopeStoreOptions,
  point: SetupEnvelopeStoreFaultPoint,
): Promise<void> {
  await options.fault?.(point)
}

function cloneSemester(value: SemesterIdentity): SemesterIdentity {
  return {
    yearLevel: value.yearLevel,
    term: {
      key: value.term.key,
      displayName: value.term.displayName,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function isOpaqueValue(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= opaqueValueMaxBytes &&
    !/[\u0000-\u001f\u007f/\\]/.test(value)
  )
}

function isDecimalIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isSafeLeafName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value !== '' &&
    value !== '.' &&
    value !== '..' &&
    !value.includes('/') &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    Buffer.byteLength(value, 'utf8') <= 255
  )
}

function isCanonicalAbsolutePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    path.resolve(value) === value &&
    path.parse(value).root !== value
  )
}

function isStrictChild(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function randomHex(): string {
  return randomUUID().replaceAll('-', '')
}

function unavailable(): SetupEnvelopeStorageError {
  return new SetupEnvelopeStorageError()
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}
