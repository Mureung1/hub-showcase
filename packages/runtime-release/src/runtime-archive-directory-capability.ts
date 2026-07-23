/// <reference types="node" />

import { createHash } from 'node:crypto'
import { fork } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { constants } from 'node:fs'
import {
  lstat,
  mkdir,
  open,
  readdir,
  readlink,
  symlink,
} from 'node:fs/promises'
import type { BigIntStats } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import type { RuntimeFileSystemIdentity } from './runtime-cache-authority.js'

const WORKER_ENV =
  'AY_PLE_RUNTIME_ARCHIVE_DIRECTORY_CAPABILITY_V1'
const REQUEST_TIMEOUT_MS = 30_000
const CLOSE_TIMEOUT_MS = 2_000

/**
 * Node does not expose Darwin openat/unlinkat directory descriptors. One
 * dedicated child therefore retains each admitted directory as its
 * kernel-held cwd. The worker accepts only validated direct leaves, so
 * ancestor rename or symlink substitution cannot redirect an operation
 * into an unrelated directory.
 */
type EntryType = 'directory' | 'file' | 'symlink'

export type RuntimeCapabilityStats = {
  readonly identity: RuntimeFileSystemIdentity
  readonly mode: number
  readonly nlink: number
  readonly size: string
  readonly type: EntryType | 'other'
}

type WorkerConfiguration = {
  readonly identity: RuntimeFileSystemIdentity
  readonly mode: number
}

type WorkerOperation =
  | {
      readonly kind: 'create_directory'
      readonly leaf: string
      readonly mode: number
    }
  | {
      readonly kind: 'finish_directory'
      readonly handle: number
      readonly mode: number
    }
  | {
      readonly kind: 'open_file'
      readonly leaf: string
      readonly mode: number
    }
  | {
      readonly kind: 'write_file'
      readonly handle: number
      readonly chunk: Buffer
    }
  | {
      readonly kind: 'chmod_file'
      readonly handle: number
      readonly mode: number
    }
  | {
      readonly kind: 'sync_file'
      readonly handle: number
    }
  | {
      readonly kind: 'finish_file'
      readonly handle: number
    }
  | {
      readonly kind: 'close_handle'
      readonly handle: number
    }
  | {
      readonly kind: 'create_symlink'
      readonly leaf: string
      readonly target: string
    }
  | {
      readonly kind: 'read_directory'
    }
  | {
      readonly kind: 'stat_directory'
    }
  | {
      readonly kind: 'inspect_leaf'
      readonly leaf: string
    }
  | {
      readonly kind: 'read_symlink'
      readonly leaf: string
    }
  | {
      readonly kind: 'open_verified_file'
      readonly leaf: string
    }
  | {
      readonly kind: 'hash_verified_file'
      readonly handle: number
      readonly byteLimit: number
    }
  | {
      readonly kind: 'shutdown'
    }

type ParentRequest = {
  readonly kind: 'request'
  readonly id: number
  readonly operation: WorkerOperation
}

type ParentDecision = {
  readonly kind: 'decision'
  readonly id: number
  readonly proceed: boolean
}

type ParentMessage = ParentRequest | ParentDecision

type WorkerMessage =
  | { readonly kind: 'ready' }
  | {
      readonly kind: 'checked'
      readonly id: number
    }
  | {
      readonly kind: 'result'
      readonly id: number
      readonly ok: true
      readonly value: unknown
    }
  | {
      readonly kind: 'result'
      readonly id: number
      readonly ok: false
      readonly error: SerializedWorkerError
    }
  | {
      readonly kind: 'fatal'
      readonly error: SerializedWorkerError
    }

type SerializedWorkerError = {
  readonly code?: string
  readonly message: string
  readonly name: string
}

type PendingRequest = {
  readonly id: number
  readonly onChecked?: () => Promise<void>
  readonly resolve: (value: unknown) => void
  readonly reject: (error: unknown) => void
  hookError?: unknown
  timer: NodeJS.Timeout
}

export class RuntimeDirectoryCapability {
  readonly absolutePath: string
  readonly identity: RuntimeFileSystemIdentity
  readonly mode: number

