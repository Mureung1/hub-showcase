import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import {
  access,
  constants,
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual, promisify } from 'node:util'

import { parse as parseToml } from 'smol-toml'
import { parse as parseYaml } from 'yaml'

import {
  classifySemesterWorkspaceRootStateBytes,
  createInitialSemesterWorkspaceStateV4,
  encodeSemesterWorkspaceStateV4,
} from '../../../../packages/semester-workspace/src/v4-codec.js'

const execFileAsync = promisify(execFile)
const hubRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const defaultBuiltInSkillCatalogRoot = path.join(hubRoot, 'skills')
const adapterPath = path.join(
  hubRoot,
  'packages/interaction-mcp/dist/stdio.js',
)
const managedConfigStart = '# BEGIN AY-PLE managed Interaction MCP'
const managedConfigEnd = '# END AY-PLE managed Interaction MCP'
const scaffoldCommitMessage = 'chore: initialize semester workspace'
const minimalAgents = `# SemesterWorkspace

This repository contains one semester and its actual working files.

- Work in the actual files in this repository.
- Create frequent, meaningful Git commits for completed work.
- Do not treat unrelated dirty or untracked files as a blocker, and stage only
  the paths intended for each checkpoint.
`

type Arguments = {
  readonly target: string
  readonly yearLevel: number
  readonly termKey: string
  readonly termDisplayName: string
  readonly baselinePaths: readonly string[]
}

type Target = {
  readonly canonicalRoot: string
  readonly exists: boolean
}

type PlannedFile = {
  readonly relativePath: string
  readonly bytes: Uint8Array
}

type BuiltInSkillSource = {
  readonly name: string
  readonly sourceRoot: string
  readonly destinationRelativePath: string
}

type PlannedBuiltInSkill = BuiltInSkillSource & {
  readonly destinationRoot: string
  readonly install: boolean
}

export async function bootstrapSemesterWorkspace(
  input: Arguments,
  options: {
    readonly builtInSkillCatalogRoot?: string
  } = {},
): Promise<{
  readonly canonicalRoot: string
  readonly scaffoldCheckpoint: 'created' | 'updated' | 'no-op'
  readonly baselineCheckpoint: 'created' | 'no-op' | 'not-requested'
}> {
  const target = await inspectTarget(input.target)
  const builtInSkills = await discoverBuiltInSkillCatalog(
    options.builtInSkillCatalogRoot ?? defaultBuiltInSkillCatalogRoot,
  )
  await assertBuiltAdapter()
  const gitMode = await inspectGit(target)
  await assertManagedDirectories(target)
  const plannedFiles = await planManagedFiles(target, input)
  const gitignore = await planGitignore(target, gitMode)
  const plannedBuiltInSkills = await planBuiltInSkillInstalls(
    target,
    builtInSkills,
  )
  const managedWrites = [
    ...plannedFiles.map((file) => file.relativePath),
    ...plannedBuiltInSkills
      .filter(({ install }) => install)
      .map(({ destinationRelativePath }) => destinationRelativePath),
    ...(gitignore === undefined ? [] : ['.gitignore']),
  ]
  await assertManagedWritePathsClean(
    target,
    gitMode,
    managedWrites,
  )

  if (!target.exists) await mkdir(target.canonicalRoot)
  if (gitMode === 'fresh') {
    await git(target.canonicalRoot, ['init', '--quiet'])
  }

  for (const file of plannedFiles) {
    const destination = path.join(target.canonicalRoot, file.relativePath)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, file.bytes)
  }
  for (const skill of plannedBuiltInSkills) {
    if (!skill.install) continue
    await mkdir(path.dirname(skill.destinationRoot), { recursive: true })
    await cp(skill.sourceRoot, skill.destinationRoot, {
      recursive: true,
      errorOnExist: true,
      force: false,
    })
  }
  if (gitignore !== undefined) {
    await writeFile(path.join(target.canonicalRoot, '.gitignore'), gitignore)
  }

  const changed = await changedPaths(target.canonicalRoot, managedWrites)
  let scaffoldCheckpoint: 'created' | 'updated' | 'no-op' = 'no-op'
  if (changed.length > 0) {
    await commitPaths(target.canonicalRoot, changed, scaffoldCommitMessage)
    scaffoldCheckpoint = gitMode === 'fresh' ? 'created' : 'updated'
  }
  const baselineCreated =
    input.baselinePaths.length > 0
      ? await commitBaseline(target.canonicalRoot, input.baselinePaths)
      : undefined

  return {
    canonicalRoot: await realpath(target.canonicalRoot),
    scaffoldCheckpoint,
    baselineCheckpoint:
      baselineCreated === undefined
        ? 'not-requested'
        : baselineCreated
          ? 'created'
          : 'no-op',
  }
}

