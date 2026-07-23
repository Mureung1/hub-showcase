/// <reference types="node" />

import { fork } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import type { BigIntStats } from 'node:fs'
import {
  lstat,
  mkdir,
  open,
} from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const workerEnvironment =
  'AY_PLE_WORKSPACE_BUNDLE_DIRECTORY_CAPABILITY_V1'
const requestTimeoutMs = 30_000
const closeTimeoutMs = 2_000

export type WorkspaceBundleDirectoryIdentity = {
  readonly device: string
  readonly inode: string
  readonly ownerUid: number
}

export type WorkspaceBundleDirectCreate = {
  readonly kind: 'create_directory' | 'create_file'
  readonly relativePath: string
}

type WorkerConfiguration = {
  readonly identity: WorkspaceBundleDirectoryIdentity
}

type WorkerOperation =
  | {
      readonly kind: 'enter_directory'
      readonly leaf: string
      readonly mode: number
    }
  | {
      readonly kind: 'create_file'
      readonly leaf: string
      readonly mode: number
      readonly bytes: Buffer
    }
  | { readonly kind: 'shutdown' }

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
  | { readonly kind: 'checked'; readonly id: number }
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

/**
 * Node does not expose Darwin openat directory descriptors. A dedicated child
 * therefore retains the admitted workspace directory as its kernel-held cwd
 * and descends only through validated direct leaves. Ancestor rename or
 * symlink substitution cannot redirect a later mkdir/open into another tree.
 */
export class WorkspaceBundleDirectoryCapability {
  readonly #child: ChildProcess
  #closed = false
  #nextRequestId = 1
  #pending: PendingRequest | undefined

  private constructor(child: ChildProcess) {
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
        new Error('Workspace bundle directory capability worker exited'),
      )
    })
    child.on('error', (error) => {
      this.#rejectPending(error)
    })
  }

  static async open(input: {
    readonly absolutePath: string
    readonly identity: WorkspaceBundleDirectoryIdentity
  }): Promise<WorkspaceBundleDirectoryCapability> {
    const configuration: WorkerConfiguration = {
      identity: input.identity,
    }
    const workerPath = fileURLToPath(import.meta.url)
    const child = fork(workerPath, [], {
      cwd: input.absolutePath,
      env: {
        ...process.env,
        [workerEnvironment]: Buffer.from(
          JSON.stringify(configuration),
        ).toString('base64url'),
      },
      execArgv: workerPath.endsWith('.ts') ? process.execArgv : [],
      serialization: 'advanced',
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    })
    const capability = new WorkspaceBundleDirectoryCapability(child)
    await capability.#waitUntilReady()
    return capability
  }

  enterDirectory(
    leaf: string,
    mode: number,
    onChecked: () => Promise<void>,
  ): Promise<boolean> {
    return this.#request(
      {
        kind: 'enter_directory',
        leaf,
        mode,
      },
      onChecked,
    ) as Promise<boolean>
  }

  createFile(
    leaf: string,
    mode: number,
    bytes: Buffer,
    onChecked: () => Promise<void>,
  ): Promise<boolean> {
    return this.#request(
      {
        kind: 'create_file',
        leaf,
        mode,
        bytes,
      },
      onChecked,
    ) as Promise<boolean>
  }

  async close(): Promise<void> {
    if (this.#closed) return
    try {
      await this.#request({ kind: 'shutdown' })
    } catch {
      // The bounded process exit below is the close authority.
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
      }, closeTimeoutMs)
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
        reject(
          new Error(
            'Workspace bundle directory capability handshake timed out',
          ),
        )
        this.#child.kill()
      }, requestTimeoutMs)
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
            `Workspace bundle directory capability handshake exited (${String(code)}, ${String(signal)})`,
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
        new Error('Workspace bundle directory capability is closed'),
      )
    }
    if (this.#pending !== undefined) {
      return Promise.reject(
        new Error(
          'Concurrent workspace bundle directory capability operation',
        ),
      )
    }
    const id = this.#nextRequestId
    this.#nextRequestId += 1
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#rejectPending(
          new Error(
            'Workspace bundle directory capability operation timed out',
          ),
        )
        this.#child.kill()
      }, requestTimeoutMs)
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
        new Error(
          'Workspace bundle directory capability response id changed',
        ),
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

