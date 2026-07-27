import { constants } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { runProductDevelopment } from './product-development-bootstrap.mjs'
import {
  canonicalProductDirectory as canonicalDirectory,
  productPathExists as pathExists,
} from './product-path-utils.mjs'
import { assertProductRootsDoNotOverlap } from './semester-workspace-materializer.mjs'

const profileMarkerName = '.ay-ple-dogfood-profile.json'
const profileMarkerKind = 'ay-ple-persistent-dogfood-profile'
const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const usage =
  'Usage: npm run dev -- [--root <profile>] [--workspace <workspace>] [--adopt-existing]'
const defaultProfileRoot = '../.ay-ple-dogfood'
const defaultWorkspaceRoot = '../workspace/year-2-semester-2'

type ProductDevelopmentStarter = (options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
}) => Promise<void>

export type LocalProductRoots = {
  readonly appDataRoot: string
  readonly profileRoot: string
  readonly workspaceRoot: string
}

export function resolveLocalProductArguments(arguments_: readonly string[]): {
  readonly adoptExisting: boolean
  readonly profileRoot: string
  readonly workspaceRoot: string
} {
  let adoptExisting = false
  let profileRoot: string | undefined
  let workspaceRoot: string | undefined
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    if (argument === '--adopt-existing' && !adoptExisting) {
      adoptExisting = true
      continue
    }
    if (argument === '--root' && profileRoot === undefined) {
      const value = arguments_[index + 1]
      if (!value) throw new Error(usage)
      profileRoot = value
      index += 1
      continue
    }
    if (argument === '--workspace' && workspaceRoot === undefined) {
      const value = arguments_[index + 1]
      if (!value) throw new Error(usage)
      workspaceRoot = value
      index += 1
      continue
    }
    throw new Error(usage)
  }
  return {
    adoptExisting,
    profileRoot: profileRoot ?? defaultProfileRoot,
    workspaceRoot: workspaceRoot ?? defaultWorkspaceRoot,
  }
}

export async function runLocalProduct(options: {
  readonly arguments: readonly string[]
  readonly environment: NodeJS.ProcessEnv
  readonly log?: (message: string) => void
  readonly packageRoot: string
  readonly startProductDevelopment?: ProductDevelopmentStarter
}): Promise<void> {
  const selected = resolveLocalProductArguments(options.arguments)
  const profileRoot = resolveFromPackageRoot(
    options.packageRoot,
    selected.profileRoot,
  )
  const workspaceRoot = resolveFromPackageRoot(
    options.packageRoot,
    selected.workspaceRoot,
  )
  const profile = await prepareLocalProductProfile({
    adoptExisting: selected.adoptExisting,
    packageRoot: options.packageRoot,
    profileRoot,
    workspaceRoot,
  })
  const log = options.log ?? console.log
  log(`Local profile: ${profile.profileRoot}`)
  log(`SemesterWorkspace: ${profile.workspaceRoot} (persistent)`)
  log(`Product app data: ${profile.appDataRoot} (persistent)`)
  await (options.startProductDevelopment ?? runProductDevelopment)({
    arguments: ['--app-data-root', profile.appDataRoot],
    environment: {
      ...options.environment,
      CODEX_CHAT_WORKSPACE: profile.workspaceRoot,
    },
  })
}

export async function prepareLocalProductProfile(options: {
  readonly adoptExisting?: boolean
  readonly packageRoot: string
  readonly profileRoot: string
  readonly workspaceRoot: string
}): Promise<LocalProductRoots> {
  if (
    !path.isAbsolute(options.packageRoot) ||
    !path.isAbsolute(options.profileRoot) ||
    !path.isAbsolute(options.workspaceRoot)
  ) {
    throw new TypeError('Local product roots must be absolute directories')
  }
  const packageRoot = await canonicalDirectory(
    options.packageRoot,
    'package root',
  )
  const profileRoot = await canonicalCandidatePath(options.profileRoot)
  const workspaceRoot = await canonicalDirectory(
    options.workspaceRoot,
    'local SemesterWorkspace',
  )
  assertProductRootsDoNotOverlap(packageRoot, profileRoot)
  assertProductRootsDoNotOverlap(packageRoot, workspaceRoot)
  assertProductRootsDoNotOverlap(profileRoot, workspaceRoot)

  const existing = await pathExists(profileRoot)
  if (existing) {
    const markerPath = path.join(profileRoot, profileMarkerName)
    if (!(await pathExists(markerPath))) {
      if (!options.adoptExisting) {
        throw new Error('Local profile ownership marker is missing')
      }
      await adoptExistingProfile(profileRoot)
    } else {
      await verifyOwnedProfile(profileRoot)
    }
  } else {
    await initializeProfile(profileRoot)
  }

  const canonicalProfileRoot = await canonicalDirectory(
    profileRoot,
    'local profile root',
  )
  const roots = resolveLocalProductRoots(canonicalProfileRoot, workspaceRoot)
  await validateLocalProductRoots(roots)

  return roots
}

