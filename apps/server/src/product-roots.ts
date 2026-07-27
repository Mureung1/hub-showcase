import { constants as fsConstants } from 'node:fs'
import { access, lstat, mkdir, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

import { rootsAreDisjoint } from './root-isolation.js'

export type CanonicalProductRootOwnership = {
  readonly packageRoot: 'application_package'
  readonly appDataRoot: 'application_operating_data'
  readonly runtimeRoot: 'verified_runtime'
  readonly runtimeCacheRoot: 'materialization_cache'
  readonly globalCodexHome: 'global_codex'
  readonly runtimeHome: 'controlled_runtime_state'
  readonly tempDirectory: 'controlled_runtime_state'
  readonly workspaceRoot?: 'user_workspace'
}

export type CanonicalProductRoots = {
  readonly packageRoot: string
  readonly appDataRoot: string
  readonly runtimeRoot: string
  readonly runtimeCacheRoot: string
  readonly globalCodexHome: string
  readonly runtimeHome: string
  readonly tempDirectory: string
  readonly workspaceRoot?: string
  readonly ownership: CanonicalProductRootOwnership
}

export async function resolveCanonicalProductRoots(options: {
  readonly packageRoot: string
  readonly appDataRoot?: string
  readonly environment: NodeJS.ProcessEnv
  readonly workspaceRoot?: string
}): Promise<CanonicalProductRoots> {
  const packageRoot = await canonicalExistingDirectory(
    options.packageRoot,
    'package root',
  )
  const appDataRoot = await canonicalDirectoryCandidate(
    options.appDataRoot ?? path.join(path.dirname(packageRoot), '.ay-ple'),
    'app data root',
  )
  const globalCodexHome = await canonicalDirectoryCandidate(
    options.environment.CODEX_HOME ??
      path.join(options.environment.HOME ?? homedir(), '.codex'),
    'global Codex home',
  )
  const workspaceRoot =
    options.workspaceRoot === undefined
      ? undefined
      : await canonicalExistingDirectory(
          options.workspaceRoot,
          'workspace root',
        )
  const runtimeRoot = path.join(
    appDataRoot,
    'runtime/production-runtime-darwin-arm64',
  )
  const runtimeCacheRoot = path.join(
    appDataRoot,
    'cache/production-runtime',
  )
  const runtimeHome = path.join(appDataRoot, 'state/runtime/home')
  const tempDirectory = path.join(appDataRoot, 'temp')

  const independentRoots = [
    packageRoot,
    appDataRoot,
    globalCodexHome,
    ...(workspaceRoot === undefined ? [] : [workspaceRoot]),
  ]
  if (!rootsAreDisjoint(independentRoots)) {
    throw new TypeError('Product roots must not overlap')
  }

  for (const [directory, label] of [
    [runtimeRoot, 'runtime root'],
    [runtimeCacheRoot, 'runtime cache root'],
    [runtimeHome, 'controlled runtime home'],
    [tempDirectory, 'controlled temp directory'],
  ] as const) {
    await preflightManagedDescendant(appDataRoot, directory, label)
  }

  await createManagedDirectory(appDataRoot, 'app data root')
  await createManagedDescendant(
    appDataRoot,
    runtimeHome,
    'controlled runtime home',
  )
  await createManagedDescendant(
    appDataRoot,
    tempDirectory,
    'controlled temp directory',
  )

  return {
    packageRoot,
    appDataRoot,
    runtimeRoot,
    runtimeCacheRoot,
    globalCodexHome,
    runtimeHome,
    tempDirectory,
    ...(workspaceRoot === undefined ? {} : { workspaceRoot }),
    ownership: {
      packageRoot: 'application_package',
      appDataRoot: 'application_operating_data',
      runtimeRoot: 'verified_runtime',
      runtimeCacheRoot: 'materialization_cache',
      globalCodexHome: 'global_codex',
      runtimeHome: 'controlled_runtime_state',
      tempDirectory: 'controlled_runtime_state',
      ...(workspaceRoot === undefined
        ? {}
        : { workspaceRoot: 'user_workspace' as const }),
    },
  }
}

async function canonicalExistingDirectory(
  directory: string,
  label: string,
): Promise<string> {
  requireAbsolutePath(directory, label)
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new TypeError(`${label} must be a non-symlink directory`)
  }
  try {
    await access(directory, fsConstants.R_OK | fsConstants.X_OK)
  } catch {
    throw new TypeError(`${label} must be a readable directory`)
  }
  return realpath(directory)
}

async function canonicalDirectoryCandidate(
  directory: string,
  label: string,
): Promise<string> {
  requireAbsolutePath(directory, label)
  try {
    return await canonicalExistingDirectory(directory, label)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const parent = path.dirname(directory)
  if (parent === directory) {
    throw new TypeError(`${label} does not have an existing parent`)
  }
  return path.join(
    await canonicalDirectoryCandidate(parent, `${label} parent`),
    path.basename(directory),
  )
}

async function createManagedDirectory(
  directory: string,
  label: string,
): Promise<void> {
  await mkdir(directory, { mode: 0o700, recursive: true })
  const canonical = await canonicalExistingDirectory(directory, label)
  if (canonical !== directory) {
    throw new TypeError(`${label} resolved outside its canonical location`)
  }
  try {
    await access(directory, fsConstants.W_OK)
  } catch {
    throw new TypeError(`${label} must be a writable directory`)
  }
}

async function preflightManagedDescendant(
  managedRoot: string,
  directory: string,
  label: string,
): Promise<void> {
  const relative = managedRelativePath(managedRoot, directory, label)
  let current = managedRoot
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment)
    try {
      const canonical = await canonicalExistingDirectory(
        current,
        `${label} ancestor`,
      )
      if (canonical !== current) {
        throw new TypeError(
          `${label} ancestor resolved outside app data`,
        )
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
  }
}

async function createManagedDescendant(
  managedRoot: string,
  directory: string,
  label: string,
): Promise<void> {
  const relative = managedRelativePath(managedRoot, directory, label)
  let current = managedRoot
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment)
    try {
      await mkdir(current, { mode: 0o700 })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    }
    const canonical = await canonicalExistingDirectory(current, label)
    if (canonical !== current) {
      throw new TypeError(`${label} resolved outside app data`)
    }
  }
  try {
    await access(directory, fsConstants.W_OK)
  } catch {
    throw new TypeError(`${label} must be a writable directory`)
  }
}

function managedRelativePath(
  managedRoot: string,
  directory: string,
  label: string,
): string {
  const relative = path.relative(managedRoot, directory)
  if (
    relative.length === 0 ||
    path.isAbsolute(relative) ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`)
  ) {
    throw new TypeError(`${label} must be below app data`)
  }
  return relative
}

function requireAbsolutePath(directory: string, label: string): void {
  if (!path.isAbsolute(directory)) {
    throw new TypeError(`${label} must be an absolute directory`)
  }
}