  readonly #child: ChildProcess
  #closed = false
  #nextRequestId = 1
  #pending: PendingRequest | undefined

  private constructor(
    absolutePath: string,
    identity: RuntimeFileSystemIdentity,
    mode: number,
    child: ChildProcess,
  ) {
    this.absolutePath = absolutePath
    this.identity = identity
    this.mode = mode
    this.#child = child
    child.on('message', (message: WorkerMessage) => {
      void this.#receive(message).catch((error: unknown) => {
        this.#rejectPending(error)
        this.#child.kill()
      })
    })
    child.on('exit', () => {
      this.#closed = true
      this.#rejectPending(
        new Error('Runtime directory capability worker exited'),
      )
    })
    child.on('error', (error) => {
      this.#rejectPending(error)
    })
  }

  static async open(input: {
    readonly absolutePath: string
    readonly identity: RuntimeFileSystemIdentity
    readonly mode: number
  }): Promise<RuntimeDirectoryCapability> {
    const configuration: WorkerConfiguration = {
      identity: input.identity,
      mode: input.mode,
    }
    const workerPath = fileURLToPath(import.meta.url)
    const child = fork(workerPath, [], {
      cwd: input.absolutePath,
      env: {
        ...process.env,
        [WORKER_ENV]: Buffer.from(
          JSON.stringify(configuration),
        ).toString('base64url'),
      },
      execArgv: workerPath.endsWith('.ts') ? process.execArgv : [],
      serialization: 'advanced',
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    })
    const capability = new RuntimeDirectoryCapability(
      input.absolutePath,
      input.identity,
      input.mode,
      child,
    )
    await capability.#waitUntilReady()
    return capability
  }

  createDirectory(
    leaf: string,
    mode: number,
    onChecked: () => Promise<void>,
  ): Promise<{
    readonly handle: number
    readonly stats: RuntimeCapabilityStats
  }> {
    return this.#request(
      { kind: 'create_directory', leaf, mode },
      onChecked,
    ) as Promise<{
      readonly handle: number
      readonly stats: RuntimeCapabilityStats
    }>
  }

  finishDirectory(
    handle: number,
    mode: number,
  ): Promise<RuntimeCapabilityStats> {
    return this.#request({
      kind: 'finish_directory',
      handle,
      mode,
    }) as Promise<RuntimeCapabilityStats>
  }

  openFile(
    leaf: string,
    mode: number,
    onChecked: () => Promise<void>,
  ): Promise<{
    readonly handle: number
    readonly stats: RuntimeCapabilityStats
  }> {
    return this.#request(
      { kind: 'open_file', leaf, mode },
      onChecked,
    ) as Promise<{
      readonly handle: number
      readonly stats: RuntimeCapabilityStats
    }>
  }

  writeFile(handle: number, chunk: Buffer): Promise<number> {
    return this.#request({
      kind: 'write_file',
      handle,
      chunk,
    }) as Promise<number>
  }

  chmodFile(handle: number, mode: number): Promise<void> {
    return this.#request({
      kind: 'chmod_file',
      handle,
      mode,
    }) as Promise<void>
  }

  syncFile(handle: number): Promise<void> {
    return this.#request({
      kind: 'sync_file',
      handle,
    }) as Promise<void>
  }

  finishFile(handle: number): Promise<RuntimeCapabilityStats> {
    return this.#request({
      kind: 'finish_file',
      handle,
    }) as Promise<RuntimeCapabilityStats>
  }

  closeHandle(handle: number): Promise<void> {
    return this.#request({
      kind: 'close_handle',
      handle,
    }) as Promise<void>
  }

  createSymlink(
    leaf: string,
    target: string,
    onChecked: () => Promise<void>,
  ): Promise<RuntimeCapabilityStats> {
    return this.#request(
      { kind: 'create_symlink', leaf, target },
      onChecked,
    ) as Promise<RuntimeCapabilityStats>
  }

  readDirectory(): Promise<readonly string[]> {
    return this.#request({
      kind: 'read_directory',
    }) as Promise<readonly string[]>
  }

  statDirectory(): Promise<RuntimeCapabilityStats> {
    return this.#request({
      kind: 'stat_directory',
    }) as Promise<RuntimeCapabilityStats>
  }

  inspectLeaf(leaf: string): Promise<RuntimeCapabilityStats | undefined> {
    return this.#request({
      kind: 'inspect_leaf',
      leaf,
    }) as Promise<RuntimeCapabilityStats | undefined>
  }

  readSymlink(leaf: string): Promise<{
    readonly stats: RuntimeCapabilityStats
    readonly target: string
  }> {
    return this.#request({
      kind: 'read_symlink',
      leaf,
    }) as Promise<{
      readonly stats: RuntimeCapabilityStats
      readonly target: string
    }>
  }

  openVerifiedFile(leaf: string): Promise<{
    readonly handle: number
    readonly stats: RuntimeCapabilityStats
  }> {
    return this.#request({
      kind: 'open_verified_file',
      leaf,
    }) as Promise<{
      readonly handle: number
      readonly stats: RuntimeCapabilityStats
    }>
  }

  hashVerifiedFile(
    handle: number,
    byteLimit: number,
  ): Promise<{
    readonly bytes: number
    readonly sha256: string
    readonly stats: RuntimeCapabilityStats
  }> {
    return this.#request({
      kind: 'hash_verified_file',
      handle,
      byteLimit,
    }) as Promise<{
      readonly bytes: number
      readonly sha256: string
      readonly stats: RuntimeCapabilityStats
    }>
  }

  async close(): Promise<void> {
    if (this.#closed) return
    try {
      await this.#request({ kind: 'shutdown' })
    } catch {
      // The process exit below is the bounded close authority.
    }
    if (this.#child.connected) this.#child.disconnect()
    if (this.#child.exitCode !== null) {
      this.#closed = true
      return
    }
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        this.#child.kill()
        resolve()
      }, CLOSE_TIMEOUT_MS)
      timer.unref()
      this.#child.once('exit', () => {
        clearTimeout(timer)
        resolve()
      })
    })
    this.#closed = true
  }

  #waitUntilReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Runtime directory capability handshake timed out'))
        this.#child.kill()
      }, REQUEST_TIMEOUT_MS)
      timer.unref()
      const onMessage = (message: WorkerMessage): void => {
        if (message.kind === 'ready') {
          clearTimeout(timer)
          this.#child.off('message', onMessage)
          resolve()
        } else if (message.kind === 'fatal') {
          clearTimeout(timer)
          this.#child.off('message', onMessage)
          reject(deserializeWorkerError(message.error))
        }
      }
      this.#child.on('message', onMessage)
      this.#child.once('exit', (code, signal) => {
        clearTimeout(timer)
        reject(
          new Error(
            `Runtime directory capability handshake exited (${String(code)}, ${String(signal)})`,
          ),
        )
      })
      this.#child.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
    })
  }

  #request(
    operation: WorkerOperation,
    onChecked?: () => Promise<void>,
  ): Promise<unknown> {
    if (this.#closed || !this.#child.connected) {
      return Promise.reject(
        new Error('Runtime directory capability is closed'),
      )
    }
    if (this.#pending !== undefined) {
      return Promise.reject(
        new Error('Concurrent runtime directory capability operation'),
      )
    }
    const id = this.#nextRequestId
    this.#nextRequestId += 1
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#rejectPending(
          new Error('Runtime directory capability operation timed out'),
        )
        this.#child.kill()
      }, REQUEST_TIMEOUT_MS)
      timer.unref()
      this.#pending = {
        id,
        onChecked,
        resolve,
        reject,
        timer,
      }
      this.#child.send({
        kind: 'request',
        id,
        operation,
      } satisfies ParentRequest)
    })
  }

  async #receive(message: WorkerMessage): Promise<void> {
    if (message.kind === 'ready' || message.kind === 'fatal') return
    const pending = this.#pending
    if (pending === undefined) return
    if (message.id !== pending.id) {
      this.#rejectPending(
        new Error('Runtime directory capability response id changed'),
      )
      this.#child.kill()
      return
    }
    if (message.kind === 'checked') {
      try {
        await pending.onChecked?.()
        this.#child.send({
          kind: 'decision',
          id: message.id,
          proceed: true,
        } satisfies ParentDecision)
      } catch (error) {
        pending.hookError = error
        this.#child.send({
          kind: 'decision',
          id: message.id,
          proceed: false,
        } satisfies ParentDecision)
      }
      return
    }
    clearTimeout(pending.timer)
    this.#pending = undefined
    if (pending.hookError !== undefined) {
      pending.reject(pending.hookError)
    } else if (message.ok) {
      pending.resolve(message.value)
    } else {
      pending.reject(deserializeWorkerError(message.error))
    }
  }

  #rejectPending(error: unknown): void {
    if (this.#pending === undefined) return
    clearTimeout(this.#pending.timer)
    const pending = this.#pending
    this.#pending = undefined
    pending.reject(error)
  }
}

