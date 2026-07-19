import { createHash, randomUUID } from 'node:crypto'
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const workspaceLeaf = 'first-assignment-semester-workspace'
const managedParentLeaf = '.ay-ple-dev-workspaces'
const ownershipMarkerName = '.ay-ple-materialized-workspace.json'
const ownershipMarkerKind = 'ay-ple-development-semester-workspace'
const e2eRunMarkerName = '.ay-ple-owned-e2e-run.json'
const e2eRunMarkerKind = 'ay-ple-e2e-semester-workspace-run'
const managedEnvironmentRootKeys = [
  'CODEX_CHAT_RUNTIME_HOME',
  'CODEX_CHAT_CODEX_HOME',
  'CODEX_CHAT_SQLITE_HOME',
  'CODEX_CHAT_TEMP_DIR',
] as const

export const canonicalSemesterWorkspaceSeed = path.join(
  repositoryRoot,
  'apps/chat-shell/e2e/fixtures',
  workspaceLeaf,
)

export type DevelopmentSemesterWorkspace = {
  readonly ownership: 'managed'
  readonly seedDigest: string
  readonly workspaceRoot: string
} | {
  readonly ownership: 'caller'
  readonly workspaceRoot: string
}

export type E2eSemesterWorkspace = {
  readonly runRoot: string
  readonly seedDigest: string
  readonly workspaceRoot: string
  cleanup(): Promise<void>
}

export async function materializeDevelopmentSemesterWorkspace(options: {
  readonly environment?: NodeJS.ProcessEnv
  readonly packageRoot?: string
  readonly seedRoot?: string
} = {}): Promise<DevelopmentSemesterWorkspace> {
  const packageRoot = await canonicalDirectory(
    options.packageRoot ?? repositoryRoot,
    'package root',
  )
  const seedRoot = await canonicalDirectory(
    options.seedRoot ?? canonicalSemesterWorkspaceSeed,
    'canonical seed',
  )
  const environment = options.environment ?? process.env
  const configuredWorkspace = environment.CODEX_CHAT_WORKSPACE
  if (configuredWorkspace !== undefined) {
    const workspaceRoot = await canonicalDirectory(
      configuredWorkspace,
      'CODEX_CHAT_WORKSPACE',
    )
    const configuredManagedRoots = await Promise.all(
      managedEnvironmentRootKeys
        .filter((key) => environment[key] !== undefined)
        .map((key) =>
          canonicalDirectory(environment[key] as string, key),
        ),
    )
    for (const managedRoot of [packageRoot, ...configuredManagedRoots]) {
      assertRootsDoNotOverlap(managedRoot, workspaceRoot)
    }
    return { ownership: 'caller', workspaceRoot }
  }
  const workspaceRoot = path.join(
    path.dirname(packageRoot),
    managedParentLeaf,
    workspaceLeaf,
  )
  const seedDigest = await digestDirectory(seedRoot)

  await materializeManagedWorkspace({ seedDigest, seedRoot, workspaceRoot })
  if ((await digestDirectory(seedRoot)) !== seedDigest) {
    throw new Error('Canonical SemesterWorkspace seed changed during materialization')
  }

  return {
    ownership: 'managed',
    seedDigest,
    workspaceRoot: await realpath(workspaceRoot),
  }
}

function assertRootsDoNotOverlap(
  packageRoot: string,
  workspaceRoot: string,
): void {
  if (
    isSameOrAncestor(packageRoot, workspaceRoot) ||
    isSameOrAncestor(workspaceRoot, packageRoot)
  ) {
    throw new Error('SemesterWorkspace cannot overlap a managed root')
  }
}

function isSameOrAncestor(parent: string, child: string): boolean {
  const relative = path.relative(parent, child)
  return (
    relative === '' ||
    (relative !== '..' && !relative.startsWith(`..${path.sep}`))
  )
}

export async function digestDirectory(directory: string): Promise<string> {
  const canonicalRoot = await canonicalDirectory(directory, 'digest root')
  const hash = createHash('sha256')

  for (const relativePath of await listRegularFiles(canonicalRoot)) {
    const bytes = await readFile(path.join(canonicalRoot, relativePath))
    hash.update(relativePath)
    hash.update('\0')
    hash.update(String(bytes.byteLength))
    hash.update('\0')
    hash.update(bytes)
    hash.update('\0')
  }

  return hash.digest('hex')
}

export async function materializeE2eSemesterWorkspace(_options: {
  readonly environment?: NodeJS.ProcessEnv
  readonly seedRoot?: string
} = {}): Promise<E2eSemesterWorkspace> {
  const seedRoot = await canonicalDirectory(
    _options.seedRoot ?? canonicalSemesterWorkspaceSeed,
    'canonical seed',
  )
  const seedDigest = await digestDirectory(seedRoot)
  const createdRunRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-first-assignment-e2e-'),
  )
  const runRoot = await realpath(createdRunRoot)
  const workspaceRoot = path.join(runRoot, 'semester-workspace')
  const runId = randomUUID()

  try {
    await cp(seedRoot, workspaceRoot, {
      errorOnExist: true,
      force: false,
      recursive: true,
    })
    if ((await digestDirectory(workspaceRoot)) !== seedDigest) {
      throw new Error('E2E SemesterWorkspace copy digest does not match the seed')
    }
    await writeFile(
      path.join(runRoot, e2eRunMarkerName),
      `${JSON.stringify(
        {
          formatVersion: 1,
          kind: e2eRunMarkerKind,
          runId,
          runRoot,
        },
        null,
        2,
      )}\n`,
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    )
  } catch (error) {
    await rm(runRoot, { force: true, recursive: true })
    throw error
  }

  let cleaned = false
  return {
    runRoot,
    seedDigest,
    workspaceRoot: await realpath(workspaceRoot),
    async cleanup() {
      if (cleaned) return
      await assertOwnedE2eRun(runRoot, runId)
      const seedBeforeCleanup = await digestDirectory(seedRoot)
      await rm(runRoot, { recursive: true })
      cleaned = true
      const seedAfterCleanup = await digestDirectory(seedRoot)
      if (
        seedBeforeCleanup !== seedDigest ||
        seedAfterCleanup !== seedDigest
      ) {
        throw new Error('Canonical SemesterWorkspace seed changed during E2E cleanup')
      }
    },
  }
}

