import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  readdir,
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
const materialMediaType = 'text/plain; charset=utf-8'
const materialFileMaxBytes = 1024 * 1024
const materialAggregateMaxBytes = 8 * 1024 * 1024
const materialScanEntryMax = 4096
const materialPreviewMaxBytes = 256 * 1024
const execFileAsync = promisify(execFile)

export type Course = {
  readonly id: string
  readonly displayName: string
}

export type RawMaterial = {
  readonly id: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: typeof materialMediaType
  readonly size: number
}

export type RawMaterialPreview = {
  readonly materialId: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: typeof materialMediaType
  readonly size: number
  readonly text: string
  readonly truncated: boolean
}

export type ReadySemesterWorkspaceSnapshot = {
  readonly state: 'ready'
  readonly storeFormatVersion: 1
  readonly confirmedRevision: number
  readonly course: Course | null
  readonly materials: readonly RawMaterial[]
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
  readMaterialPreview(input: {
    readonly materialId: string
    readonly digest: string
  }): Promise<RawMaterialPreview>
  refreshMaterials(): Promise<ReadySemesterWorkspaceSnapshot>
  selectCourse(courseId: string): Promise<ReadySemesterWorkspaceSnapshot>
  snapshot(): SemesterWorkspaceSnapshot | null
}

export type SemesterWorkspaceErrorCode =
  | 'course_already_exists'
  | 'course_invalid'
  | 'course_unknown'
  | 'chooser_unavailable'
  | 'material_scan_limit'
  | 'material_stale'
  | 'material_unknown'
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
  readonly materials: readonly RawMaterial[]
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
        if ('store' in opened) await refreshReadyWorkspace(opened)
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

    readMaterialPreview(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const material = opened.store.materials.find(
          (candidate) => candidate.id === input.materialId,
        )
        if (!material) {
          throw new SemesterWorkspaceError(
            'material_unknown',
            'The selected RawMaterial is not registered.',
          )
        }
        if (material.digest !== input.digest) {
          throw new SemesterWorkspaceError(
            'material_stale',
            'The selected RawMaterial changed. Refresh materials and try again.',
          )
        }
        const inspected = await inspectMaterialFile(
          opened.root,
          material.relativePath,
        )
        if (
          !inspected ||
          inspected.digest !== material.digest ||
          inspected.size !== material.size
        ) {
          throw new SemesterWorkspaceError(
            'material_stale',
            'The selected RawMaterial changed. Refresh materials and try again.',
          )
        }
        return {
          materialId: material.id,
          relativePath: material.relativePath,
          digest: material.digest,
          mediaType: material.mediaType,
          size: material.size,
          text: decodeBoundedPreview(inspected.bytes),
          truncated: inspected.bytes.byteLength > materialPreviewMaxBytes,
        }
      })
    },

    refreshMaterials() {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        await refreshReadyWorkspace(opened)
        return cloneReadySnapshot(opened.snapshot)
      })
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

async function refreshReadyWorkspace(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
): Promise<void> {
  const scanned = await scanRawMaterials(opened.root)
  const existingByPath = new Map(
    opened.store.materials.map((material) => [material.relativePath, material]),
  )
  const materials = scanned.map(({ bytes: _bytes, ...candidate }) => ({
    id:
      existingByPath.get(candidate.relativePath)?.id ??
      `material_${randomUUID().replaceAll('-', '')}`,
    ...candidate,
  }))
  const nextStore = {
    ...opened.store,
    materials,
  } satisfies PersistedWorkspaceState
  await writeStore(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
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
      materials: [],
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
    !isCourseOrNull(value.course) ||
    (value.materials !== undefined && !isRawMaterialArray(value.materials))
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
    materials:
      value.materials === undefined
        ? []
        : value.materials.map((material) => ({ ...material })),
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
    materials: store.materials.map((material) => ({ ...material })),
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
    materials: snapshot.materials.map((material) => ({ ...material })),
  }
}

type InspectedMaterial = Omit<RawMaterial, 'id'> & {
  readonly bytes: Buffer
}