function deserializeWorkerError(
  serialized: SerializedWorkerError,
): Error {
  const error = new Error(serialized.message)
  error.name = serialized.name
  if (serialized.code !== undefined) {
    ;(error as NodeJS.ErrnoException).code = serialized.code
  }
  return error
}

async function runWorker(
  configuration: WorkerConfiguration,
): Promise<void> {
  if (process.send === undefined) {
    throw new Error('Runtime directory capability IPC unavailable')
  }
  await assertWorkerDirectory(configuration)
  const handles = new Map<number, FileHandle>()
  let nextHandle = 1
  const decisions = new Map<
    number,
    (proceed: boolean) => void
  >()
  let operationQueue = Promise.resolve()

  process.on('message', (message: ParentMessage) => {
    if (message.kind === 'decision') {
      decisions.get(message.id)?.(message.proceed)
      return
    }
    operationQueue = operationQueue.then(async () => {
      try {
        const value = await executeWorkerOperation({
          configuration,
          decisions,
          handles,
          id: message.id,
          nextHandle: () => {
            const handle = nextHandle
            nextHandle += 1
            return handle
          },
          operation: message.operation,
        })
        process.send?.({
          kind: 'result',
          id: message.id,
          ok: true,
          value,
        } satisfies WorkerMessage)
        if (message.operation.kind === 'shutdown') {
          process.disconnect()
        }
      } catch (error) {
        process.send?.({
          kind: 'result',
          id: message.id,
          ok: false,
          error: serializeWorkerError(error),
        } satisfies WorkerMessage)
      }
    })
  })
  process.send({ kind: 'ready' } satisfies WorkerMessage)
}

