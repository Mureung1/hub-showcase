import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
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
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'

import {
  classifySemesterWorkspaceRootStateBytes,
} from '../../../../packages/semester-workspace/src/v4-codec.js'

const execFileAsync = promisify(execFile)
const scaffoldCommitSubject = 'chore: initialize semester workspace'
const baselineCommitSubject = 'chore: baseline semester materials'
const fixtureReservedRoots = new Set([
  '.agents',
  '.codex',
  '.git',
  '.gitignore',
  'agents.md',
  'workspace-state.json',
])
const managedScaffoldPaths = [
  '.codex/config.toml',
  '.gitignore',
  'AGENTS.md',
] as const

export type DogfoodWorkspaceInput = {
  readonly fixtureRoot: string
  readonly workspaceRoot: string
  readonly builtInSkillCatalogRoot: string
  readonly yearLevel: number
  readonly termKey: string
  readonly termDisplayName: string
}

export type DogfoodWorkspaceInspection = {
  readonly classification: 'ready' | 'reseedable' | 'conflict'
  readonly reasons: readonly string[]
  readonly fixtureRoot: string
  readonly workspaceRoot: string
  readonly builtInSkillCatalogRoot: string
  readonly baselinePaths: readonly string[]
  readonly head?: string
}

export type DogfoodWorkspaceReseedResult = {
  readonly action: 'reseeded'
  readonly workspaceRoot: string
  readonly baselinePaths: readonly string[]
}

type Tree = ReadonlyMap<string, Uint8Array>

type PreparedInput = {
  readonly input: DogfoodWorkspaceInput
  readonly fixtureTree: Tree
  readonly catalogTree: Tree
  readonly workspaceExists: boolean
}

type GitHistory = {
  readonly head: string
  readonly scaffoldCommit: string
  readonly baselineCommit: string
  readonly scaffoldPaths: readonly string[]
  readonly baselinePaths: readonly string[]
}

export async function inspectDogfoodWorkspace(
  input: DogfoodWorkspaceInput,
): Promise<DogfoodWorkspaceInspection> {
  return inspectPrepared(await prepareInput(input))
}

export async function reseedDogfoodWorkspace(
  input: DogfoodWorkspaceInput & { readonly confirmReplace: string },
): Promise<DogfoodWorkspaceReseedResult> {
  const prepared = await prepareInput(input)
  const inspection = await inspectPrepared(prepared)
  if (input.confirmReplace !== prepared.input.workspaceRoot) {
    throw new Error(
      '--confirm-replace must exactly equal the canonical workspace root.',
    )
  }
  if (inspection.classification === 'ready') {
    throw new Error('Refusing to replace a ready dogfood workspace.')
  }
  if (inspection.classification === 'conflict') {
    throw new Error(
      `Refusing to replace a conflicting workspace: ${inspection.reasons.join(', ')}`,
    )
  }

  const workspaceParent = path.dirname(prepared.input.workspaceRoot)
  const workspaceName = path.basename(prepared.input.workspaceRoot)
  const stagingRoot = await mkdtemp(
    path.join(workspaceParent, `.${workspaceName}.ay-ple-e2e-staging-`),
  )
  let backupRoot: string | undefined
  try {
    await writeTree(stagingRoot, prepared.fixtureTree)
    if (prepared.workspaceExists) {
      backupRoot = path.join(
        workspaceParent,
        `.${workspaceName}.ay-ple-e2e-backup-${randomBytes(8).toString('hex')}`,
      )
      await rename(prepared.input.workspaceRoot, backupRoot)
    }
    try {
      await rename(stagingRoot, prepared.input.workspaceRoot)
    } catch (error) {
      if (backupRoot !== undefined) {
        await rename(backupRoot, prepared.input.workspaceRoot)
        backupRoot = undefined
      }
      throw error
    }
    if (backupRoot !== undefined) {
      await rm(backupRoot, { recursive: true })
      backupRoot = undefined
    }
  } finally {
    await rm(stagingRoot, { force: true, recursive: true })
  }

  return {
    action: 'reseeded',
    workspaceRoot: prepared.input.workspaceRoot,
    baselinePaths: [...prepared.fixtureTree.keys()],
  }
}

