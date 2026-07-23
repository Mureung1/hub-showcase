import { randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

import {
  decodeCurrentSemesterWorkspaceV2,
  SemesterWorkspaceV2CodecError,
} from '@ay-ple/semester-workspace'
import type { CurrentSemesterWorkspaceV2 } from '@ay-ple/semester-workspace'

import { SemesterWorkspaceError } from './semester-workspace-error.js'
import {
  cloneAssignment,
  cloneExecutionGuard,
  cloneModelingRun,
  cloneStatePatch,
  hasErrnoCode,
} from './semester-workspace-values.js'
import type { ExecutionGuard } from './semester-workspace-values.js'
import type {
  Assignment,
  Course,
  ModelingRun,
  RawMaterial,
  StatePatch,
  UserConfirmation,
} from './semester-workspace.js'

export const currentWorkspaceStoreFormatVersion = 2 as const
export const workspaceProductDirectoryName = '.ay-ple'
export const actionScratchRelativeRoot =
  `${workspaceProductDirectoryName}/runtime-scratch`
export type { ExecutionGuard } from './semester-workspace-values.js'

const storeFileName = 'workspace-state.json'

export type PersistedStatePatch = StatePatch & {
  readonly canonicalPayload: string
  readonly guardOperationId?: string
}

export type PersistedSourceRecovery = ExecutionGuard & {
  readonly state: 'recovery_required'
}

export type PersistedWorkspaceState = {
  readonly formatVersion: typeof currentWorkspaceStoreFormatVersion
  readonly workspaceId: string
  readonly confirmedRevision: number
  readonly course: Course | null
  readonly materials: readonly RawMaterial[]
  readonly assignments: readonly Assignment[]
  readonly statePatches: readonly PersistedStatePatch[]
  readonly userConfirmations: readonly UserConfirmation[]
  readonly modelingRuns: readonly ModelingRun[]
  readonly executionGuard: ExecutionGuard | null
  readonly sourceRecovery: PersistedSourceRecovery | null
}

export type WorkspaceStoreAuthority = {
  readonly bytes: Buffer
}

export type WorkspaceStoreOpenResult =
  | {
      readonly status: 'ready'
      readonly store: PersistedWorkspaceState
      readonly created: boolean
      readonly authority: WorkspaceStoreAuthority
    }
  | {
      readonly status: 'incompatible'
      readonly foundStoreFormatVersion: number | null
    }

export const semesterWorkspaceStore = {
  async open(workspaceRoot: string): Promise<WorkspaceStoreOpenResult> {
    const productRoot = path.join(
      workspaceRoot,
      workspaceProductDirectoryName,
    )
    const storePath = path.join(productRoot, storeFileName)
    if (!(await pathExists(productRoot))) {
      await mkdir(productRoot)
    } else {
      await assertRegularDirectory(productRoot)
    }

    if (!(await pathExists(storePath))) {
      const store = createEmptyWorkspaceStore()
      const authority = await createWorkspaceStore(workspaceRoot, store)
      return { status: 'ready', store, created: true, authority }
    }

    const stats = await lstat(storePath)
    if (!stats.isFile()) return incompatibleStore(null)

    let storeBytes: Buffer
    try {
      storeBytes = await readFile(storePath)
    } catch {
      return incompatibleStore(null)
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(storeBytes),
      )
    } catch {
      return incompatibleStore(null)
    }

    try {
      return {
        status: 'ready',
        store: cloneDecodedCurrentStore(
          decodeCurrentSemesterWorkspaceV2(decoded),
        ),
        created: false,
        authority: storeAuthority(storeBytes),
      }
    } catch (error) {
      if (!(error instanceof SemesterWorkspaceV2CodecError)) {
        throw error
      }
      return incompatibleStore(decoded)
    }
  },

  async replace(
    workspaceRoot: string,
    expectedAuthority: WorkspaceStoreAuthority,
    store: PersistedWorkspaceState,
  ): Promise<WorkspaceStoreAuthority> {
    return replaceWorkspaceStore(workspaceRoot, expectedAuthority, store)
  },

  async matchesAuthority(
    workspaceRoot: string,
    expectedAuthority: WorkspaceStoreAuthority,
  ): Promise<boolean> {
    try {
      return (
        await readCurrentRegularStoreBytes(workspaceRoot)
      ).equals(expectedAuthority.bytes)
    } catch {
      return false
    }
  },
} as const

function createEmptyWorkspaceStore(): PersistedWorkspaceState {
  return {
    formatVersion: currentWorkspaceStoreFormatVersion,
    workspaceId: `workspace_${randomUUID().replaceAll('-', '')}`,
    confirmedRevision: 0,
    course: null,
    materials: [],
    assignments: [],
    statePatches: [],
    userConfirmations: [],
    modelingRuns: [],
    executionGuard: null,
    sourceRecovery: null,
  }
}