async function executeWorkerOperation(input: {
  readonly configuration: WorkerConfiguration
  readonly decisions: Map<number, (proceed: boolean) => void>
  readonly handles: Map<number, FileHandle>
  readonly id: number
  readonly nextHandle: () => number
  readonly operation: WorkerOperation
}): Promise<unknown> {
  const operation = input.operation
  if (operation.kind === 'shutdown') {
    await closeAllHandles(input.handles)
    return undefined
  }
  if (operation.kind === 'stat_directory') {
    return statsEvidence(await assertWorkerDirectory(input.configuration))
  }
  if (operation.kind === 'read_directory') {
    await assertWorkerDirectory(input.configuration)
    const names = await readdir('.')
    await assertWorkerDirectory(input.configuration)
    return names
  }
  if (operation.kind === 'finish_directory') {
    const handle = requiredHandle(input.handles, operation.handle)
    try {
      await handle.chmod(operation.mode)
      await handle.sync()
      return statsEvidence(await handle.stat({ bigint: true }))
    } finally {
      input.handles.delete(operation.handle)
      await handle.close().catch(() => undefined)
    }
  }
  if (operation.kind === 'write_file') {
    const handle = requiredHandle(input.handles, operation.handle)
    const result = await handle.write(operation.chunk)
    return result.bytesWritten
  }
  if (operation.kind === 'chmod_file') {
    await requiredHandle(input.handles, operation.handle).chmod(
      operation.mode,
    )
    return undefined
  }
  if (operation.kind === 'sync_file') {
    await requiredHandle(input.handles, operation.handle).sync()
    return undefined
  }
  if (operation.kind === 'finish_file') {
    const handle = requiredHandle(input.handles, operation.handle)
    try {
      return statsEvidence(await handle.stat({ bigint: true }))
    } finally {
      input.handles.delete(operation.handle)
      await handle.close().catch(() => undefined)
    }
  }
  if (operation.kind === 'close_handle') {
    const handle = input.handles.get(operation.handle)
    if (handle !== undefined) {
      input.handles.delete(operation.handle)
      await handle.close()
    }
    return undefined
  }
  if (operation.kind === 'inspect_leaf') {
    assertLeaf(operation.leaf)
    await assertWorkerDirectory(input.configuration)
    const stats = await lstatIfPresent(operation.leaf)
    await assertWorkerDirectory(input.configuration)
    return stats === undefined ? undefined : statsEvidence(stats)
  }
  if (operation.kind === 'read_symlink') {
    assertLeaf(operation.leaf)
    await assertWorkerDirectory(input.configuration)
    const before = await lstat(operation.leaf, { bigint: true })
    const target = await readlink(operation.leaf)
    const after = await lstat(operation.leaf, { bigint: true })
    if (
      !sameIdentity(
        statsEvidence(before).identity,
        statsEvidence(after).identity,
      )
    ) {
      throw new Error('Runtime symlink changed while reading')
    }
    await assertWorkerDirectory(input.configuration)
    return { stats: statsEvidence(after), target }
  }
  if (operation.kind === 'open_verified_file') {
    assertLeaf(operation.leaf)
    await assertWorkerDirectory(input.configuration)
    const file = await open(
      operation.leaf,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    )
    try {
      const stats = await file.stat({ bigint: true })
      const handle = input.nextHandle()
      input.handles.set(handle, file)
      return { handle, stats: statsEvidence(stats) }
    } catch (error) {
      await file.close().catch(() => undefined)
      throw error
    }
  }
  if (operation.kind === 'hash_verified_file') {
    const handle = requiredHandle(input.handles, operation.handle)
    try {
      const hash = createHash('sha256')
      const buffer = Buffer.allocUnsafe(64 * 1024)
      let bytes = 0
      while (true) {
        const remaining = operation.byteLimit - bytes
        if (remaining < 0) {
          throw new Error('Runtime verified file exceeded byte limit')
        }
        const result = await handle.read(
          buffer,
          0,
          Math.min(buffer.byteLength, remaining + 1),
          bytes,
        )
        if (result.bytesRead === 0) break
        bytes += result.bytesRead
        if (bytes > operation.byteLimit) {
          throw new Error('Runtime verified file exceeded byte limit')
        }
        hash.update(buffer.subarray(0, result.bytesRead))
      }
      return {
        bytes,
        sha256: hash.digest('hex'),
        stats: statsEvidence(await handle.stat({ bigint: true })),
      }
    } finally {
      input.handles.delete(operation.handle)
      await handle.close().catch(() => undefined)
    }
  }

  assertLeaf(operation.leaf)
  await assertWorkerDirectory(input.configuration)

  const proceed = await waitForDecision(
    input.id,
    input.decisions,
  )
  if (!proceed) throw new Error('Capability operation cancelled')

  let value: unknown
  if (operation.kind === 'create_directory') {
    await mkdir(operation.leaf, { mode: operation.mode })
    const directory = await open(
      operation.leaf,
      constants.O_RDONLY |
        constants.O_NOFOLLOW |
        constants.O_DIRECTORY,
    )
    try {
      const stats = await directory.stat({ bigint: true })
      const handle = input.nextHandle()
      input.handles.set(handle, directory)
      value = { handle, stats: statsEvidence(stats) }
    } catch (error) {
      await directory.close().catch(() => undefined)
      throw error
    }
  } else if (operation.kind === 'open_file') {
    const file = await open(
      operation.leaf,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      operation.mode,
    )
    try {
      const stats = await file.stat({ bigint: true })
      const handle = input.nextHandle()
      input.handles.set(handle, file)
      value = { handle, stats: statsEvidence(stats) }
    } catch (error) {
      await file.close().catch(() => undefined)
      throw error
    }
  } else if (operation.kind === 'create_symlink') {
    await symlink(operation.target, operation.leaf)
    value = statsEvidence(
      await lstat(operation.leaf, { bigint: true }),
    )
  } else {
    throw new Error('Runtime directory capability operation is invalid')
  }
  await assertWorkerDirectory(input.configuration)
  return value
}