async function inspectPrepared(
  prepared: PreparedInput,
): Promise<DogfoodWorkspaceInspection> {
  const base = {
    fixtureRoot: prepared.input.fixtureRoot,
    workspaceRoot: prepared.input.workspaceRoot,
    builtInSkillCatalogRoot: prepared.input.builtInSkillCatalogRoot,
    baselinePaths: [...prepared.fixtureTree.keys()],
  }
  if (!prepared.workspaceExists) {
    return {
      classification: 'reseedable',
      reasons: ['workspace_missing'],
      ...base,
    }
  }

  const gitMetadata = await lstat(
    path.join(prepared.input.workspaceRoot, '.git'),
  ).catch(() => undefined)
  if (
    gitMetadata !== undefined &&
    (!gitMetadata.isDirectory() || gitMetadata.isSymbolicLink())
  ) {
    return {
      classification: 'conflict',
      reasons: ['workspace_not_exact_git_root'],
      ...base,
    }
  }
  const rawTree = gitMetadata === undefined
    ? await readTreeIfUnprepared(prepared.input.workspaceRoot)
    : undefined
  if (rawTree !== undefined) {
    return treeEquals(rawTree, prepared.fixtureTree)
      ? {
          classification: 'reseedable',
          reasons: ['workspace_unprepared'],
          ...base,
        }
      : {
          classification: 'conflict',
          reasons: ['unrecognized_generated_history'],
          ...base,
        }
  }

  const gitRoot = await git(
    prepared.input.workspaceRoot,
    ['rev-parse', '--show-toplevel'],
    { allowFailure: true },
  )
  if (
    gitRoot.exitCode !== 0 ||
    (await realpath(gitRoot.stdout.trim()).catch(() => undefined)) !==
      prepared.input.workspaceRoot
  ) {
    return {
      classification: 'conflict',
      reasons: ['workspace_not_exact_git_root'],
      ...base,
    }
  }

  const headResult = await git(prepared.input.workspaceRoot, [
    'rev-parse',
    'HEAD',
  ], { allowFailure: true })
  const head = headResult.exitCode === 0
    ? headResult.stdout.trim()
    : undefined
  const status = await git(prepared.input.workspaceRoot, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
  ])
  if (status.stdout.length > 0) {
    return {
      classification: 'conflict',
      reasons: ['workspace_dirty'],
      head,
      ...base,
    }
  }
  const remotes = await git(prepared.input.workspaceRoot, ['remote'])
  if (remotes.stdout.trim().length > 0) {
    return {
      classification: 'conflict',
      reasons: ['unrecognized_generated_history'],
      head,
      ...base,
    }
  }

  const history = await inspectGeneratedHistory(
    prepared.input.workspaceRoot,
  ).catch(() => undefined)
  if (history === undefined) {
    return {
      classification: 'conflict',
      reasons: ['unrecognized_generated_history'],
      head,
      ...base,
    }
  }

  const conflictReasons: string[] = []
  const reseedReasons: string[] = []
  const trackedPaths = await nulSeparatedGitPaths(
    prepared.input.workspaceRoot,
    ['ls-files', '-z'],
  )
  const allowedPaths = new Set([
    ...history.scaffoldPaths,
    ...history.baselinePaths,
    ...prepared.fixtureTree.keys(),
    ...[...prepared.catalogTree.keys()].map(
      (relativePath) => `.agents/skills/${relativePath}`,
    ),
  ])
  if (trackedPaths.some((relativePath) => !allowedPaths.has(relativePath))) {
    conflictReasons.push('unexpected_tracked_path')
  }

  const statePath = path.join(
    prepared.input.workspaceRoot,
    'workspace-state.json',
  )
  const stateBytes = await readRegularFile(statePath).catch(() => undefined)
  if (stateBytes === undefined) {
    conflictReasons.push('workspace_state_invalid')
  } else {
    const classification = classifySemesterWorkspaceRootStateBytes(stateBytes)
    if (classification.status !== 'current_v4') {
      conflictReasons.push('workspace_state_invalid')
    } else {
      const state = classification.state
      if (
        state.semester.yearLevel !== prepared.input.yearLevel ||
        state.semester.term.key !== prepared.input.termKey ||
        state.semester.term.displayName !== prepared.input.termDisplayName
      ) {
        conflictReasons.push('semester_identity_mismatch')
      }
      const initialStateBytes = await gitFile(
        prepared.input.workspaceRoot,
        history.scaffoldCommit,
        'workspace-state.json',
      ).catch(() => undefined)
      const initialClassification = initialStateBytes === undefined
        ? undefined
        : classifySemesterWorkspaceRootStateBytes(initialStateBytes)
      if (
        initialClassification?.status !== 'current_v4' ||
        initialClassification.state.workspaceId !== state.workspaceId
      ) {
        conflictReasons.push('workspace_identity_mismatch')
      }
      if (
        typeof state.snapshot !== 'object' ||
        state.snapshot === null ||
        Array.isArray(state.snapshot)
      ) {
        conflictReasons.push('workspace_state_invalid')
      } else if (Object.keys(state.snapshot).length > 0) {
        reseedReasons.push('applied_snapshot')
      }
    }
  }

  for (const relativePath of managedScaffoldPaths) {
    const current = await readRegularFile(
      path.join(prepared.input.workspaceRoot, relativePath),
    ).catch(() => undefined)
    const initial = await gitFile(
      prepared.input.workspaceRoot,
      history.scaffoldCommit,
      relativePath,
    ).catch(() => undefined)
    if (
      current === undefined ||
      initial === undefined ||
      !bytesEqual(current, initial)
    ) {
      conflictReasons.push('managed_scaffold_drift')
      break
    }
  }

  const materialPaths = new Set([
    ...history.baselinePaths,
    ...prepared.fixtureTree.keys(),
  ])
  const workspaceMaterials = await readWorkspacePaths(
    prepared.input.workspaceRoot,
    materialPaths,
  )
  if (!treeEquals(workspaceMaterials, prepared.fixtureTree)) {
    reseedReasons.push('fixture_tree_drift')
  }

  const installedSkillRoot = path.join(
    prepared.input.workspaceRoot,
    '.agents/skills',
  )
  const installedSkills = await readTree(installedSkillRoot).catch(
    () => undefined,
  )
  if (
    installedSkills === undefined ||
    !treeEquals(installedSkills, prepared.catalogTree)
  ) {
    reseedReasons.push('built_in_skill_catalog_drift')
  }

  const reasons = unique(
    conflictReasons.length > 0 ? conflictReasons : reseedReasons,
  )
  return {
    classification:
      conflictReasons.length > 0
        ? 'conflict'
        : reseedReasons.length > 0
          ? 'reseedable'
          : 'ready',
    reasons,
    head: history.head,
    ...base,
  }
}