function incompatibleStore(decoded: unknown): WorkspaceStoreOpenResult {
  return {
    status: 'incompatible',
    foundStoreFormatVersion:
      isRecord(decoded) && Number.isSafeInteger(decoded.formatVersion)
        ? Number(decoded.formatVersion)
        : null,
  }
}

async function createWorkspaceStore(
  workspaceRoot: string,
  store: PersistedWorkspaceState,
): Promise<WorkspaceStoreAuthority> {
  const bytes = Buffer.from(encodeCurrentStore(store), 'utf8')
  await writeWorkspaceStoreBytes(workspaceRoot, bytes, false)
  return storeAuthority(bytes)
}

async function replaceWorkspaceStore(
  workspaceRoot: string,
  expectedAuthority: WorkspaceStoreAuthority,
  store: PersistedWorkspaceState,
): Promise<WorkspaceStoreAuthority> {
  const bytes = Buffer.from(encodeCurrentStore(store), 'utf8')
  await writeWorkspaceStoreBytes(
    workspaceRoot,
    bytes,
    true,
    expectedAuthority,
  )
  return storeAuthority(bytes)
}

async function writeWorkspaceStoreBytes(
  workspaceRoot: string,
  bytes: Buffer,
  replacing: boolean,
  expectedAuthority?: WorkspaceStoreAuthority,
): Promise<void> {
  const productRoot = path.join(
    workspaceRoot,
    workspaceProductDirectoryName,
  )
  const storePath = path.join(productRoot, storeFileName)
  const temporaryPath = path.join(
    productRoot,
    `.${storeFileName}.${randomUUID()}.tmp`,
  )
  try {
    await writeFile(temporaryPath, bytes, {
      flag: 'wx',
      mode: 0o600,
    })
    if (replacing) {
      const currentBytes = await readCurrentRegularStoreBytes(workspaceRoot)
      if (!expectedAuthority || !currentBytes.equals(expectedAuthority.bytes)) {
        throw storeAuthorityConflict()
      }
    }
    await rename(temporaryPath, storePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

async function readCurrentRegularStoreBytes(
  workspaceRoot: string,
): Promise<Buffer> {
  try {
    const storePath = workspaceStorePath(workspaceRoot)
    const stats = await lstat(storePath)
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw storeAuthorityConflict()
    }
    return await readFile(storePath)
  } catch (error) {
    if (error instanceof SemesterWorkspaceError) throw error
    throw storeAuthorityConflict()
  }
}

function storeAuthority(bytes: Buffer): WorkspaceStoreAuthority {
  return { bytes: Buffer.from(bytes) }
}

function storeAuthorityConflict(): SemesterWorkspaceError {
  return new SemesterWorkspaceError(
    'execution_guard_conflict',
    'The persisted workspace store no longer matches the active authority.',
  )
}

function encodeCurrentStore(store: PersistedWorkspaceState): string {
  return `${JSON.stringify(store, null, 2)}\n`
}

function workspaceStorePath(workspaceRoot: string): string {
  return path.join(
    workspaceRoot,
    workspaceProductDirectoryName,
    storeFileName,
  )
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

function cloneDecodedCurrentStore(
  value: CurrentSemesterWorkspaceV2,
): PersistedWorkspaceState {
  return {
    formatVersion: currentWorkspaceStoreFormatVersion,
    workspaceId: value.workspaceId,
    confirmedRevision: value.confirmedRevision,
    course:
      value.course === null
        ? null
        : { ...(value.course as unknown as Course) },
    materials: value.materials.map((material) => ({
      ...(material as unknown as RawMaterial),
    })),
    assignments: value.assignments.map((assignment) =>
      cloneAssignment(assignment as unknown as Assignment),
    ),
    statePatches: value.statePatches.map(cloneDecodedPersistedStatePatch),
    userConfirmations: value.userConfirmations.map((confirmation) => ({
      ...(confirmation as unknown as UserConfirmation),
    })),
    modelingRuns: value.modelingRuns.map((run) =>
      cloneModelingRun(run as unknown as ModelingRun),
    ),
    executionGuard:
      value.executionGuard === null
        ? null
        : cloneExecutionGuard(
            value.executionGuard as unknown as ExecutionGuard,
          ),
    sourceRecovery:
      value.sourceRecovery === null
        ? null
        : cloneDecodedSourceRecovery(value.sourceRecovery),
  }
}

function cloneDecodedPersistedStatePatch(
  value: Record<string, unknown>,
): PersistedStatePatch {
  const patch = value as unknown as PersistedStatePatch
  return {
    ...cloneStatePatch(patch),
    canonicalPayload: patch.canonicalPayload,
    ...(patch.guardOperationId === undefined
      ? {}
      : { guardOperationId: patch.guardOperationId }),
  }
}

function cloneDecodedSourceRecovery(
  value: Record<string, unknown>,
): PersistedSourceRecovery {
  return {
    ...cloneExecutionGuard(value as unknown as PersistedSourceRecovery),
    state: 'recovery_required',
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