function waitForDecision(
  id: number,
  decisions: Map<number, (proceed: boolean) => void>,
): Promise<boolean> {
  return new Promise((resolve) => {
    decisions.set(id, (proceed) => {
      decisions.delete(id)
      resolve(proceed)
    })
    process.send?.({ kind: 'checked', id } satisfies WorkerMessage)
  })
}

async function assertWorkerDirectory(
  configuration: WorkerConfiguration,
): Promise<BigIntStats> {
  const stats = await lstat('.', { bigint: true })
  const evidence = statsEvidence(stats)
  if (
    evidence.type !== 'directory' ||
    evidence.mode !== configuration.mode ||
    !sameIdentity(evidence.identity, configuration.identity)
  ) {
    throw new Error('Runtime directory capability identity changed')
  }
  return stats
}

function statsEvidence(stats: BigIntStats): RuntimeCapabilityStats {
  return {
    identity: {
      device: String(stats.dev),
      inode: String(stats.ino),
      ownerUid: Number(stats.uid),
    },
    mode: Number(stats.mode & 0o7777n),
    nlink: Number(stats.nlink),
    size: String(stats.size),
    type: stats.isDirectory()
      ? 'directory'
      : stats.isFile()
        ? 'file'
        : stats.isSymbolicLink()
          ? 'symlink'
          : 'other',
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

function requiredHandle(
  handles: ReadonlyMap<number, FileHandle>,
  handle: number,
): FileHandle {
  const value = handles.get(handle)
  if (value === undefined) {
    throw new Error('Runtime capability handle is unavailable')
  }
  return value
}

async function closeAllHandles(
  handles: Map<number, FileHandle>,
): Promise<void> {
  const openHandles = [...handles.values()]
  handles.clear()
  await Promise.all(
    openHandles.map((handle) =>
      handle.close().catch(() => undefined),
    ),
  )
}

async function lstatIfPresent(
  leaf: string,
): Promise<BigIntStats | undefined> {
  try {
    return await lstat(leaf, { bigint: true })
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined
    }
    throw error
  }
}

function assertLeaf(leaf: string): void {
  if (
    leaf.length === 0 ||
    leaf === '.' ||
    leaf === '..' ||
    leaf.includes('/') ||
    leaf.includes('\\') ||
    leaf.includes('\0')
  ) {
    throw new Error('Runtime directory capability leaf is invalid')
  }
}

function serializeWorkerError(error: unknown): SerializedWorkerError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      ...('code' in error && typeof error.code === 'string'
        ? { code: error.code }
        : {}),
    }
  }
  return {
    name: 'Error',
    message: 'Unknown runtime directory capability failure',
  }
}

const encodedWorkerConfiguration = process.env[WORKER_ENV]
if (encodedWorkerConfiguration !== undefined) {
  delete process.env[WORKER_ENV]
  let configuration: WorkerConfiguration
  try {
    configuration = JSON.parse(
      Buffer.from(
        encodedWorkerConfiguration,
        'base64url',
      ).toString('utf8'),
    ) as WorkerConfiguration
  } catch (error) {
    process.send?.({
      kind: 'fatal',
      error: serializeWorkerError(error),
    } satisfies WorkerMessage)
    process.exitCode = 70
    throw error
  }
  void runWorker(configuration).catch((error: unknown) => {
    process.send?.({
      kind: 'fatal',
      error: serializeWorkerError(error),
    } satisfies WorkerMessage)
    process.exitCode = 70
  })
}
