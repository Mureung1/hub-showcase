import {
  type BigIntStats,
} from 'node:fs'
import {
  lstat,
  mkdir,
  realpath,
} from 'node:fs/promises'
import {
  userInfo as osUserInfo,
} from 'node:os'
import path from 'node:path'

import type {
  AdmittedSemesterWorkspace,
} from '@ay-ple/semester-workspace'
import type {
  PublicPreviewWorkspaceTargetGuard,
} from '@ay-ple/server'

export type ApplicationUserRecord = {
  readonly homedir: string
  readonly uid: number
}

export type ControlledApplicationRoots = {
  readonly runtimeStateRoot: string
  readonly authOnlyBootstrapCwd: string
  readonly home: string
  readonly codexHome: string
  readonly codexSqliteHome: string
  readonly tempDirectory: string
}

export type PreparedApplicationRoots = {
  readonly packageRoot: string
  readonly appDataRoot: string
  readonly userHome: string
  readonly controlled: ControlledApplicationRoots
  readonly controlledRootPaths: readonly string[]
  readonly admittedWorkspace: AdmittedSemesterWorkspace | null
  readonly admittedWorkspaceCanonicalRoot: string | null
  revalidate(): Promise<void>
}

type ApplicationRootsTestingDependencies = {
  readonly userInfo: () => ApplicationUserRecord
  readonly afterAppDataCreate?: (
    appDataRoot: string,
  ) => void | Promise<void>
  readonly afterControlledRootCreate?: (
    controlledRoot: string,
  ) => void | Promise<void>
  readonly afterOwnerOnlyPathValidation?: (
    target: string,
  ) => void | Promise<void>
}

export class ApplicationRootsError extends Error {
  readonly code:
    | 'unsafe_package_root'
    | 'unsafe_app_data_root'
    | 'overlapping_roots'

  constructor(
    code:
      | 'unsafe_package_root'
      | 'unsafe_app_data_root'
      | 'overlapping_roots',
  ) {
    super(
      code === 'overlapping_roots'
        ? 'AY-PLE application roots overlap.'
        : 'AY-PLE application roots are unsafe.',
    )
    this.name = 'ApplicationRootsError'
    this.code = code
  }
}

export function readApplicationUserRecord(): ApplicationUserRecord {
  const user = osUserInfo()
  if (
    !isAbsoluteCleanPath(user.homedir) ||
    !Number.isSafeInteger(user.uid) ||
    user.uid < 0
  ) {
    throw new ApplicationRootsError('unsafe_app_data_root')
  }
  return Object.freeze({
    homedir: user.homedir,
    uid: user.uid,
  })
}

export async function createApplicationRoots(input: {
  readonly packageRoot: string
  readonly admittedWorkspace?: AdmittedSemesterWorkspace | null
}): Promise<PreparedApplicationRoots> {
  return createApplicationRootsForUser(
    input,
    readApplicationUserRecord(),
  )
}

/**
 * Staged startup snapshots the OS user record before compatibility probes and
 * gives the same authority to root provisioning after every read-only check.
 */
export function createApplicationRootsForUser(
  input: {
    readonly packageRoot: string
    readonly admittedWorkspace?: AdmittedSemesterWorkspace | null
  },
  user: ApplicationUserRecord,
): Promise<PreparedApplicationRoots> {
  return createApplicationRootsForTesting(input, {
    userInfo: () => user,
  })
}

/**
 * Source-internal filesystem race seam. The public package root exposes only
 * the staged startup Module, not user/root test dependencies.
 */