async function scanRawMaterials(
  workspaceRoot: string,
): Promise<readonly InspectedMaterial[]> {
  const materials: InspectedMaterial[] = []
  let scannedEntries = 0
  let aggregateBytes = 0

  const visit = async (relativeDirectory: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(path.join(workspaceRoot, relativeDirectory), {
        withFileTypes: true,
      })
    } catch {
      return
    }
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      scannedEntries += 1
      if (scannedEntries > materialScanEntryMax) {
        throw new SemesterWorkspaceError(
          'material_scan_limit',
          'This SemesterWorkspace contains too many entries to refresh safely.',
        )
      }
      if (entry.name === productDirectoryName && relativeDirectory === '') {
        continue
      }
      const relativePath = path.join(relativeDirectory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        await visit(relativePath)
        continue
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.txt') {
        continue
      }
      const inspected = await inspectMaterialFile(
        workspaceRoot,
        toDisplayPath(relativePath),
      )
      if (!inspected) continue
      if (aggregateBytes + inspected.size > materialAggregateMaxBytes) continue
      aggregateBytes += inspected.size
      materials.push(inspected)
    }
  }

  await visit('')
  return materials.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  )
}

async function inspectMaterialFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<InspectedMaterial | undefined> {
  if (!isSafeMaterialRelativePath(relativePath)) return undefined
  const filePath = path.join(workspaceRoot, ...relativePath.split('/'))
  try {
    const stats = await lstat(filePath)
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.size > materialFileMaxBytes
    ) {
      return undefined
    }
    await access(filePath, fsConstants.R_OK)
    const canonicalFile = await realpath(filePath)
    if (!isStrictDescendant(workspaceRoot, canonicalFile)) return undefined
    const bytes = await readFile(filePath)
    if (bytes.byteLength > materialFileMaxBytes) return undefined
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return {
      relativePath,
      digest: createHash('sha256').update(bytes).digest('hex'),
      mediaType: materialMediaType,
      size: bytes.byteLength,
      bytes,
    }
  } catch {
    return undefined
  }
}

function decodeBoundedPreview(bytes: Buffer): string {
  if (bytes.byteLength <= materialPreviewMaxBytes) {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }
  let end = materialPreviewMaxBytes
  while (end > 0) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, end),
      )
    } catch {
      end -= 1
    }
  }
  return ''
}

function toDisplayPath(relativePath: string): string {
  return relativePath.split(path.sep).join('/')
}

function isSafeMaterialRelativePath(relativePath: string): boolean {
  return (
    relativePath.length > 0 &&
    !relativePath.includes('\\') &&
    !path.posix.isAbsolute(relativePath) &&
    path.posix.normalize(relativePath) === relativePath &&
    relativePath !== '..' &&
    !relativePath.startsWith('../') &&
    path.posix.extname(relativePath).toLowerCase() === '.txt'
  )
}

function isStrictDescendant(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative.length > 0 &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
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

function isRawMaterialArray(value: unknown): value is readonly RawMaterial[] {
  if (!Array.isArray(value)) return false
  const materialIds = new Set<string>()
  const relativePaths = new Set<string>()
  for (const material of value) {
    if (
      !isRecord(material) ||
      Object.keys(material).sort().join(',') !==
        'digest,id,mediaType,relativePath,size' ||
      typeof material.id !== 'string' ||
      !/^material_[0-9a-f]{32}$/.test(material.id) ||
      typeof material.relativePath !== 'string' ||
      !isSafeMaterialRelativePath(material.relativePath) ||
      typeof material.digest !== 'string' ||
      !/^[0-9a-f]{64}$/.test(material.digest) ||
      material.mediaType !== materialMediaType ||
      !Number.isSafeInteger(material.size) ||
      Number(material.size) < 0 ||
      Number(material.size) > materialFileMaxBytes ||
      materialIds.has(material.id) ||
      relativePaths.has(material.relativePath)
    ) {
      return false
    }
    materialIds.add(material.id)
    relativePaths.add(material.relativePath)
  }
  return true
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