async function assertManagedWritePathsClean(
  target: Target,
  gitMode: 'fresh' | 'existing',
  managedWrites: readonly string[],
): Promise<void> {
  if (gitMode === 'fresh') return
  for (const relativePath of managedWrites) {
    if ((await gitPathStatus(target.canonicalRoot, relativePath)).length > 0) {
      throw new Error(
        `Refusing to write because managed path has existing Git changes: ${relativePath}`,
      )
    }
  }
}

async function assertManagedDirectories(target: Target): Promise<void> {
  if (!target.exists) return
  for (const relativePath of ['.agents', '.agents/skills', '.codex']) {
    const absolute = path.join(target.canonicalRoot, relativePath)
    if (!(await pathExists(absolute))) continue
    const metadata = await lstat(absolute)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(
        `Managed path ${relativePath} must be a non-symlink directory.`,
      )
    }
  }
}

async function inspectTarget(targetInput: string): Promise<Target> {
  if (!path.isAbsolute(targetInput)) {
    throw new Error('Target must be an explicit absolute path.')
  }
  const normalized = path.normalize(targetInput)
  if (normalized !== targetInput || path.basename(normalized) === path.sep) {
    throw new Error('Target must be a canonical absolute path.')
  }

  if (await pathExists(normalized)) {
    const targetStat = await lstat(normalized)
    if (!targetStat.isDirectory() || targetStat.isSymbolicLink()) {
      throw new Error('Target must be a non-symlink directory.')
    }
    const canonicalRoot = await realpath(normalized)
    if (canonicalRoot !== normalized) {
      throw new Error('Target must not traverse a symlinked path.')
    }
    await access(canonicalRoot, constants.R_OK | constants.W_OK | constants.X_OK)
    return { canonicalRoot, exists: true }
  }

  const parent = path.dirname(normalized)
  const parentStat = await lstat(parent).catch(() => undefined)
  if (
    parentStat === undefined ||
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink()
  ) {
    throw new Error(
      'Only one missing target leaf below an existing directory is allowed.',
    )
  }
  const canonicalParent = await realpath(parent)
  if (canonicalParent !== parent) {
    throw new Error('Target parent must not traverse a symlinked path.')
  }
  await access(parent, constants.R_OK | constants.W_OK | constants.X_OK)
  return { canonicalRoot: normalized, exists: false }
}

async function inspectGit(target: Target): Promise<'fresh' | 'existing'> {
  if (!target.exists) {
    const inherited = await discoverGitTopLevel(path.dirname(target.canonicalRoot))
    if (inherited !== undefined) {
      throw new Error(
        `Target would be a descendant of foreign repository: ${inherited}`,
      )
    }
    return 'fresh'
  }

  const dotGit = path.join(target.canonicalRoot, '.git')
  if (await pathExists(dotGit)) {
    const gitStat = await lstat(dotGit)
    if (!gitStat.isDirectory() || gitStat.isSymbolicLink()) {
      throw new Error('Gitdir indirection and symlinked .git metadata are not allowed.')
    }
    const topLevel = await discoverGitTopLevel(target.canonicalRoot)
    if (topLevel !== target.canonicalRoot) {
      throw new Error('Target must be the exact root of its Git repository.')
    }
    return 'existing'
  }

  const inherited = await discoverGitTopLevel(target.canonicalRoot)
  if (inherited !== undefined) {
    throw new Error(
      `Target is a descendant of foreign repository: ${inherited}`,
    )
  }
  return 'fresh'
}

