/// <reference types="node" />

import { createHash, randomUUID } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
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
  | 'before_prior_compare'
  | 'after_prior_compare'
  | 'before_rename'
  | 'after_rename'
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
): SetupEnvelopeStore {
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
      const observed = await readEnvelopeAt(root)
      if (input.expectedRevisionToken === null) {
        return observed.status === 'absent'
          ? publishInitialEnvelope(root, envelope, options)
          : { status: 'conflict' }
      }
      if (
        observed.status !== 'current' ||
        observed.revisionToken !== input.expectedRevisionToken
      ) {
        return { status: 'conflict' }
      }
      return replaceEnvelope(
        root,
        observed.revisionToken,
        envelope,
        options,
      )
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
  envelope: SetupStateEnvelope,
  options: SetupEnvelopeStoreOptions,
): Promise<SetupEnvelopeWriteResult> {
  const token = randomHex()
  const stagingRoot = path.join(root, `.setup-stage-${token}`)
  const stagingVersion = path.join(stagingRoot, versionDirectoryName)
  const stagingState = path.join(stagingVersion, stateFileName)
  const finalSetup = path.join(root, setupDirectoryName)
  await inject(options, 'before_temp_create')
  try {
    await mkdir(stagingRoot, { mode: directoryMode })
    await mkdir(stagingVersion, { mode: directoryMode })
  } catch {
    throw unavailable()
  }
  await writeAndSyncExclusiveState(stagingState, envelope, options)
  await syncDirectory(stagingVersion)
  await syncDirectory(stagingRoot)
  await inject(options, 'before_prior_compare')
  if ((await entryKind(finalSetup)) !== 'absent') {
    return { status: 'conflict' }
  }
  await inject(options, 'after_prior_compare')
  await inject(options, 'before_rename')
  try {
    await rename(stagingRoot, finalSetup)
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) return { status: 'conflict' }
    throw unavailable()
  }
  await inject(options, 'after_rename')
  await inject(options, 'before_directory_sync')
  await syncDirectory(root)
  await inject(options, 'after_directory_sync')
  return strictReadback(root, envelope, options)
}

async function replaceEnvelope(
  root: string,
  expectedRevisionToken: string,
  envelope: SetupStateEnvelope,
  options: SetupEnvelopeStoreOptions,
): Promise<SetupEnvelopeWriteResult> {
  const versionRoot = await assertCurrentStoreDirectories(root)
  const statePath = path.join(versionRoot, stateFileName)
  const temporaryPath = path.join(
    versionRoot,
    `.${stateFileName}.${randomHex()}.tmp`,
  )
  await inject(options, 'before_temp_create')
  await writeAndSyncExclusiveState(temporaryPath, envelope, options)
  await inject(options, 'before_prior_compare')
  const current = await readStateFile(statePath)
  if (sha256(current.bytes) !== expectedRevisionToken) {
    return { status: 'conflict' }
  }
  await inject(options, 'after_prior_compare')
  await inject(options, 'before_rename')
  try {
    await rename(temporaryPath, statePath)
  } catch {
    throw unavailable()
  }
  await inject(options, 'after_rename')
  await inject(options, 'before_directory_sync')
  await syncDirectory(versionRoot)
  await inject(options, 'after_directory_sync')
  return strictReadback(root, envelope, options)
}

async function writeAndSyncExclusiveState(
  target: string,
  envelope: SetupStateEnvelope,
  options: SetupEnvelopeStoreOptions,
): Promise<void> {
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
    await inject(options, 'after_temp_create')
    await inject(options, 'before_temp_write')
    await handle.writeFile(bytes)
    await inject(options, 'after_temp_write')
    await inject(options, 'before_file_sync')
    await handle.sync()
    await inject(options, 'after_file_sync')
  } finally {
    await handle.close()
  }
}

async function strictReadback(
  root: string,
  expected: SetupStateEnvelope,
  options: SetupEnvelopeStoreOptions,
): Promise<SetupEnvelopeWriteResult> {
  await inject(options, 'before_readback')
  const readback = await readEnvelopeAt(root)
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

async function readEnvelopeAt(root: string): Promise<SetupEnvelopeRead> {
  const setupPath = path.join(root, setupDirectoryName)
  const setupKind = await entryKind(setupPath)
  if (setupKind === 'absent') return { status: 'absent' }
  if (setupKind !== 'directory') {
    return { status: 'incompatible', reason: 'missing_state' }
  }
  let versionRoot: string
  try {
    versionRoot = await assertCurrentStoreDirectories(root)
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
): Promise<{ bytes: Buffer; envelope: SetupStateEnvelope }> {
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
      stats.nlink !== 1 ||
      (stats.mode & 0o7777) !== fileMode ||
      stats.size <= 0 ||
      stats.size > setupEnvelopeMaxBytes
    ) {
      throw unavailable()
    }
    const bytes = await handle.readFile()
    return {
      bytes,
      envelope: decodeSetupStateEnvelopeBytes(bytes),
    }
  } finally {
    await handle.close()
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
