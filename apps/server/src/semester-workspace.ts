import { randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { rootsAreDisjoint } from './root-isolation.js'

const storeFormatVersion = 1
const productDirectoryName = '.ay-ple'
const storeFileName = 'workspace-state.json'
const execFileAsync = promisify(execFile)

export type Course = {
  readonly id: string
  readonly displayName: string
}

export type ReadySemesterWorkspaceSnapshot = {
  readonly state: 'ready'
  readonly storeFormatVersion: 1
  readonly confirmedRevision: number
  readonly course: Course | null
}

export type IncompatibleSemesterWorkspaceSnapshot = {
  readonly state: 'incompatible'
  readonly readOnly: true
  readonly supportedStoreFormatVersion: 1
  readonly foundStoreFormatVersion: number
  readonly displayMessage: string
}

export type SemesterWorkspaceSnapshot =
  | ReadySemesterWorkspaceSnapshot
  | IncompatibleSemesterWorkspaceSnapshot

export type SemesterWorkspaceActivation =
  | {
      readonly status: 'activated'
      readonly workspace: SemesterWorkspaceSnapshot
    }
  | {
      readonly status: 'cancelled'
      readonly workspace: SemesterWorkspaceSnapshot | null
    }

export type SemesterWorkspaceDirectoryChooser = () => Promise<string | null>

export type SemesterWorkspaceController = {
  activate(): Promise<SemesterWorkspaceActivation>
  createCourse(displayName: string): Promise<ReadySemesterWorkspaceSnapshot>
  nativeCwd(): string
  selectCourse(courseId: string): Promise<ReadySemesterWorkspaceSnapshot>
  snapshot(): SemesterWorkspaceSnapshot | null
}

export type SemesterWorkspaceErrorCode =
  | 'course_already_exists'
  | 'course_invalid'
  | 'course_unknown'
  | 'chooser_unavailable'
  | 'root_invalid'
  | 'root_overlap'
  | 'store_invalid'
  | 'workspace_inactive'
  | 'workspace_incompatible'

export class SemesterWorkspaceError extends Error {
  readonly code: SemesterWorkspaceErrorCode

  constructor(code: SemesterWorkspaceErrorCode, message: string) {
    super(message)
    this.name = 'SemesterWorkspaceError'
    this.code = code
  }
}

export function createMacOsSemesterWorkspaceChooser(options: {
  readonly platform?: NodeJS.Platform
} = {}): SemesterWorkspaceDirectoryChooser {
  return async () => {
    if ((options.platform ?? process.platform) !== 'darwin') {
      throw new SemesterWorkspaceError(
        'chooser_unavailable',
        'SemesterWorkspace folder selection is available on macOS.',
      )
    }
    const { stdout } = await execFileAsync('/usr/bin/osascript', [
      '-e',
      [
        'try',
        'set chosenFolder to choose folder with prompt "AY-PLE에서 사용할 학기 폴더를 선택하세요."',
        'return POSIX path of chosenFolder',
        'on error number -128',
        'return ""',
        'end try',
      ].join('\n'),
    ])
    const selected = stdout.replace(/\r?\n$/, '')
    return selected.length > 0 ? selected : null
  }
}

type PersistedWorkspaceState = {
  readonly formatVersion: 1
  readonly confirmedRevision: number
  readonly course: Course | null
}

type OpenWorkspace =
  | {
      readonly root: string
      store: PersistedWorkspaceState
      snapshot: ReadySemesterWorkspaceSnapshot
    }
  | {
      readonly root: string
      readonly snapshot: IncompatibleSemesterWorkspaceSnapshot
    }

export function createSemesterWorkspaceController(options: {
  readonly appDataRoot: string
  readonly chooseDirectory: SemesterWorkspaceDirectoryChooser
  readonly packageRoot: string
}): SemesterWorkspaceController {
  let active: OpenWorkspace | undefined
  let operationTail = Promise.resolve()

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationTail.then(operation)
    operationTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  return {
    activate() {
      return enqueue(async () => {
        const selected = await options.chooseDirectory()
        if (selected === null) {
          return {
            status: 'cancelled',
            workspace: active ? cloneSnapshot(active.snapshot) : null,
          }
        }

        const [packageRoot, appDataRoot, workspaceRoot] = await Promise.all([
          canonicalDirectory(options.packageRoot),
          canonicalDirectory(options.appDataRoot),
          canonicalDirectory(selected),
        ])
        assertDisjointRoots([packageRoot, appDataRoot, workspaceRoot])
        const opened = await openWorkspace(workspaceRoot)
        active = opened
        return {
          status: 'activated',
          workspace: cloneSnapshot(opened.snapshot),
        }
      })
    },

    createCourse(displayName) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        if (opened.store.course) {
          throw new SemesterWorkspaceError(
            'course_already_exists',
            'The first vertical supports one Course.',
          )
        }
        const normalizedName = displayName.trim()
        if (
          normalizedName.length === 0 ||
          Buffer.byteLength(normalizedName, 'utf8') > 512
        ) {
          throw new SemesterWorkspaceError(
            'course_invalid',
            'Course display name must be non-empty and bounded.',
          )
        }
        const nextStore = {
          ...opened.store,
          course: {
            id: `course_${randomUUID().replaceAll('-', '')}`,
            displayName: normalizedName,
          },
        } satisfies PersistedWorkspaceState
        await writeStore(opened.root, nextStore)
        opened.store = nextStore
        opened.snapshot = readySnapshot(nextStore)
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    nativeCwd() {
      return requireReadyWorkspace(active).root
    },

    selectCourse(courseId) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        if (!opened.store.course || opened.store.course.id !== courseId) {
          throw new SemesterWorkspaceError(
            'course_unknown',
            'The selected Course does not exist in this SemesterWorkspace.',
          )
        }
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    snapshot() {
      return active ? cloneSnapshot(active.snapshot) : null
    },
  }
}

async function openWorkspace(workspaceRoot: string): Promise<OpenWorkspace> {
  const productRoot = path.join(workspaceRoot, productDirectoryName)
  const storePath = path.join(productRoot, storeFileName)
  if (!(await pathExists(productRoot))) {
    await mkdir(productRoot)
  } else {
    await assertRegularDirectory(productRoot)
  }

  if (!(await pathExists(storePath))) {
    const store = {
      formatVersion: storeFormatVersion,
      confirmedRevision: 0,
      course: null,
    } satisfies PersistedWorkspaceState
    await writeStore(workspaceRoot, store)
    return { root: workspaceRoot, store, snapshot: readySnapshot(store) }
  }

  const stats = await lstat(storePath)
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace state must be a regular file.',
    )
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(await readFile(storePath, 'utf8'))
  } catch {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace state could not be read.',
    )
  }
  if (
    isRecord(decoded) &&
    Number.isSafeInteger(decoded.formatVersion) &&
    Number(decoded.formatVersion) > storeFormatVersion
  ) {
    return {
      root: workspaceRoot,
      snapshot: {
        state: 'incompatible',
        readOnly: true,
        supportedStoreFormatVersion: storeFormatVersion,
        foundStoreFormatVersion: Number(decoded.formatVersion),
        displayMessage:
          '이 SemesterWorkspace는 더 최신 버전의 AY-PLE에서 생성되었습니다. 최신 AY-PLE로 다시 여세요.',
      },
    }
  }
  const store = decodeCurrentStore(decoded)
  return { root: workspaceRoot, store, snapshot: readySnapshot(store) }
}