export function workspaceBundleDirectoryIdentity(
  stats: BigIntStats,
): WorkspaceBundleDirectoryIdentity {
  return {
    device: String(stats.dev),
    inode: String(stats.ino),
    ownerUid: Number(stats.uid),
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
    throw new Error('Workspace bundle directory capability IPC unavailable')
  }
  const state = {
    identity: configuration.identity,
  }
  await assertWorkerDirectory(state.identity)
  const decisions = new Map<number, (proceed: boolean) => void>()
  let operationQueue = Promise.resolve()

  process.on('message', (message: ParentMessage) => {
    if (message.kind === 'decision') {
      decisions.get(message.id)?.(message.proceed)
      return
    }
    operationQueue = operationQueue.then(async () => {
      try {
        const value = await executeWorkerOperation({
          decisions,
          id: message.id,
          operation: message.operation,
          state,
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
  readonly decisions: Map<number, (proceed: boolean) => void>
  readonly id: number
  readonly operation: WorkerOperation
  readonly state: {
    identity: WorkspaceBundleDirectoryIdentity
  }
}): Promise<unknown> {
  const operation = input.operation
  if (operation.kind === 'shutdown') return undefined

  assertLeaf(operation.leaf)
  await assertWorkerDirectory(input.state.identity)

  if (operation.kind === 'enter_directory') {
    let stats = await lstatIfPresent(operation.leaf)
    let created = false
    if (stats === undefined) {
      const proceed = await waitForDecision(
        input.id,
        input.decisions,
      )
      if (!proceed) {
        throw new Error('Workspace bundle capability operation cancelled')
      }
      try {
        await mkdir(operation.leaf, { mode: operation.mode })
        created = true
      } catch (error) {
        if (!hasErrnoCode(error, 'EEXIST')) throw error
      }
      await syncCurrentDirectory()
      stats = await lstat(operation.leaf, { bigint: true })
    }
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error('Workspace bundle parent is unsafe')
    }
    const nextIdentity = workspaceBundleDirectoryIdentity(stats)
    process.chdir(operation.leaf)
    await assertWorkerDirectory(nextIdentity)
    input.state.identity = nextIdentity
    return created
  }

  const proceed = await waitForDecision(input.id, input.decisions)
  if (!proceed) {
    throw new Error('Workspace bundle capability operation cancelled')
  }
  let handle
  try {
    handle = await open(
      operation.leaf,
      fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_WRONLY |
        fsConstants.O_NOFOLLOW,
      operation.mode,
    )
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) {
      await assertWorkerDirectory(input.state.identity)
      return false
    }
    throw error
  }
  try {
    await handle.chmod(operation.mode)
    await handle.writeFile(operation.bytes)
    await handle.sync()
    const stats = await handle.stat({ bigint: true })
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.nlink !== 1n ||
      String(stats.dev) !== input.state.identity.device ||
      Number(stats.uid) !== input.state.identity.ownerUid ||
      Number(stats.mode & 0o7777n) !== operation.mode
    ) {
      throw new Error('Workspace bundle file identity is unsafe')
    }
  } finally {
    await handle.close()
  }
  await syncCurrentDirectory()
  await assertWorkerDirectory(input.state.identity)
  return true
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
  expected: WorkspaceBundleDirectoryIdentity,
): Promise<BigIntStats> {
  const stats = await lstat('.', { bigint: true })
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    !sameDirectoryIdentity(
      workspaceBundleDirectoryIdentity(stats),
      expected,
    )
  ) {
    throw new Error('Workspace bundle directory capability identity changed')
  }
  return stats
}

async function syncCurrentDirectory(): Promise<void> {
  const handle = await open(
    '.',
    fsConstants.O_RDONLY | fsConstants.O_DIRECTORY,
  )
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function lstatIfPresent(
  leaf: string,
): Promise<BigIntStats | undefined> {
  try {
    return await lstat(leaf, { bigint: true })
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return undefined
    throw error
  }
}

function sameDirectoryIdentity(
  left: WorkspaceBundleDirectoryIdentity,
  right: WorkspaceBundleDirectoryIdentity,
): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.ownerUid === right.ownerUid
  )
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
    throw new Error('Workspace bundle directory capability leaf is invalid')
  }
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  )
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
    message: 'Unknown workspace bundle directory capability failure',
  }
}

const encodedWorkerConfiguration = process.env[workerEnvironment]
if (encodedWorkerConfiguration !== undefined) {
  delete process.env[workerEnvironment]
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
