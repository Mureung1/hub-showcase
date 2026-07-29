import { execFile } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
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
import { parseArgs, promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const fixtureMarker = 'ay-ple.e2eDogfoodFixtureRoot'
const workspaceMarker = 'ay-ple.e2eDogfoodWorkspaceRoot'

type Tree = ReadonlyMap<string, Uint8Array>

type DogfoodRoots = {
  readonly fixtureRoot: string
  readonly workspaceRoot: string
}

type PreparedRoots = DogfoodRoots & {
  readonly fixtureTree: Tree
  readonly workspaceExists: boolean
}

export async function stageDogfoodWorkspace(
  input: DogfoodRoots & { readonly confirmReplace: string },
) {
  const roots = await prepareRoots(input)
  assertConfirmation(input.confirmReplace, roots.workspaceRoot)
  const target = await inspectReplaceableTarget(roots)
  const stagingRoot = await mkdtemp(
    path.join(
      path.dirname(roots.workspaceRoot),
      `.${path.basename(roots.workspaceRoot)}.ay-ple-e2e-staging-`,
    ),
  )
  try {
    await writeTree(stagingRoot, roots.fixtureTree)
  } catch (error) {
    await rm(stagingRoot, { force: true, recursive: true })
    throw error
  }
  return {
    action: 'staged',
    workspaceRoot: roots.workspaceRoot,
    stagingRoot,
    expectedTargetFingerprint: target.fingerprint,
    baselinePaths: [...roots.fixtureTree.keys()],
  }
}

export async function adoptDogfoodWorkspace(
  input: DogfoodRoots & {
    readonly confirmReplace: string
    readonly expectedHead: string
  },
) {
  const roots = await prepareRoots(input)
  assertConfirmation(input.confirmReplace, roots.workspaceRoot)
  if (!roots.workspaceExists) {
    throw new Error('Only an existing prepared dogfood target can be adopted.')
  }
  await assertExactCleanLocalGitRoot(roots.workspaceRoot)
  const [fixtureValue, workspaceValue, head] = await Promise.all([
    gitConfig(roots.workspaceRoot, fixtureMarker),
    gitConfig(roots.workspaceRoot, workspaceMarker),
    gitOutput(roots.workspaceRoot, ['rev-parse', 'HEAD']),
  ])
  if (head !== input.expectedHead) {
    throw new Error('Dogfood target HEAD changed before adoption.')
  }
  if (
    (fixtureValue !== undefined && fixtureValue !== roots.fixtureRoot) ||
    (workspaceValue !== undefined && workspaceValue !== roots.workspaceRoot)
  ) {
    throw new Error('Dogfood target has conflicting E2E ownership markers.')
  }
  const wroteFixture = fixtureValue === undefined
  const wroteWorkspace = workspaceValue === undefined
  await gitOutput(roots.workspaceRoot, [
    'config',
    '--local',
    fixtureMarker,
    roots.fixtureRoot,
  ])
  await gitOutput(roots.workspaceRoot, [
    'config',
    '--local',
    workspaceMarker,
    roots.workspaceRoot,
  ])
  try {
    const adopted = await inspectReplaceableTarget(roots)
    if (adopted.fingerprint !== `git:${input.expectedHead}`) {
      throw new Error('Dogfood target changed while adoption was recorded.')
    }
  } catch (error) {
    if (wroteFixture) {
      await unsetGitConfig(roots.workspaceRoot, fixtureMarker)
    }
    if (wroteWorkspace) {
      await unsetGitConfig(roots.workspaceRoot, workspaceMarker)
    }
    throw error
  }
  return {
    action: 'adopted',
    workspaceRoot: roots.workspaceRoot,
    head,
  }
}

export async function activateDogfoodWorkspace(
  input: DogfoodRoots & {
    readonly stagingRoot: string
    readonly confirmReplace: string
    readonly expectedTargetFingerprint: string
    readonly expectedStagingHead: string
  },
) {
  const roots = await prepareRoots(input)
  assertConfirmation(input.confirmReplace, roots.workspaceRoot)
  const stagingRoot = await canonicalExistingDirectory(
    input.stagingRoot,
    'Staging root',
  )
  const expectedPrefix = `.${path.basename(roots.workspaceRoot)}.ay-ple-e2e-staging-`
  if (
    path.dirname(stagingRoot) !== path.dirname(roots.workspaceRoot) ||
    !path.basename(stagingRoot).startsWith(expectedPrefix)
  ) {
    throw new Error('Staging root is not owned by this dogfood target.')
  }
  assertRootsDoNotOverlap([
    ['fixture root', roots.fixtureRoot],
    ['workspace root', roots.workspaceRoot],
    ['staging root', stagingRoot],
  ])

  const target = await inspectReplaceableTarget(roots)
  if (target.fingerprint !== input.expectedTargetFingerprint) {
    throw new Error('Dogfood target changed after staging; original bytes were preserved.')
  }
  const head = await assertPreparedStaging(
    stagingRoot,
    roots.fixtureTree,
  )
  if (head !== input.expectedStagingHead) {
    throw new Error('Prepared staging HEAD changed after readiness review.')
  }
  await gitOutput(stagingRoot, [
    'config',
    '--local',
    fixtureMarker,
    roots.fixtureRoot,
  ])
  await gitOutput(stagingRoot, [
    'config',
    '--local',
    workspaceMarker,
    roots.workspaceRoot,
  ])

  const backupRoot = roots.workspaceExists
    ? path.join(
        path.dirname(roots.workspaceRoot),
        `.${path.basename(roots.workspaceRoot)}.ay-ple-e2e-backup-${randomBytes(8).toString('hex')}`,
      )
    : undefined
  if (backupRoot !== undefined) {
    await rename(roots.workspaceRoot, backupRoot)
  }
  try {
    await rename(stagingRoot, roots.workspaceRoot)
    try {
      await assertActivatedTarget(roots)
    } catch (error) {
      await rename(roots.workspaceRoot, stagingRoot)
      if (backupRoot !== undefined) {
        await rename(backupRoot, roots.workspaceRoot)
      }
      throw error
    }
  } catch (error) {
    if (backupRoot !== undefined && !(await pathExists(roots.workspaceRoot))) {
      await rename(backupRoot, roots.workspaceRoot)
    }
    throw error
  }
  if (backupRoot !== undefined) {
    await rm(backupRoot, { recursive: true })
  }
  return {
    action: 'activated',
    workspaceRoot: roots.workspaceRoot,
    head,
  }
}

async function prepareRoots(input: DogfoodRoots): Promise<PreparedRoots> {
  const fixtureRoot = await canonicalExistingDirectory(
    input.fixtureRoot,
    'Fixture root',
  )
  const workspace = await canonicalTarget(
    input.workspaceRoot,
    'Workspace root',
  )
  assertRootsDoNotOverlap([
    ['fixture root', fixtureRoot],
    ['workspace root', workspace.root],
  ])
  const fixtureTree = await readTree(fixtureRoot)
  if (fixtureTree.size === 0) {
    throw new Error('Fixture root must contain at least one regular file.')
  }
  for (const relativePath of fixtureTree.keys()) {
    if (
      relativePath
        .split('/')
        .some((segment) => segment.toLowerCase() === '.git')
    ) {
      throw new Error(
        `Fixture path contains reserved Git metadata: ${relativePath}`,
      )
    }
  }
  return {
    fixtureRoot,
    workspaceRoot: workspace.root,
    workspaceExists: workspace.exists,
    fixtureTree,
  }
}

async function inspectReplaceableTarget(
  roots: PreparedRoots,
): Promise<{ readonly fingerprint: string }> {
  if (!roots.workspaceExists) return { fingerprint: 'missing' }

  const dotGit = await lstat(
    path.join(roots.workspaceRoot, '.git'),
  ).catch(() => undefined)
  if (dotGit === undefined) {
    const tree = await readTree(roots.workspaceRoot)
    if (!treeEquals(tree, roots.fixtureTree)) {
      throw new Error(
        'Unprepared dogfood target differs from the fixture; original bytes were preserved.',
      )
    }
    return { fingerprint: `raw:${fingerprintTree(tree)}` }
  }
  if (!dotGit.isDirectory() || dotGit.isSymbolicLink()) {
    throw new Error('Dogfood target must use non-symlink Git metadata.')
  }

  await assertExactCleanLocalGitRoot(roots.workspaceRoot)
  const [markedFixture, markedWorkspace, head] = await Promise.all([
    gitConfig(roots.workspaceRoot, fixtureMarker),
    gitConfig(roots.workspaceRoot, workspaceMarker),
    gitOutput(roots.workspaceRoot, ['rev-parse', 'HEAD']),
  ])
  if (
    markedFixture !== roots.fixtureRoot ||
    markedWorkspace !== roots.workspaceRoot
  ) {
    throw new Error(
      'Dogfood target lacks the exact local E2E ownership markers; original bytes were preserved.',
    )
  }
  return {
    fingerprint: `git:${head}`,
  }
}

async function assertPreparedStaging(
  stagingRoot: string,
  fixtureTree: Tree,
): Promise<string> {
  const dotGit = await lstat(path.join(stagingRoot, '.git')).catch(
    () => undefined,
  )
  if (
    dotGit === undefined ||
    !dotGit.isDirectory() ||
    dotGit.isSymbolicLink()
  ) {
    throw new Error(
      'Staging root must be prepared by semester-workspace-init before activation.',
    )
  }
  await assertExactCleanLocalGitRoot(stagingRoot)
  const stagedTree = await readTree(stagingRoot, { skipRootGit: true })
  for (const [relativePath, expected] of fixtureTree) {
    const actual = stagedTree.get(relativePath)
    if (
      actual === undefined ||
      !Buffer.from(actual).equals(Buffer.from(expected))
    ) {
      throw new Error(
        `Prepared staging changed fixture material: ${relativePath}`,
      )
    }
  }
  return gitOutput(stagingRoot, ['rev-parse', 'HEAD'])
}

async function assertActivatedTarget(roots: PreparedRoots): Promise<void> {
  await assertExactCleanLocalGitRoot(roots.workspaceRoot)
  const [markedFixture, markedWorkspace] = await Promise.all([
    gitConfig(roots.workspaceRoot, fixtureMarker),
    gitConfig(roots.workspaceRoot, workspaceMarker),
  ])
  if (
    markedFixture !== roots.fixtureRoot ||
    markedWorkspace !== roots.workspaceRoot
  ) {
    throw new Error('Activated dogfood target lost its ownership markers.')
  }
}

async function assertExactCleanLocalGitRoot(root: string): Promise<void> {
  const gitRoot = await realpath(
    await gitOutput(root, ['rev-parse', '--show-toplevel']),
  ).catch(() => undefined)
  if (gitRoot !== root) {
    throw new Error('Dogfood target must be the exact Git root.')
  }
  const [status, remotes] = await Promise.all([
    gitOutput(root, [
      'status',
      '--porcelain=v1',
      '--untracked-files=all',
      '--ignored=matching',
    ]),
    gitOutput(root, ['remote']),
  ])
  if (status.length > 0) {
    throw new Error(
      'Dogfood target contains staged, unstaged, untracked, or ignored files.',
    )
  }
  if (remotes.length > 0) {
    throw new Error('Dogfood target with a Git remote is not replaceable.')
  }
}

async function gitConfig(root: string, key: string): Promise<string | undefined> {
  const value = await gitOutput(root, [
    'config',
    '--local',
    '--get',
    '--default',
    '',
    key,
  ])
  return value.length > 0 ? value : undefined
}

async function unsetGitConfig(root: string, key: string): Promise<void> {
  await execFileAsync('git', ['config', '--local', '--unset-all', key], {
    cwd: root,
    encoding: 'utf8',
  }).catch((error: unknown) => {
    const failure = error as Error & { readonly code?: number }
    if (failure.code !== 5) {
      throw error
    }
  })
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

async function canonicalTarget(
  input: string,
  label: string,
): Promise<{ readonly root: string; readonly exists: boolean }> {
  assertCanonicalAbsolutePath(input, label)
  if (await pathExists(input)) {
    return {
      root: await canonicalExistingDirectory(input, label),
      exists: true,
    }
  }
  const parent = path.dirname(input)
  if (await canonicalExistingDirectory(parent, `${label} parent`) !== parent) {
    throw new Error(`${label} parent must be canonical.`)
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

function assertConfirmation(confirmReplace: string, workspaceRoot: string): void {
  if (confirmReplace !== workspaceRoot) {
    throw new Error(
      '--confirm-replace must exactly equal the canonical workspace root.',
    )
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

async function readTree(
  root: string,
  options: { readonly skipRootGit?: boolean } = {},
): Promise<Tree> {
  const result = new Map<string, Uint8Array>()
  await walkTree(root, '', result, options)
  return new Map([...result].sort(([left], [right]) => comparePaths(left, right)))
}

async function walkTree(
  root: string,
  relative: string,
  result: Map<string, Uint8Array>,
  options: { readonly skipRootGit?: boolean },
): Promise<void> {
  const entries = (await readdir(path.join(root, relative), {
    withFileTypes: true,
  })).sort((left, right) => comparePaths(left.name, right.name))
  for (const entry of entries) {
    if (
      options.skipRootGit === true &&
      relative === '' &&
      entry.name === '.git'
    ) {
      continue
    }
    const child = path.join(relative, entry.name)
    const absolute = path.join(root, child)
    const metadata = await lstat(absolute)
    if (metadata.isSymbolicLink()) {
      throw new Error(`Unsafe symlink in tree: ${toPosixPath(child)}`)
    }
    if (metadata.isDirectory()) {
      await walkTree(root, child, result, options)
      continue
    }
    if (!metadata.isFile()) {
      throw new Error(`Unsafe non-file entry in tree: ${toPosixPath(child)}`)
    }
    result.set(toPosixPath(child), await readFile(absolute))
  }
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
    if (
      rightBytes === undefined ||
      !Buffer.from(leftBytes).equals(Buffer.from(rightBytes))
    ) {
      return false
    }
  }
  return true
}

function fingerprintTree(tree: Tree): string {
  const digest = createHash('sha256')
  for (const [relativePath, bytes] of tree) {
    digest.update(relativePath)
    digest.update('\0')
    digest.update(bytes)
    digest.update('\0')
  }
  return digest.digest('hex')
}

async function gitOutput(
  root: string,
  arguments_: readonly string[],
): Promise<string> {
  try {
    const result = await execFileAsync('git', arguments_, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    })
    return result.stdout.trim()
  } catch (error) {
    const failure = error as Error & {
      readonly stderr?: string
    }
    throw new Error(
      `Git command failed: git ${arguments_.join(' ')}\n${failure.stderr ?? failure.message}`,
    )
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

function comparePaths(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

function parseArguments(arguments_: readonly string[]) {
  const { positionals, values } = parseArgs({
    args: [...arguments_],
    allowPositionals: true,
    strict: true,
    options: {
      'fixture-root': { type: 'string' },
      'workspace-root': { type: 'string' },
      'confirm-replace': { type: 'string' },
      'staging-root': { type: 'string' },
      'expected-target-fingerprint': { type: 'string' },
      'expected-staging-head': { type: 'string' },
      'expected-head': { type: 'string' },
    },
  })
  const command = positionals[0]
  if (
    command !== 'stage' &&
    command !== 'adopt' &&
    command !== 'activate'
  ) {
    throw usage()
  }
  const fixtureRoot = values['fixture-root']
  const workspaceRoot = values['workspace-root']
  const confirmReplace = values['confirm-replace']
  const stagingRoot = values['staging-root']
  const expectedTargetFingerprint = values['expected-target-fingerprint']
  const expectedStagingHead = values['expected-staging-head']
  const expectedHead = values['expected-head']
  if (
    positionals.length !== 1 ||
    fixtureRoot === undefined ||
    workspaceRoot === undefined ||
    confirmReplace === undefined ||
    (command === 'stage' &&
      (stagingRoot !== undefined ||
        expectedTargetFingerprint !== undefined ||
        expectedStagingHead !== undefined ||
        expectedHead !== undefined)) ||
    (command === 'adopt' &&
      (expectedHead === undefined ||
        stagingRoot !== undefined ||
        expectedTargetFingerprint !== undefined ||
        expectedStagingHead !== undefined)) ||
    (command === 'activate' &&
      (stagingRoot === undefined ||
        expectedTargetFingerprint === undefined ||
        expectedStagingHead === undefined ||
        expectedHead !== undefined))
  ) {
    throw usage()
  }
  return {
    command,
    fixtureRoot,
    workspaceRoot,
    confirmReplace,
    stagingRoot,
    expectedTargetFingerprint,
    expectedStagingHead,
    expectedHead,
  }
}

function usage(): Error {
  return new Error(
    'Usage: reconcile-dogfood-workspace.mts stage --fixture-root <absolute-path> --workspace-root <absolute-path> --confirm-replace <exact-workspace-root> | adopt with the same roots plus --expected-head <value> | activate with the same roots plus --staging-root <absolute-path> --expected-target-fingerprint <value> --expected-staging-head <value>',
  )
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2))
  const output = arguments_.command === 'stage'
    ? await stageDogfoodWorkspace(arguments_)
    : arguments_.command === 'adopt'
      ? await adoptDogfoodWorkspace({
          ...arguments_,
          expectedHead: arguments_.expectedHead ?? '',
        })
      : await activateDogfoodWorkspace({
        ...arguments_,
        stagingRoot: arguments_.stagingRoot ?? '',
        expectedTargetFingerprint:
          arguments_.expectedTargetFingerprint ?? '',
        expectedStagingHead: arguments_.expectedStagingHead ?? '',
      })
  console.log(JSON.stringify(output, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