async function planManagedFiles(
  target: Target,
  input: Arguments,
): Promise<readonly PlannedFile[]> {
  const files: PlannedFile[] = []
  const statePath = path.join(target.canonicalRoot, 'workspace-state.json')
  if (await pathExists(statePath)) {
    await assertRegularFile(statePath, 'workspace-state.json')
    const bytes = await readFile(statePath)
    const classification = classifySemesterWorkspaceRootStateBytes(bytes)
    if (
      classification.status !== 'current_v4' ||
      classification.state.semester.yearLevel !== input.yearLevel ||
      classification.state.semester.term.key !== input.termKey ||
      classification.state.semester.term.displayName !== input.termDisplayName
    ) {
      throw new Error(
        describeStateConflict(bytes, classification, input),
      )
    }
  } else {
    const state = createInitialSemesterWorkspaceStateV4({
      workspaceId: `workspace_${randomBytes(16).toString('hex')}`,
      semester: {
        yearLevel: input.yearLevel,
        term: {
          key: input.termKey,
          displayName: input.termDisplayName,
        },
      },
    })
    files.push({
      relativePath: 'workspace-state.json',
      bytes: encodeSemesterWorkspaceStateV4(state),
    })
  }

  const agentsPath = path.join(target.canonicalRoot, 'AGENTS.md')
  if (!(await pathExists(agentsPath))) {
    files.push({
      relativePath: 'AGENTS.md',
      bytes: Buffer.from(minimalAgents, 'utf8'),
    })
  } else {
    await assertRegularFile(agentsPath, 'AGENTS.md')
  }

  const configPath = path.join(target.canonicalRoot, '.codex/config.toml')
  const desiredBlock = managedConfigBlock(target.canonicalRoot)
  if (!(await pathExists(configPath))) {
    files.push({
      relativePath: '.codex/config.toml',
      bytes: Buffer.from(`${desiredBlock}\n`, 'utf8'),
    })
  } else {
    await assertRegularFile(configPath, '.codex/config.toml')
    const current = decodeUtf8(
      await readFile(configPath),
      '.codex/config.toml is not valid UTF-8.',
    )
    const updated = updateManagedConfig(current, desiredBlock)
    if (updated !== current) {
      files.push({
        relativePath: '.codex/config.toml',
        bytes: Buffer.from(updated, 'utf8'),
      })
    }
  }

  return files
}

async function planBuiltInSkillInstalls(
  target: Target,
  skills: readonly BuiltInSkillSource[],
): Promise<readonly PlannedBuiltInSkill[]> {
  const planned: PlannedBuiltInSkill[] = []
  for (const skill of skills) {
    const destinationRoot = path.join(
      target.canonicalRoot,
      skill.destinationRelativePath,
    )
    if (!(await pathExists(destinationRoot))) {
      planned.push({ ...skill, destinationRoot, install: true })
      continue
    }

    const destinationStat = await lstat(destinationRoot)
    if (
      !destinationStat.isDirectory() ||
      destinationStat.isSymbolicLink()
    ) {
      throw new Error(
        `Built-in Skill ${skill.name} root must be a non-symlink directory.`,
      )
    }
    const difference = await firstTreeDifference(
      skill.sourceRoot,
      destinationRoot,
    )
    if (difference !== undefined) {
      const differenceOutput = await treeDifference(
        destinationRoot,
        skill.sourceRoot,
      )
      throw new Error(
        `Built-in Skill ${skill.name} conflict at ${difference}; workspace bytes were preserved.\n${differenceOutput}`,
      )
    }
    planned.push({ ...skill, destinationRoot, install: false })
  }
  return planned
}