async function prepareInput(
  input: DogfoodWorkspaceInput,
): Promise<PreparedInput> {
  if (
    !Number.isInteger(input.yearLevel) ||
    input.yearLevel < 1 ||
    input.yearLevel > 20
  ) {
    throw new Error('year-level must be an integer from 1 through 20.')
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.termKey)) {
    throw new Error('term-key must be a lowercase ASCII slug.')
  }
  if (input.termDisplayName.trim().length === 0) {
    throw new Error('term-display-name must not be empty.')
  }

  const fixtureRoot = await canonicalExistingDirectory(
    input.fixtureRoot,
    'Fixture root',
  )
  const builtInSkillCatalogRoot = await canonicalExistingDirectory(
    input.builtInSkillCatalogRoot,
    'Built-in Skill catalog root',
  )
  const workspace = await canonicalWorkspaceTarget(input.workspaceRoot)
  assertRootsDoNotOverlap([
    ['fixture root', fixtureRoot],
    ['workspace root', workspace.root],
    ['built-in Skill catalog root', builtInSkillCatalogRoot],
  ])

  const fixtureTree = await readTree(fixtureRoot)
  if (fixtureTree.size === 0) {
    throw new Error('Fixture root must contain at least one regular file.')
  }
  for (const relativePath of fixtureTree.keys()) {
    const rootSegment = relativePath.split('/')[0].toLowerCase()
    if (fixtureReservedRoots.has(rootSegment)) {
      throw new Error(
        `Fixture path conflicts with Bootstrap ownership: ${relativePath}`,
      )
    }
  }
  const catalogTree = await readTree(builtInSkillCatalogRoot)
  return {
    input: {
      ...input,
      fixtureRoot,
      workspaceRoot: workspace.root,
      builtInSkillCatalogRoot,
    },
    fixtureTree,
    catalogTree,
    workspaceExists: workspace.exists,
  }
}