export async function createApplicationRootsForTesting(
  input: {
    readonly packageRoot: string
    readonly admittedWorkspace?: AdmittedSemesterWorkspace | null
  },
  dependencies: ApplicationRootsTestingDependencies,
): Promise<PreparedApplicationRoots> {
  const packageRootInput = input.packageRoot
  const admittedWorkspace = input.admittedWorkspace ?? null
  const userInput = dependencies.userInfo()
  const user = snapshotUserRecord(userInput)

  const packageRoot = await requireCanonicalDirectory(
    packageRootInput,
    'unsafe_package_root',
  )
  const userHome = await requireCanonicalDirectory(
    user.homedir,
    'unsafe_app_data_root',
  )
  const applicationSupport = await requireCanonicalDirectory(
    path.join(userHome, 'Library', 'Application Support'),
    'unsafe_app_data_root',
  )
  const appDataRoot = path.join(applicationSupport, 'AY-PLE')
  const workspaceRoot = admittedWorkspace
    ? await requireCanonicalDirectory(
        admittedWorkspace.canonicalRoot,
        'overlapping_roots',
      )
    : null

  const initialRoots = [
    packageRoot,
    appDataRoot,
    ...(workspaceRoot ? [workspaceRoot] : []),
  ]
  if (hasAnyOverlap(initialRoots)) {
    throw new ApplicationRootsError('overlapping_roots')
  }

  const appDataIdentity = await ensureOwnerOnlyDirectory(
    appDataRoot,
    user.uid,
    dependencies.afterOwnerOnlyPathValidation,
  )
  await dependencies.afterAppDataCreate?.(appDataRoot)
  await requireSameOwnerOnlyDirectory(
    appDataRoot,
    user.uid,
    appDataIdentity,
    dependencies.afterOwnerOnlyPathValidation,
  )

  const controlled: ControlledApplicationRoots = Object.freeze({
    runtimeStateRoot: path.join(appDataRoot, 'runtime'),
    authOnlyBootstrapCwd: path.join(
      appDataRoot,
      'runtime',
      'auth-bootstrap',
    ),
    home: path.join(appDataRoot, 'runtime', 'home'),
    codexHome: path.join(appDataRoot, 'runtime', 'codex-home'),
    codexSqliteHome: path.join(
      appDataRoot,
      'runtime',
      'codex-sqlite-home',
    ),
    tempDirectory: path.join(appDataRoot, 'runtime', 'temp'),
  })
  const controlledRootPaths = [
    controlled.runtimeStateRoot,
    controlled.authOnlyBootstrapCwd,
    controlled.home,
    controlled.codexHome,
    controlled.codexSqliteHome,
    controlled.tempDirectory,
  ]
  const controlledIdentities = new Map<
    string,
    DirectoryIdentity
  >()
  for (const controlledRoot of controlledRootPaths) {
    const identity = await ensureOwnerOnlyDirectory(
      controlledRoot,
      user.uid,
      dependencies.afterOwnerOnlyPathValidation,
    )
    controlledIdentities.set(controlledRoot, identity)
    await dependencies.afterControlledRootCreate?.(
      controlledRoot,
    )
    await requireSameOwnerOnlyDirectory(
      controlledRoot,
      user.uid,
      identity,
      dependencies.afterOwnerOnlyPathValidation,
    )
  }
  const revalidate = async (): Promise<void> => {
    await requireSameOwnerOnlyDirectory(
      appDataRoot,
      user.uid,
      appDataIdentity,
      dependencies.afterOwnerOnlyPathValidation,
    )
    for (const controlledRoot of controlledRootPaths) {
      const identity = controlledIdentities.get(controlledRoot)
      if (identity === undefined) {
        throw new ApplicationRootsError('unsafe_app_data_root')
      }
      await requireSameOwnerOnlyDirectory(
        controlledRoot,
        user.uid,
        identity,
        dependencies.afterOwnerOnlyPathValidation,
      )
    }
  }
  await revalidate()
  if (
    hasAnyOverlap([
      packageRoot,
      ...(workspaceRoot ? [workspaceRoot] : []),
      appDataRoot,
    ])
  ) {
    throw new ApplicationRootsError('overlapping_roots')
  }
  return Object.freeze({
    packageRoot,
    appDataRoot,
    userHome,
    controlled,
    controlledRootPaths: Object.freeze(controlledRootPaths),
    admittedWorkspace,
    admittedWorkspaceCanonicalRoot: workspaceRoot,
    revalidate,
  })
}

/**
 * This guard is deliberately only a total pure overlap check. B remains the
 * authority for parent freshness, leaf schema, admission, and mutation.
 */
export function createPublicPreviewWorkspaceTargetGuard(
  roots: PreparedApplicationRoots,
): PublicPreviewWorkspaceTargetGuard {
  const protectedRoots = Object.freeze([
    roots.packageRoot,
    roots.appDataRoot,
    ...roots.controlledRootPaths,
    ...(roots.admittedWorkspaceCanonicalRoot
      ? [roots.admittedWorkspaceCanonicalRoot]
      : []),
  ].map(normalizedComparisonPath))

  return (input): 'allowed' | 'blocked' => {
    try {
      const canonicalParent = input.canonicalParent
      const leafName = input.leafName
      if (
        !isAbsoluteCleanPath(canonicalParent) ||
        typeof leafName !== 'string' ||
        leafName.length === 0 ||
        Buffer.byteLength(leafName, 'utf8') > 1024 ||
        /[\u0000-\u001f\u007f]/u.test(leafName)
      ) {
        return 'blocked'
      }
      const target = normalizedComparisonPath(
        path.resolve(canonicalParent, leafName),
      )
      return protectedRoots.some((root) =>
        pathsOverlap(root, target),
      )
        ? 'blocked'
        : 'allowed'
    } catch {
      return 'blocked'
    }
  }
}

function snapshotUserRecord(
  value: ApplicationUserRecord,
): ApplicationUserRecord {
  const homedir = value.homedir
  const uid = value.uid
  if (
    !isAbsoluteCleanPath(homedir) ||
    !Number.isSafeInteger(uid) ||
    uid < 0
  ) {
    throw new ApplicationRootsError('unsafe_app_data_root')
  }
  return { homedir, uid }
}