function describeStateConflict(
  bytes: Uint8Array,
  classification: ReturnType<
    typeof classifySemesterWorkspaceRootStateBytes
  >,
  input: Arguments,
): string {
  const existing =
    classification.status === 'current_v4'
      ? JSON.stringify(
          {
            workspaceId: classification.state.workspaceId,
            semester: classification.state.semester,
          },
          null,
          2,
        )
      : `${classification.status}\n${renderBytes(bytes)}`
  const requested = JSON.stringify(
    {
      semester: {
        yearLevel: input.yearLevel,
        term: {
          key: input.termKey,
          displayName: input.termDisplayName,
        },
      },
    },
    null,
    2,
  )
  return `workspace-state.json conflicts with the requested v4 semester; original bytes were preserved.\n--- existing\n${existing}\n--- requested\n${requested}`
}

function renderBytes(bytes: Uint8Array): string {
  const maximumPreviewBytes = 4096
  const preview = bytes.subarray(0, maximumPreviewBytes)
  let rendered: string
  try {
    rendered = new TextDecoder('utf-8', { fatal: true }).decode(preview)
  } catch {
    rendered = `hex:${Buffer.from(preview).toString('hex')}`
  }
  return bytes.byteLength > maximumPreviewBytes
    ? `${rendered}\n... ${bytes.byteLength - maximumPreviewBytes} more bytes`
    : rendered
}