async function inspectGeneratedHistory(root: string): Promise<GitHistory> {
  const log = await git(root, [
    'log',
    '--first-parent',
    '--format=%H%x00%s%x00',
    'HEAD',
  ])
  const fields = log.stdout
    .split('\0')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
  const commits: { readonly hash: string; readonly subject: string }[] = []
  for (let index = 0; index < fields.length; index += 2) {
    const hash = fields[index]
    const subject = fields[index + 1]
    if (hash === undefined || subject === undefined) {
      throw new Error('Unexpected Git log output.')
    }
    commits.push({ hash, subject })
  }
  const scaffold = commits.find(
    ({ subject }) => subject === scaffoldCommitSubject,
  )
  const baseline = commits.find(
    ({ subject }) => subject === baselineCommitSubject,
  )
  if (scaffold === undefined || baseline === undefined) {
    throw new Error('Generated Bootstrap checkpoints were not found.')
  }
  const ancestry = await git(root, [
    'merge-base',
    '--is-ancestor',
    scaffold.hash,
    baseline.hash,
  ], { allowFailure: true })
  if (ancestry.exitCode !== 0) {
    throw new Error('Generated Bootstrap checkpoints have invalid ancestry.')
  }
  return {
    head: commits[0]?.hash ?? '',
    scaffoldCommit: scaffold.hash,
    baselineCommit: baseline.hash,
    scaffoldPaths: await nulSeparatedGitPaths(root, [
      'diff-tree',
      '--root',
      '--no-commit-id',
      '--name-only',
      '-r',
      '-z',
      scaffold.hash,
    ]),
    baselinePaths: await nulSeparatedGitPaths(root, [
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      '-z',
      baseline.hash,
    ]),
  }
}

async function readTreeIfUnprepared(root: string): Promise<Tree | undefined> {
  const inherited = await git(root, ['rev-parse', '--show-toplevel'], {
    allowFailure: true,
  })
  if (inherited.exitCode === 0) return undefined
  return readTree(root)
}

async function canonicalExistingDirectory(
  input: string,
  label: string,
): Promise<string> {
  assertCanonicalAbsolutePath(input, label)
  const metadata = await lstat(input).catch(() => undefined)
  if (
    metadata === undefined ||
    !metadata.isDirectory() ||
    metadata.isSymbolicLink()
  ) {
    throw new Error(`${label} must be an existing non-symlink directory.`)
  }
  const canonical = await realpath(input)
  if (canonical !== input) {
    throw new Error(`${label} must not traverse a symlinked path.`)
  }
  return canonical
}

