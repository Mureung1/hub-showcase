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

import {
  canonicalProductDirectory as canonicalDirectory,
  productPathExists as pathExists,
} from './product-path-utils.mjs'

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url))
const workspaceLeaf = 'first-assignment-semester-workspace'
const managedParentLeaf = '.ay-ple-dev-workspaces'
const ownershipMarkerName = '.ay-ple-materialized-workspace.json'
const ownershipMarkerKind = 'ay-ple-development-semester-workspace'
const e2eRunMarkerName = '.ay-ple-owned-e2e-run.json'
const e2eRunMarkerKind = 'ay-ple-e2e-semester-workspace-run'

export const canonicalSemesterWorkspaceSeed = path.join(
  repositoryRoot,
  'apps/chat-shell/e2e/fixtures',
  workspaceLeaf,
)
export const canonicalSemesterWorkspaceSeedDigest =
  'ffbe1d713e1f6cbaefd12b650e597a068dd88259dc675447633640b8a3b24f55'

export type DevelopmentSemesterWorkspace = {
  readonly ownership: 'managed'
  readonly seedDigest: string
  readonly workspaceRoot: string
} | {
  readonly ownership: 'caller'
  readonly workspaceRoot: string
}

export type E2eSemesterWorkspace = {
  readonly runId: string
  readonly runRoot: string
  readonly seedDigest: string
  readonly workspaceRoot: string
  cleanup(): Promise<void>
}

export async function materializeDevelopmentSemesterWorkspace(options: {
  readonly appDataRoot?: string
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
  const managedRoots = [packageRoot]
  if (options.appDataRoot !== undefined) {
    const appDataRoot = await canonicalDirectory(
      options.appDataRoot,
      'product app data root',
    )
    assertProductRootsDoNotOverlap(packageRoot, appDataRoot)
    managedRoots.push(appDataRoot)
  }
  const configuredWorkspace = environment.CODEX_CHAT_WORKSPACE
  if (configuredWorkspace !== undefined) {
    const workspaceRoot = await canonicalDirectory(
      configuredWorkspace,
      'CODEX_CHAT_WORKSPACE',
    )
    for (const managedRoot of managedRoots) {
      assertProductRootsDoNotOverlap(managedRoot, workspaceRoot)
    }
    return { ownership: 'caller', workspaceRoot }
  }
  const workspaceRootCandidate = path.join(
    path.dirname(packageRoot),
    managedParentLeaf,
    workspaceLeaf,
  )
  for (const managedRoot of managedRoots) {
    assertProductRootsDoNotOverlap(managedRoot, workspaceRootCandidate)
  }
  const managedParentRoot = await ensureManagedParent(packageRoot)
  const workspaceRoot = path.join(managedParentRoot, workspaceLeaf)
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

export function assertProductRootsDoNotOverlap(
  firstRoot: string,
  secondRoot: string,
): void {
  if (
    isSameOrAncestor(firstRoot, secondRoot) ||
    isSameOrAncestor(secondRoot, firstRoot)
  ) {
    throw new Error('Product roots cannot overlap')
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

export async function materializeE2eSemesterWorkspace(options: {
  readonly seedRoot?: string
} = {}): Promise<E2eSemesterWorkspace> {
  const seedRoot = await canonicalDirectory(
    options.seedRoot ?? canonicalSemesterWorkspaceSeed,
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
    runId,
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

export async function materializeScanLimitSemesterWorkspace(
  workspaceRoot: string,
): Promise<void> {
  await mkdir(workspaceRoot)
  for (let start = 0; start < 4096; start += 256) {
    await Promise.all(
      Array.from({ length: 256 }, (_, offset) =>
        writeFile(path.join(workspaceRoot, `entry-${start + offset}.md`), ''),
      ),
    )
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

  if (
    (await canonicalDirectory(parentRoot, 'managed workspace parent')) !==
    parentRoot
  ) {
    throw new Error('Managed workspace parent must be canonical')
  }
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

async function ensureManagedParent(packageRoot: string): Promise<string> {
  const parentRoot = path.join(path.dirname(packageRoot), managedParentLeaf)
  if (!(await pathExists(parentRoot))) {
    await mkdir(parentRoot)
  }
  const canonicalParent = await canonicalDirectory(
    parentRoot,
    'managed workspace parent',
  )
  if (canonicalParent !== parentRoot) {
    throw new Error('Managed workspace parent must be canonical')
  }
  return canonicalParent
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