function decodeCurrentStore(value: unknown): PersistedWorkspaceState {
  if (
    !isRecord(value) ||
    value.formatVersion !== storeFormatVersion ||
    !Number.isSafeInteger(value.confirmedRevision) ||
    Number(value.confirmedRevision) < 0 ||
    !isCourseOrNull(value.course)
  ) {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace state has an invalid format.',
    )
  }
  return {
    formatVersion: storeFormatVersion,
    confirmedRevision: Number(value.confirmedRevision),
    course: value.course
      ? { id: value.course.id, displayName: value.course.displayName }
      : null,
  }
}

async function writeStore(
  workspaceRoot: string,
  store: PersistedWorkspaceState,
): Promise<void> {
  const productRoot = path.join(workspaceRoot, productDirectoryName)
  const storePath = path.join(productRoot, storeFileName)
  const temporaryPath = path.join(
    productRoot,
    `.${storeFileName}.${randomUUID()}.tmp`,
  )
  try {
    await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    })
    await rename(temporaryPath, storePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function canonicalDirectory(directory: string): Promise<string> {
  if (!path.isAbsolute(directory)) {
    throw new SemesterWorkspaceError(
      'root_invalid',
      'SemesterWorkspace roots must be absolute directories.',
    )
  }
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error()
    await access(directory, fsConstants.R_OK | fsConstants.X_OK)
    return await realpath(directory)
  } catch {
    throw new SemesterWorkspaceError(
      'root_invalid',
      'SemesterWorkspace roots must be readable non-symlink directories.',
    )
  }
}

function assertDisjointRoots(roots: readonly string[]): void {
  if (rootsAreDisjoint(roots)) return
  throw new SemesterWorkspaceError(
    'root_overlap',
    'Package, app data, and SemesterWorkspace roots must not overlap.',
  )
}

function requireReadyWorkspace(
  active: OpenWorkspace | undefined,
): Extract<OpenWorkspace, { store: PersistedWorkspaceState }> {
  if (!active) {
    throw new SemesterWorkspaceError(
      'workspace_inactive',
      'No SemesterWorkspace is active.',
    )
  }
  if (!('store' in active)) {
    throw new SemesterWorkspaceError(
      'workspace_incompatible',
      'This SemesterWorkspace is read-only because its format is newer.',
    )
  }
  return active
}

function readySnapshot(
  store: PersistedWorkspaceState,
): ReadySemesterWorkspaceSnapshot {
  return {
    state: 'ready',
    storeFormatVersion: storeFormatVersion,
    confirmedRevision: store.confirmedRevision,
    course: store.course
      ? { id: store.course.id, displayName: store.course.displayName }
      : null,
  }
}

function cloneSnapshot(
  snapshot: SemesterWorkspaceSnapshot,
): SemesterWorkspaceSnapshot {
  return snapshot.state === 'ready'
    ? cloneReadySnapshot(snapshot)
    : { ...snapshot }
}

function cloneReadySnapshot(
  snapshot: ReadySemesterWorkspaceSnapshot,
): ReadySemesterWorkspaceSnapshot {
  return {
    ...snapshot,
    course: snapshot.course ? { ...snapshot.course } : null,
  }
}

async function assertRegularDirectory(directory: string): Promise<void> {
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace product state path must be a regular directory.',
    )
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath)
    return true
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return false
    throw error
  }
}

function isCourseOrNull(value: unknown): value is Course | null {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.id === 'string' &&
      /^course_[0-9a-f]{32}$/.test(value.id) &&
      typeof value.displayName === 'string' &&
      value.displayName.trim().length > 0)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}