async function canonicalWorkspaceTarget(
  input: string,
): Promise<{ readonly root: string; readonly exists: boolean }> {
  assertCanonicalAbsolutePath(input, 'Workspace root')
  const metadata = await lstat(input).catch(() => undefined)
  if (metadata !== undefined) {
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error('Workspace root must be a non-symlink directory.')
    }
    const canonical = await realpath(input)
    if (canonical !== input) {
      throw new Error('Workspace root must not traverse a symlinked path.')
    }
    return { root: canonical, exists: true }
  }
  const parent = path.dirname(input)
  const canonicalParent = await canonicalExistingDirectory(
    parent,
    'Workspace parent',
  )
  if (canonicalParent !== parent) {
    throw new Error('Workspace parent must be canonical.')
  }
  return { root: input, exists: false }
}

function assertCanonicalAbsolutePath(input: string, label: string): void {
  if (
    !path.isAbsolute(input) ||
    path.normalize(input) !== input ||
    input === path.parse(input).root
  ) {
    throw new Error(`${label} must be a canonical absolute path.`)
  }
}

function assertRootsDoNotOverlap(
  roots: readonly (readonly [string, string])[],
): void {
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      const [leftLabel, leftRoot] = roots[left]
      const [rightLabel, rightRoot] = roots[right]
      if (containsPath(leftRoot, rightRoot) || containsPath(rightRoot, leftRoot)) {
        throw new Error(`${leftLabel} and ${rightLabel} must not overlap.`)
      }
    }
  }
}

function containsPath(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  )
}

async function readTree(root: string): Promise<Tree> {
  const result = new Map<string, Uint8Array>()
  await walkTree(root, '', result)
  return new Map([...result].sort(([left], [right]) => comparePaths(left, right)))
}

async function walkTree(
  root: string,
  relative: string,
  result: Map<string, Uint8Array>,
): Promise<void> {
  const entries = (await readdir(path.join(root, relative), {
    withFileTypes: true,
  })).sort((left, right) => comparePaths(left.name, right.name))
  for (const entry of entries) {
    const child = path.join(relative, entry.name)
    const absolute = path.join(root, child)
    const metadata = await lstat(absolute)
    if (metadata.isSymbolicLink()) {
      throw new Error(`Unsafe symlink in tree: ${toPosixPath(child)}`)
    }
    if (metadata.isDirectory()) {
      await walkTree(root, child, result)
      continue
    }
    if (!metadata.isFile()) {
      throw new Error(`Unsafe non-file entry in tree: ${toPosixPath(child)}`)
    }
    result.set(toPosixPath(child), await readFile(absolute))
  }
}

async function readWorkspacePaths(
  root: string,
  relativePaths: ReadonlySet<string>,
): Promise<Tree> {
  const result = new Map<string, Uint8Array>()
  for (const relativePath of [...relativePaths].sort(comparePaths)) {
    const bytes = await readRegularFile(
      path.join(root, ...relativePath.split('/')),
    ).catch(() => undefined)
    if (bytes !== undefined) result.set(relativePath, bytes)
  }
  return result
}

async function readRegularFile(filePath: string): Promise<Uint8Array> {
  const metadata = await lstat(filePath)
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`Expected a non-symlink regular file: ${filePath}`)
  }
  return readFile(filePath)
}

async function writeTree(root: string, tree: Tree): Promise<void> {
  for (const [relativePath, bytes] of tree) {
    const destination = path.join(root, ...relativePath.split('/'))
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, bytes)
  }
}

function treeEquals(left: Tree, right: Tree): boolean {
  if (left.size !== right.size) return false
  for (const [relativePath, leftBytes] of left) {
    const rightBytes = right.get(relativePath)
    if (rightBytes === undefined || !bytesEqual(leftBytes, rightBytes)) {
      return false
    }
  }
  return true
}

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  return Buffer.from(left).equals(Buffer.from(right))
}

async function gitFile(
  root: string,
  commit: string,
  relativePath: string,
): Promise<Uint8Array> {
  const result = await execFileAsync(
    'git',
    ['show', `${commit}:${relativePath}`],
    {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: 16 * 1024 * 1024,
    },
  )
  return result.stdout
}