async function requireCanonicalDirectory(
  input: string,
  code: ApplicationRootsError['code'],
): Promise<string> {
  if (!isAbsoluteCleanPath(input)) {
    throw new ApplicationRootsError(code)
  }
  const normalized = path.normalize(input)
  try {
    await requireNoSymlinkDirectoryPath(normalized)
    const canonical = await realpath(normalized)
    const stat = await lstat(normalized, { bigint: true })
    if (
      canonical !== normalized ||
      stat.isSymbolicLink() ||
      !stat.isDirectory()
    ) {
      throw new ApplicationRootsError(code)
    }
    return canonical
  } catch (error) {
    if (error instanceof ApplicationRootsError) throw error
    throw new ApplicationRootsError(code)
  }
}

async function ensureOwnerOnlyDirectory(
  target: string,
  uid: number,
  afterPathValidation?: (
    target: string,
  ) => void | Promise<void>,
): Promise<DirectoryIdentity> {
  try {
    await mkdir(target, { mode: 0o700 })
  } catch (error) {
    if (!hasCode(error, 'EEXIST')) {
      throw new ApplicationRootsError('unsafe_app_data_root')
    }
  }
  return requireOwnerOnlyDirectory(
    target,
    uid,
    afterPathValidation,
  )
}

async function requireOwnerOnlyDirectory(
  target: string,
  uid: number,
  afterPathValidation?: (
    target: string,
  ) => void | Promise<void>,
): Promise<DirectoryIdentity> {
  try {
    const before = await lstat(target, { bigint: true })
    if (
      before.isSymbolicLink() ||
      !before.isDirectory() ||
      Number(before.uid) !== uid ||
      (before.mode & 0o777n) !== 0o700n
    ) {
      throw new ApplicationRootsError('unsafe_app_data_root')
    }
    await requireNoSymlinkDirectoryPath(target)
    if ((await realpath(target)) !== target) {
      throw new ApplicationRootsError('unsafe_app_data_root')
    }
    await afterPathValidation?.(target)
    const after = await lstat(target, { bigint: true })
    if (
      after.isSymbolicLink() ||
      !after.isDirectory() ||
      Number(after.uid) !== uid ||
      (after.mode & 0o777n) !== 0o700n ||
      !sameDirectoryIdentity(
        directoryIdentity(before),
        directoryIdentity(after),
      )
    ) {
      throw new ApplicationRootsError('unsafe_app_data_root')
    }
    return directoryIdentity(after)
  } catch (error) {
    if (error instanceof ApplicationRootsError) throw error
    throw new ApplicationRootsError('unsafe_app_data_root')
  }
}

async function requireSameOwnerOnlyDirectory(
  target: string,
  uid: number,
  expected: DirectoryIdentity,
  afterPathValidation?: (
    target: string,
  ) => void | Promise<void>,
): Promise<void> {
  const actual = await requireOwnerOnlyDirectory(
    target,
    uid,
    afterPathValidation,
  )
  if (!sameDirectoryIdentity(actual, expected)) {
    throw new ApplicationRootsError('unsafe_app_data_root')
  }
}

async function requireNoSymlinkDirectoryPath(
  target: string,
): Promise<void> {
  const parsed = path.parse(target)
  const segments = target
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean)
  let current = parsed.root
  for (const segment of segments) {
    current = path.join(current, segment)
    const stat = await lstat(current)
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error('unsafe directory path')
    }
  }
}

type DirectoryIdentity = {
  readonly dev: bigint
  readonly ino: bigint
  readonly uid: bigint
  readonly mode: bigint
  readonly birthtimeNs: bigint
}

function directoryIdentity(
  stat: BigIntStats,
): DirectoryIdentity {
  return {
    dev: BigInt(stat.dev),
    ino: BigInt(stat.ino),
    uid: BigInt(stat.uid),
    mode: BigInt(stat.mode),
    birthtimeNs: stat.birthtimeNs,
  }
}

function sameDirectoryIdentity(
  left: DirectoryIdentity,
  right: DirectoryIdentity,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.birthtimeNs === right.birthtimeNs
  )
}

function hasAnyOverlap(roots: readonly string[]): boolean {
  const normalized = roots.map(normalizedComparisonPath)
  for (let left = 0; left < normalized.length; left += 1) {
    for (let right = left + 1; right < normalized.length; right += 1) {
      if (pathsOverlap(normalized[left]!, normalized[right]!)) {
        return true
      }
    }
  }
  return false
}

function normalizedComparisonPath(value: string): string {
  const normalized = path.resolve(value)
    .normalize('NFC')
    .toLocaleLowerCase('en-US')
  return normalized === path.parse(normalized).root
    ? normalized
    : normalized.replace(/\/+$/u, '')
}

function pathsOverlap(left: string, right: string): boolean {
  if (left === right) return true
  const leftPrefix = left.endsWith(path.sep)
    ? left
    : `${left}${path.sep}`
  const rightPrefix = right.endsWith(path.sep)
    ? right
    : `${right}${path.sep}`
  return left.startsWith(rightPrefix) || right.startsWith(leftPrefix)
}

function isAbsoluteCleanPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    path.normalize(value) === value &&
    Buffer.byteLength(value, 'utf8') <= 4096 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  )
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  )
}