function parseProjectToml(source: string): Readonly<Record<string, unknown>> {
  try {
    return parseToml(source)
  } catch (error) {
    throw new Error(
      `.codex/config.toml is unsafe or malformed; original bytes were preserved. ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

async function planGitignore(
  target: Target,
  gitMode: 'fresh' | 'existing',
): Promise<Uint8Array | undefined> {
  if (gitMode === 'existing') return undefined
  const ignorePath = path.join(target.canonicalRoot, '.gitignore')
  if (!(await pathExists(ignorePath))) {
    return Buffer.from('/.ay-ple/\n', 'utf8')
  }
  await assertRegularFile(ignorePath, '.gitignore')
  const current = decodeUtf8(
    await readFile(ignorePath),
    '.gitignore is not valid UTF-8.',
  )
  const lines = current.split(/\r?\n/)
  if (lines.includes('/.ay-ple/')) return undefined
  return Buffer.from(
    `${current}${current.endsWith('\n') || current.length === 0 ? '' : '\n'}/.ay-ple/\n`,
    'utf8',
  )
}

function managedConfigBlock(workspaceRoot: string): string {
  const command = path.relative(workspaceRoot, adapterPath).split(path.sep).join('/')
  return `${managedConfigStart}
[mcp_servers.ay_ple_interaction]
command = ${JSON.stringify(command)}
env_vars = [
  "AY_PLE_INTERACTION_BROKER_URL",
  "AY_PLE_INTERACTION_BROKER_TOKEN",
  "AY_PLE_INTERACTION_RUNTIME_BINDING"
]
enabled_tools = ["propose_state_patch"]
required = true
${managedConfigEnd}`
}

function updateManagedConfig(current: string, desiredBlock: string): string {
  withTomlConflictContext(
    () => assertSafeTomlSurface(current),
    current,
    desiredBlock,
  )
  const currentConfig = withTomlConflictContext(
    () => parseProjectToml(current),
    current,
    desiredBlock,
  )
  const desiredConfig = parseProjectToml(desiredBlock)
  const currentServer = interactionServer(currentConfig)
  const desiredServer = interactionServer(desiredConfig)
  const start = current.indexOf(managedConfigStart)
  const end = current.indexOf(managedConfigEnd)
  if (start === -1 && end === -1) {
    if (currentServer !== undefined) {
      throw tomlConflict(
        'Unmanaged ay_ple_interaction TOML table conflicts with the required declaration.',
        JSON.stringify(currentServer, null, 2),
        desiredBlock,
      )
    }
    const updated = `${current}${current.length === 0 || current.endsWith('\n') ? '' : '\n'}${current.length === 0 ? '' : '\n'}${desiredBlock}\n`
    parseProjectToml(updated)
    return updated
  }
  if (start === -1 || end === -1 || end < start) {
    throw tomlConflict(
      'Unsafe or incomplete AY-PLE managed TOML markers.',
      current,
      desiredBlock,
    )
  }
  const endAfterMarker = end + managedConfigEnd.length
  const currentBlock = current.slice(start, endAfterMarker)
  if (
    currentServer === undefined ||
    desiredServer === undefined ||
    !managedServerMatchesExceptCommand(currentServer, desiredServer)
  ) {
    throw tomlConflict(
      'Managed MCP declaration differs from the required shape.',
      currentBlock,
      desiredBlock,
    )
  }
  if (currentBlock === desiredBlock) return current
  if (normalizeManagedCommand(currentBlock) === normalizeManagedCommand(desiredBlock)) {
    const updated = `${current.slice(0, start)}${desiredBlock}${current.slice(endAfterMarker)}`
    parseProjectToml(updated)
    return updated
  }
  throw tomlConflict(
    'Managed MCP declaration differs from the required bytes.',
    currentBlock,
    desiredBlock,
  )
}

function withTomlConflictContext<T>(
  operation: () => T,
  current: string,
  desiredBlock: string,
): T {
  try {
    return operation()
  } catch (error) {
    throw tomlConflict(
      error instanceof Error ? error.message : String(error),
      current,
      desiredBlock,
    )
  }
}

function tomlConflict(
  reason: string,
  existing: string,
  required: string,
): Error {
  return new Error(
    `${reason}\n--- existing\n${boundedConflictText(existing)}\n--- required\n${required}`,
  )
}

function boundedConflictText(value: string): string {
  const maximumCharacters = 16 * 1024
  return value.length > maximumCharacters
    ? `${value.slice(0, maximumCharacters)}\n... ${value.length - maximumCharacters} more characters`
    : value
}

function interactionServer(
  config: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | undefined {
  const servers = config.mcp_servers
  if (
    typeof servers !== 'object' ||
    servers === null ||
    Array.isArray(servers)
  ) {
    return undefined
  }
  const server = (servers as Readonly<Record<string, unknown>>)
    .ay_ple_interaction
  return typeof server === 'object' &&
    server !== null &&
    !Array.isArray(server)
    ? (server as Readonly<Record<string, unknown>>)
    : undefined
}

function managedServerMatchesExceptCommand(
  current: Readonly<Record<string, unknown>>,
  desired: Readonly<Record<string, unknown>>,
): boolean {
  return isDeepStrictEqual(
    { ...current, command: '<root-relative-command>' },
    { ...desired, command: '<root-relative-command>' },
  )
}

function normalizeManagedCommand(block: string): string {
  return block.replace(/^command = ".*"$/m, 'command = "<root-relative-command>"')
}

function assertSafeTomlSurface(source: string): void {
  if (source.includes('\u0000')) throw new Error('Unsafe TOML contains NUL.')
  const starts = source.split(managedConfigStart).length - 1
  const ends = source.split(managedConfigEnd).length - 1
  if (starts > 1 || ends > 1) {
    throw new Error('Unsafe TOML contains duplicate AY-PLE managed markers.')
  }
  const interactionTables = (
    source.match(/^\s*\[mcp_servers\.ay_ple_interaction\]\s*$/gm) ?? []
  ).length
  if (interactionTables > 1) {
    throw new Error('Unsafe TOML contains duplicate ay_ple_interaction tables.')
  }
}

async function assertBuiltAdapter(): Promise<void> {
  const adapter = await stat(adapterPath).catch(() => undefined)
  if (adapter === undefined || !adapter.isFile()) {
    throw new Error(
      'Built Interaction MCP is missing. Run npm run build -w @ay-ple/interaction-mcp first.',
    )
  }
}

async function discoverBuiltInSkillCatalog(
  catalogRoot: string,
): Promise<readonly BuiltInSkillSource[]> {
  const catalogStat = await lstat(catalogRoot).catch(() => undefined)
  if (
    catalogStat === undefined ||
    !catalogStat.isDirectory() ||
    catalogStat.isSymbolicLink()
  ) {
    throw new Error(
      'Built-in Skill catalog must be a non-symlink directory.',
    )
  }

  const entries = (await readdir(catalogRoot, { withFileTypes: true }))
    .sort((left, right) => comparePathNames(left.name, right.name))
  const skills: BuiltInSkillSource[] = []
  for (const entry of entries) {
    const sourceRoot = path.join(catalogRoot, entry.name)
    const sourceStat = await lstat(sourceRoot)
    if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
      throw new Error(
        `Built-in Skill catalog entry ${entry.name} must be a non-symlink directory.`,
      )
    }
    if (
      !entry.name.startsWith('ay-ple-') ||
      entry.name.length === 'ay-ple-'.length
    ) {
      throw new Error(
        `Built-in Skill directory ${entry.name} must use the reserved ay-ple-* namespace.`,
      )
    }

    const descriptorPath = path.join(sourceRoot, 'SKILL.md')
    const descriptorStat = await lstat(descriptorPath).catch(() => undefined)
    if (
      descriptorStat === undefined ||
      !descriptorStat.isFile() ||
      descriptorStat.isSymbolicLink()
    ) {
      throw new Error(
        `Built-in Skill ${entry.name} root SKILL.md must be a non-symlink regular file.`,
      )
    }
    const descriptor = decodeUtf8(
      await readFile(descriptorPath),
      `Built-in Skill ${entry.name} root SKILL.md must be valid UTF-8.`,
    )
    const metadata = parseSkillFrontmatter(entry.name, descriptor)
    if (metadata.name !== entry.name) {
      throw new Error(
        `Built-in Skill ${entry.name} frontmatter name must match its directory name.`,
      )
    }
    await assertSafeSkillTree(sourceRoot, entry.name)
    skills.push({
      name: entry.name,
      sourceRoot,
      destinationRelativePath: `.agents/skills/${entry.name}`,
    })
  }
  return skills
}

function parseSkillFrontmatter(
  skillName: string,
  source: string,
): { readonly name: string; readonly description: string } {
  const match = source.match(
    /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u,
  )
  if (!match) {
    throw new Error(
      `Built-in Skill ${skillName} root SKILL.md must contain YAML frontmatter.`,
    )
  }
  let metadata: unknown
  try {
    metadata = parseYaml(match[1])
  } catch {
    throw new Error(
      `Built-in Skill ${skillName} frontmatter must be valid YAML.`,
    )
  }
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    Array.isArray(metadata) ||
    typeof (metadata as Record<string, unknown>).name !== 'string' ||
    (metadata as Record<string, string>).name.trim().length === 0 ||
    typeof (metadata as Record<string, unknown>).description !== 'string' ||
    (metadata as Record<string, string>).description.trim().length === 0
  ) {
    throw new Error(
      `Built-in Skill ${skillName} frontmatter requires non-empty name and description strings.`,
    )
  }
  return {
    name: (metadata as Record<string, string>).name,
    description: (metadata as Record<string, string>).description,
  }
}

async function assertSafeSkillTree(
  root: string,
  skillName: string,
  relative = '',
): Promise<void> {
  const entries = (
    await readdir(path.join(root, relative), { withFileTypes: true })
  ).sort((left, right) => comparePathNames(left.name, right.name))
  for (const entry of entries) {
    const child = path.join(relative, entry.name)
    const entryPath = path.join(root, child)
    const entryStat = await lstat(entryPath)
    if (entryStat.isSymbolicLink()) {
      throw new Error(
        `Built-in Skill ${skillName} contains symlink: ${toPosixPath(child)}`,
      )
    }
    if (entryStat.isDirectory()) {
      await assertSafeSkillTree(root, skillName, child)
    } else if (!entryStat.isFile()) {
      throw new Error(
        `Built-in Skill ${skillName} contains unsafe entry: ${toPosixPath(child)}`,
      )
    }
  }
}

function comparePathNames(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join('/')
}

async function firstTreeDifference(
  source: string,
  destination: string,
  relative = '',
): Promise<string | undefined> {
  const sourceEntries = await readdir(path.join(source, relative), {
    withFileTypes: true,
  })
  const destinationEntries = await readdir(path.join(destination, relative), {
    withFileTypes: true,
  }).catch(() => [])
  const names = new Set([
    ...sourceEntries.map((entry) => entry.name),
    ...destinationEntries.map((entry) => entry.name),
  ])
  for (const name of [...names].sort()) {
    const sourceEntry = sourceEntries.find((entry) => entry.name === name)
    const destinationEntry = destinationEntries.find(
      (entry) => entry.name === name,
    )
    const child = path.posix.join(relative.split(path.sep).join('/'), name)
    if (
      sourceEntry === undefined ||
      destinationEntry === undefined ||
      sourceEntry.isDirectory() !== destinationEntry.isDirectory() ||
      sourceEntry.isFile() !== destinationEntry.isFile() ||
      sourceEntry.isSymbolicLink() ||
      destinationEntry.isSymbolicLink()
    ) {
      return child
    }
    if (sourceEntry.isDirectory()) {
      const nested = await firstTreeDifference(source, destination, path.join(relative, name))
      if (nested !== undefined) return nested
      continue
    }
    const [sourceBytes, destinationBytes] = await Promise.all([
      readFile(path.join(source, relative, name)),
      readFile(path.join(destination, relative, name)),
    ])
    if (!sourceBytes.equals(destinationBytes)) return child
  }
  return undefined
}

async function treeDifference(
  existing: string,
  required: string,
): Promise<string> {
  const result = await git(
    hubRoot,
    ['diff', '--no-index', '--no-ext-diff', '--', existing, required],
    { allowFailure: true },
  )
  const output = result.stdout.trim()
  return output.length > 0
    ? output.slice(0, 64 * 1024)
    : 'No textual diff is available; inspect the conflicting entry type.'
}

async function commitPaths(
  root: string,
  relativePaths: readonly string[],
  message: string,
): Promise<void> {
  await git(root, ['add', '--', ...relativePaths])
  try {
    await git(root, ['commit', '--quiet', '--only', '-m', message, '--', ...relativePaths])
  } catch (error) {
    await git(root, ['reset', '--quiet', '--', ...relativePaths]).catch(() => undefined)
    throw error
  }
}

async function commitBaseline(
  root: string,
  relativePaths: readonly string[],
): Promise<boolean> {
  const unique = [...new Set(relativePaths)]
  for (const relativePath of unique) {
    if (
      path.isAbsolute(relativePath) ||
      relativePath === '' ||
      relativePath.split(/[\\/]/).includes('..')
    ) {
      throw new Error(`Baseline path must stay workspace-relative: ${relativePath}`)
    }
    if (isCredentialPath(relativePath)) {
      throw new Error(
        `Refusing to baseline a credential-like path: ${relativePath}`,
      )
    }
    const absolute = path.join(root, relativePath)
    await assertRegularFile(absolute, `baseline ${relativePath}`)
    const ignored = await git(root, ['check-ignore', '--quiet', '--', relativePath], {
      allowFailure: true,
    })
    if (ignored.exitCode === 0) {
      throw new Error(`Refusing to baseline ignored path: ${relativePath}`)
    }
  }
  const changed = await changedPaths(root, unique)
  if (changed.length > 0) {
    await commitPaths(root, changed, 'chore: baseline semester materials')
    return true
  }
  return false
}

function isCredentialPath(relativePath: string): boolean {
  const segments = relativePath
    .split(/[\\/]/)
    .map((segment) => segment.toLowerCase())
  const basename = segments.at(-1) ?? ''
  const credentialStem = basename.replace(/\.[^.]+$/, '')
  return (
    segments.some((segment) =>
      ['.aws', '.gnupg', '.kube', '.ssh'].includes(segment),
    ) ||
    basename === '.env' ||
    basename.startsWith('.env.') ||
    ['.netrc', '.npmrc', '.pypirc'].includes(basename) ||
    /^(?:auth|credentials?|secrets?|service[-_]?account|tokens?)(?:[-_.].*)?$/.test(
      credentialStem,
    ) ||
    ['id_ed25519', 'id_rsa'].includes(basename) ||
    ['.key', '.p12', '.pem', '.pfx'].some((suffix) =>
      basename.endsWith(suffix),
    )
  )
}

async function changedPaths(
  root: string,
  relativePaths: readonly string[],
): Promise<readonly string[]> {
  const changed: string[] = []
  for (const relativePath of relativePaths) {
    if ((await gitPathStatus(root, relativePath)).length > 0) {
      changed.push(relativePath)
    }
  }
  return changed
}

async function gitPathStatus(
  root: string,
  relativePath: string,
): Promise<string> {
  const result = await git(root, [
    'status',
    '--porcelain=v1',
    '--untracked-files=all',
    '--',
    relativePath,
  ])
  return result.stdout.trim()
}

async function discoverGitTopLevel(cwd: string): Promise<string | undefined> {
  const result = await git(cwd, ['rev-parse', '--show-toplevel'], {
    allowFailure: true,
  })
  if (result.exitCode !== 0) return undefined
  return realpath(result.stdout.trim())
}

async function git(
  cwd: string,
  arguments_: readonly string[],
  options: { readonly allowFailure?: boolean } = {},
): Promise<{ readonly stdout: string; readonly stderr: string; readonly exitCode: number }> {
  try {
    const result = await execFileAsync('git', arguments_, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
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

async function assertRegularFile(filePath: string, label: string): Promise<void> {
  const fileStat = await lstat(filePath)
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`${label} must be a non-symlink regular file.`)
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

function decodeUtf8(bytes: Uint8Array, message: string): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Error(message)
  }
}

function parseArguments(arguments_: readonly string[]): Arguments {
  let target: string | undefined
  let yearLevel: number | undefined
  let termKey: string | undefined
  let termDisplayName: string | undefined
  const baselinePaths: string[] = []
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]
    const value = arguments_[index + 1]
    if (value === undefined) throw usage()
    switch (argument) {
      case '--target':
        if (target !== undefined) throw usage()
        target = value
        break
      case '--year-level':
        if (yearLevel !== undefined) throw usage()
        yearLevel = Number(value)
        break
      case '--term-key':
        if (termKey !== undefined) throw usage()
        termKey = value
        break
      case '--term-display-name':
        if (termDisplayName !== undefined) throw usage()
        termDisplayName = value
        break
      case '--baseline':
        baselinePaths.push(value)
        break
      default:
        throw usage()
    }
    index += 1
  }
  if (
    target === undefined ||
    yearLevel === undefined ||
    termKey === undefined ||
    termDisplayName === undefined
  ) {
    throw usage()
  }
  return { target, yearLevel, termKey, termDisplayName, baselinePaths }
}

function usage(): Error {
  return new Error(
    'Usage: bootstrap.mts --target <absolute-path> --year-level <1-20> --term-key <slug> --term-display-name <name> [--baseline <relative-path>]...',
  )
}

async function main(): Promise<void> {
  const result = await bootstrapSemesterWorkspace(
    parseArguments(process.argv.slice(2)),
  )
  console.log(`Prepared SemesterWorkspace: ${result.canonicalRoot}`)
  console.log(`Scaffold checkpoint: ${result.scaffoldCheckpoint}`)
  console.log(`Material baseline: ${result.baselineCheckpoint}`)
  console.log(
    `Launch AY-PLE: npm run dev -- --workspace ${JSON.stringify(result.canonicalRoot)}`,
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