async function materializeManagedWorkspace(options: {
  readonly seedDigest: string
  readonly seedRoot: string
  readonly workspaceRoot: string
}): Promise<void> {
  const parentRoot = path.dirname(options.workspaceRoot)
  if (
    path.basename(options.workspaceRoot) !== workspaceLeaf ||
    path.basename(parentRoot) !== managedParentLeaf
  ) {
    throw new Error('Managed SemesterWorkspace target is outside the exact leaf')
  }

  await mkdir(parentRoot, { recursive: true })
  if (await pathExists(options.workspaceRoot)) {
    await assertOwnedWorkspace(options.workspaceRoot)
  }

  const stagingRoot = path.join(
    parentRoot,
    `.${workspaceLeaf}.materializing-${randomUUID()}`,
  )
  const backupRoot = path.join(
    parentRoot,
    `.${workspaceLeaf}.replaced-${randomUUID()}`,
  )
  let previousMoved = false
  let published = false
  try {
    await cp(options.seedRoot, stagingRoot, {
      errorOnExist: true,
      force: false,
      recursive: true,
    })
    if ((await digestDirectory(stagingRoot)) !== options.seedDigest) {
      throw new Error(
        'Development SemesterWorkspace copy digest does not match the seed',
      )
    }
    await writeFile(
      path.join(stagingRoot, ownershipMarkerName),
      `${JSON.stringify(
        {
          formatVersion: 1,
          kind: ownershipMarkerKind,
          seedDigest: options.seedDigest,
          workspaceRoot: options.workspaceRoot,
        },
        null,
        2,
      )}\n`,
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    )
    if (await pathExists(options.workspaceRoot)) {
      await rename(options.workspaceRoot, backupRoot)
      previousMoved = true
    }
    try {
      await rename(stagingRoot, options.workspaceRoot)
      published = true
    } catch (error) {
      if (previousMoved) {
        await rename(backupRoot, options.workspaceRoot)
        previousMoved = false
      }
      throw error
    }
  } finally {
    await rm(stagingRoot, { force: true, recursive: true })
    if (published && previousMoved) {
      await rm(backupRoot, { recursive: true })
    }
  }
}

async function assertOwnedWorkspace(workspaceRoot: string): Promise<void> {
  const stats = await lstat(workspaceRoot)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('Managed SemesterWorkspace target is not an owned directory')
  }
  let marker: unknown
  try {
    marker = JSON.parse(
      await readFile(path.join(workspaceRoot, ownershipMarkerName), 'utf8'),
    )
  } catch {
    throw new Error('Managed SemesterWorkspace ownership marker is missing')
  }
  if (
    !isRecord(marker) ||
    marker.formatVersion !== 1 ||
    marker.kind !== ownershipMarkerKind ||
    typeof marker.seedDigest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(marker.seedDigest) ||
    marker.workspaceRoot !== workspaceRoot
  ) {
    throw new Error('Managed SemesterWorkspace ownership marker is invalid')
  }
}

async function assertOwnedE2eRun(runRoot: string, runId: string): Promise<void> {
  const stats = await lstat(runRoot)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error('E2E run root is not an owned directory')
  }
  let marker: unknown
  try {
    marker = JSON.parse(
      await readFile(path.join(runRoot, e2eRunMarkerName), 'utf8'),
    )
  } catch {
    throw new Error('E2E run ownership marker is missing')
  }
  if (
    !isRecord(marker) ||
    marker.formatVersion !== 1 ||
    marker.kind !== e2eRunMarkerKind ||
    marker.runId !== runId ||
    marker.runRoot !== runRoot
  ) {
    throw new Error('E2E run ownership marker is invalid')
  }
}

async function canonicalDirectory(
  directory: string,
  label: string,
): Promise<string> {
  if (!path.isAbsolute(directory)) {
    throw new Error(`${label} must be an absolute directory`)
  }
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new Error(`${label} must be a non-symlink directory`)
  }
  return realpath(directory)
}

async function listRegularFiles(root: string): Promise<string[]> {
  const files: string[] = []
  const visit = async (relativeDirectory: string): Promise<void> => {
    const entries = await readdir(path.join(root, relativeDirectory), {
      withFileTypes: true,
    })
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name)
      if (entry.isSymbolicLink()) {
        throw new Error('Digest roots cannot contain symbolic links')
      }
      if (entry.isDirectory()) {
        await visit(relativePath)
      } else if (entry.isFile()) {
        files.push(relativePath.split(path.sep).join('/'))
      } else {
        throw new Error('Digest roots can contain only regular files')
      }
    }
  }

  await visit('')
  return files
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

async function main(): Promise<void> {
  const selected = await materializeDevelopmentSemesterWorkspace()
  const ownership =
    selected.ownership === 'caller' ? 'caller-owned' : 'managed'
  console.log(`SemesterWorkspace: ${selected.workspaceRoot} (${ownership})`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