async function nulSeparatedGitPaths(
  root: string,
  arguments_: readonly string[],
): Promise<readonly string[]> {
  const result = await git(root, ['-c', 'core.quotepath=false', ...arguments_])
  return result.stdout
    .split('\0')
    .filter((value) => value.length > 0)
    .map((value) => toPosixPath(value))
    .sort(comparePaths)
}

async function git(
  cwd: string,
  arguments_: readonly string[],
  options: { readonly allowFailure?: boolean } = {},
): Promise<{
  readonly stdout: string
  readonly stderr: string
  readonly exitCode: number
}> {
  try {
    const result = await execFileAsync('git', arguments_, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
    return { ...result, exitCode: 0 }
  } catch (error) {
    const failure = error as Error & {
      readonly stdout?: string
      readonly stderr?: string
      readonly code?: number
    }
    if (options.allowFailure) {
      return {
        stdout: failure.stdout ?? '',
        stderr: failure.stderr ?? failure.message,
        exitCode: typeof failure.code === 'number' ? failure.code : 1,
      }
    }
    throw new Error(
      `Git command failed: git ${arguments_.join(' ')}\n${failure.stderr ?? failure.message}`,
    )
  }
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)]
}

type CliArguments = DogfoodWorkspaceInput & {
  readonly command: 'inspect' | 'reseed'
  readonly confirmReplace?: string
}

function parseArguments(arguments_: readonly string[]): CliArguments {
  const command = arguments_[0]
  if (command !== 'inspect' && command !== 'reseed') throw usage()
  const values = new Map<string, string>()
  for (let index = 1; index < arguments_.length; index += 2) {
    const flag = arguments_[index]
    const value = arguments_[index + 1]
    if (
      flag === undefined ||
      value === undefined ||
      !flag.startsWith('--') ||
      values.has(flag)
    ) {
      throw usage()
    }
    values.set(flag, value)
  }
  const fixtureRoot = values.get('--fixture-root')
  const workspaceRoot = values.get('--workspace-root')
  const builtInSkillCatalogRoot = values.get(
    '--built-in-skill-catalog-root',
  )
  const yearLevel = Number(values.get('--year-level'))
  const termKey = values.get('--term-key')
  const termDisplayName = values.get('--term-display-name')
  const confirmReplace = values.get('--confirm-replace')
  const allowedFlags = new Set([
    '--fixture-root',
    '--workspace-root',
    '--built-in-skill-catalog-root',
    '--year-level',
    '--term-key',
    '--term-display-name',
    ...(command === 'reseed' ? ['--confirm-replace'] : []),
  ])
  if (
    [...values.keys()].some((flag) => !allowedFlags.has(flag)) ||
    fixtureRoot === undefined ||
    workspaceRoot === undefined ||
    builtInSkillCatalogRoot === undefined ||
    termKey === undefined ||
    termDisplayName === undefined ||
    !Number.isFinite(yearLevel) ||
    (command === 'reseed' && confirmReplace === undefined)
  ) {
    throw usage()
  }
  return {
    command,
    fixtureRoot,
    workspaceRoot,
    builtInSkillCatalogRoot,
    yearLevel,
    termKey,
    termDisplayName,
    confirmReplace,
  }
}

function usage(): Error {
  return new Error(
    'Usage: reconcile-dogfood-workspace.mts <inspect|reseed> --fixture-root <absolute-path> --workspace-root <absolute-path> --built-in-skill-catalog-root <absolute-path> --year-level <1-20> --term-key <slug> --term-display-name <name> [--confirm-replace <exact-workspace-root>]',
  )
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2))
  const output = arguments_.command === 'inspect'
    ? await inspectDogfoodWorkspace(arguments_)
    : await reseedDogfoodWorkspace({
        ...arguments_,
        confirmReplace: arguments_.confirmReplace ?? '',
      })
  console.log(JSON.stringify(output, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