async function initializeProfile(profileRoot: string): Promise<void> {
  await mkdir(profileRoot, { mode: 0o700 })
  const canonicalProfileRoot = await realpath(profileRoot)
  await mkdir(path.join(canonicalProfileRoot, 'app-data'), { mode: 0o700 })
  await writeOwnershipMarker(canonicalProfileRoot)
}

async function adoptExistingProfile(profileRoot: string): Promise<void> {
  const canonicalProfileRoot = await canonicalDirectory(
    profileRoot,
    'local profile root',
  )
  await canonicalDirectory(
    path.join(canonicalProfileRoot, 'app-data'),
    'local app data root',
  )
  await writeOwnershipMarker(canonicalProfileRoot)
}

function resolveLocalProductRoots(
  profileRoot: string,
  workspaceRoot: string,
): LocalProductRoots {
  const appDataRoot = path.join(profileRoot, 'app-data')
  return {
    appDataRoot,
    profileRoot,
    workspaceRoot,
  }
}

async function validateLocalProductRoots(
  roots: LocalProductRoots,
): Promise<void> {
  await Promise.all([
    canonicalDirectory(roots.appDataRoot, 'local app data root'),
    canonicalDirectory(roots.workspaceRoot, 'local SemesterWorkspace'),
  ])
}

async function writeOwnershipMarker(profileRoot: string): Promise<void> {
  await writeFile(
    path.join(profileRoot, profileMarkerName),
    `${JSON.stringify(
      {
        formatVersion: 1,
        kind: profileMarkerKind,
        profileRoot,
      },
      null,
      2,
    )}\n`,
    { encoding: 'utf8', flag: 'wx', mode: 0o600 },
  )
}

async function verifyOwnedProfile(profileRoot: string): Promise<void> {
  const canonicalProfileRoot = await canonicalDirectory(
    profileRoot,
    'local profile root',
  )
  let marker: unknown
  try {
    await secureRegularFile(
      path.join(canonicalProfileRoot, profileMarkerName),
      'Local profile ownership marker',
    )
    marker = JSON.parse(
      await readFile(path.join(canonicalProfileRoot, profileMarkerName), 'utf8'),
    )
  } catch {
    throw new Error('Local profile ownership marker is missing')
  }
  if (
    typeof marker !== 'object' ||
    marker === null ||
    Array.isArray(marker) ||
    !('formatVersion' in marker) ||
    marker.formatVersion !== 1 ||
    !('kind' in marker) ||
    marker.kind !== profileMarkerKind ||
    !('profileRoot' in marker) ||
    marker.profileRoot !== canonicalProfileRoot
  ) {
    throw new Error('Local profile ownership marker is invalid')
  }
}

async function secureRegularFile(file: string, label: string): Promise<void> {
  const stats = await lstat(file)
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    (stats.mode & 0o077) !== 0
  ) {
    throw new TypeError(`${label} must be an owner-only regular file`)
  }
  await access(file, constants.R_OK)
}

async function canonicalCandidatePath(candidate: string): Promise<string> {
  const parent = await realpath(path.dirname(path.resolve(candidate)))
  const stats = await lstat(parent)
  if (!stats.isDirectory()) {
    throw new TypeError('Local profile parent must be a directory')
  }
  await access(parent, constants.R_OK | constants.W_OK | constants.X_OK)
  return path.join(parent, path.basename(path.resolve(candidate)))
}

function resolveFromPackageRoot(
  packageRoot: string,
  candidate: string,
): string {
  return path.resolve(packageRoot, candidate)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void runLocalProduct({
    arguments: process.argv.slice(2),
    environment: process.env,
    packageRoot: repositoryRoot,
  }).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
