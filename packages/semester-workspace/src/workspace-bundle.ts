/// <reference types="node" />

import { createHash } from 'node:crypto'
import { constants as fsConstants } from 'node:fs'
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
} from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  decodeWorkspaceBundleDescriptor,
  type AdmittedSemesterWorkspace,
  type VerifiedBundleFile,
  type VerifiedBundleSource,
  type WorkspaceBundleDescriptor,
  type WorkspaceBundleEntryDescriptor,
  type WorkspaceBundleRootDescriptor,
} from './contract.js'

const declaredSkillRoot =
  '.agents/skills/ay-ple-first-assignment'
const declaredSkillPath = `${declaredSkillRoot}/SKILL.md`
const declaredWorkspacePaths = [declaredSkillPath, 'AGENTS.md'] as const
const declaredResourceDirectories = [
  '.agents',
  '.agents/skills',
  declaredSkillRoot,
] as const
const canonicalResourceRoot = new URL(
  '../resources/workspace/',
  import.meta.url,
)
const bundleFileMode = 0o644
const bundleDirectoryMode = 0o700

const workspaceBundleDescriptor: WorkspaceBundleDescriptor = {
  schemaVersion: 1,
  bundleId: 'ay-ple.workspace-bundle.v1',
  roots: [
    {
      kind: 'instructions',
      root: 'AGENTS.md',
      skillName: null,
      entries: [
        {
          relativePath: 'AGENTS.md',
          type: 'file',
          mode: '0644',
          bytes: 917,
          sha256:
            'f1649609dbcad300001fba1fb4170b30a92a0def63f3d815550aa895b17afdfc',
        },
      ],
      completeTreeSha256:
        'ff612defcbdce14bccb1a55de98cc4e91d33be721e65aa55565e042fa0b6886b',
    },
    {
      kind: 'skill',
      root: declaredSkillRoot,
      skillName: 'ay-ple-first-assignment',
      entries: [
        {
          relativePath: 'SKILL.md',
          type: 'file',
          mode: '0644',
          bytes: 2307,
          sha256:
            '91f9e683a0ae629b49b16ea2ef88a4895e763d10df911cbd16bc866ce61b3721',
        },
      ],
      completeTreeSha256:
        '22f6e2faa0f3256fd363291d573fa506cbd2e3e43475d16874bc75f1641fdc99',
    },
  ],
  completeTreeSha256:
    '39c493509629055d085dcda88642ee6a4ac4286648c511781487d4ce521d8c29',
}

const workspaceBundleDescriptorSha256 =
  '57c51240a28aa7bc0c261cdb230ad252f2359e19bf9855c481938cca9231d757'

export type WorkspaceBundleConflictReason =
  | 'extra'
  | 'link'
  | 'mode'
  | 'modified'
  | 'symlink'
  | 'type'
  | 'unavailable'

export type WorkspaceBundleConflict = {
  readonly relativePath: string
  readonly reason: WorkspaceBundleConflictReason
}

export type WorkspaceBundleVerification =
  | {
      readonly status: 'verified'
      readonly descriptorSha256: string
      readonly completeTreeSha256: string
    }
  | {
      readonly status: 'missing'
      readonly missing: readonly string[]
    }
  | {
      readonly status: 'manual_recovery_required'
      readonly conflicts: readonly WorkspaceBundleConflict[]
    }
  | { readonly status: 'source_invalid' }
  | { readonly status: 'unavailable' }

export type WorkspaceBundleMutationResult =
  WorkspaceBundleVerification & {
    readonly written?: readonly string[]
  }

export class WorkspaceBundleSourceError extends Error {
  readonly code = 'workspace_bundle_source_invalid'

  constructor() {
    super('The canonical workspace bundle source is invalid.')
    this.name = 'WorkspaceBundleSourceError'
  }
}

export async function captureCanonicalWorkspaceBundleSource(
): Promise<VerifiedBundleSource> {
  return captureWorkspaceBundleSourceAt(canonicalResourceRoot)
}

export async function captureWorkspaceBundleSourceAt(
  resourceRoot: string | URL,
): Promise<VerifiedBundleSource> {
  try {
    const canonicalRoot = await canonicalDirectory(resourceRoot)
    const tree = await readResourceTree(canonicalRoot)
    const actualDirectories = tree
      .filter(({ type }) => type === 'directory')
      .map(({ relativePath }) => relativePath)
    const actualFiles = tree
      .filter(({ type }) => type === 'file')
      .map(({ relativePath }) => relativePath)
    if (
      !sameStrings(actualDirectories, declaredResourceDirectories) ||
      !sameStrings(actualFiles, declaredWorkspacePaths)
    ) {
      throw sourceInvalid()
    }

    const files = await Promise.all(
      declaredWorkspacePaths.map(async (relativePath) => {
        const descriptor = descriptorForWorkspacePath(relativePath)
        const bytes = await readExactRegularFile(
          path.join(canonicalRoot, relativePath),
          descriptor,
        )
        return {
          relativePath,
          mode: '0644',
          bytes: new Uint8Array(bytes),
          sha256: descriptor.sha256,
        } satisfies VerifiedBundleFile
      }),
    )
    verifyDescriptorDigests(workspaceBundleDescriptor)
    return freezeSnapshot({
      descriptor: cloneDescriptor(workspaceBundleDescriptor),
      descriptorSha256: workspaceBundleDescriptorSha256,
      completeTreeSha256:
        workspaceBundleDescriptor.completeTreeSha256,
      files,
    })
  } catch (error) {
    if (error instanceof WorkspaceBundleSourceError) throw error
    throw sourceInvalid()
  }
}

export async function verifyWorkspaceBundle(input: {
  readonly workspace: AdmittedSemesterWorkspace
  readonly source: VerifiedBundleSource
}): Promise<WorkspaceBundleVerification> {
  let snapshot: SnapshotFile[]
  try {
    snapshot = validateSnapshot(input.source)
  } catch {
    return { status: 'source_invalid' }
  }

  const root = await inspectWorkspaceRoot(input.workspace)
  if (root.status !== 'verified') return root

  const missing: string[] = []
  const conflicts: WorkspaceBundleConflict[] = []
  await inspectDeclaredFile({
    workspaceRoot: root.canonicalRoot,
    relativePath: 'AGENTS.md',
    expected: snapshotFile(snapshot, 'AGENTS.md'),
    missing,
    conflicts,
  })
  await inspectSkillTree({
    workspaceRoot: root.canonicalRoot,
    expected: snapshotFile(snapshot, declaredSkillPath),
    missing,
    conflicts,
  })

  if (conflicts.length > 0) {
    return {
      status: 'manual_recovery_required',
      conflicts: sortConflicts(conflicts),
    }
  }
  if (missing.length > 0) {
    return {
      status: 'missing',
      missing: [...new Set(missing)].sort(),
    }
  }
  return verifiedResult()
}

export async function materializeWorkspaceBundle(input: {
  readonly workspace: AdmittedSemesterWorkspace
  readonly source: VerifiedBundleSource
}): Promise<WorkspaceBundleMutationResult> {
  return writeMissingBundleFiles(input)
}

export async function recoverMissingWorkspaceBundle(input: {
  readonly workspace: AdmittedSemesterWorkspace
  readonly source: VerifiedBundleSource
}): Promise<WorkspaceBundleMutationResult> {
  return writeMissingBundleFiles(input)
}

async function writeMissingBundleFiles(input: {
  readonly workspace: AdmittedSemesterWorkspace
  readonly source: VerifiedBundleSource
}): Promise<WorkspaceBundleMutationResult> {
  let snapshot: SnapshotFile[]
  try {
    snapshot = validateSnapshot(input.source)
  } catch {
    return { status: 'source_invalid' }
  }
  const before = await verifyWorkspaceBundle(input)
  if (before.status !== 'missing') return before

  const written: string[] = []
  try {
    for (const relativePath of before.missing) {
      const file = snapshotFile(snapshot, relativePath)
      await ensureBundleParents(
        input.workspace.canonicalRoot,
        relativePath,
      )
      if (
        await writeAbsentFile(
          path.join(input.workspace.canonicalRoot, relativePath),
          file.bytes,
        )
      ) {
        written.push(relativePath)
      }
    }
  } catch {
    const afterFailure = await verifyWorkspaceBundle(input)
    if (afterFailure.status !== 'missing') {
      return { ...afterFailure, written }
    }
    return { status: 'unavailable', written }
  }

  const after = await verifyWorkspaceBundle(input)
  return { ...after, written }
}

type SnapshotFile = {
  readonly relativePath: string
  readonly mode: '0644'
  readonly bytes: Buffer
  readonly sha256: string
}

function validateSnapshot(source: VerifiedBundleSource): SnapshotFile[] {
  const descriptor = decodeWorkspaceBundleDescriptor(source.descriptor)
  verifyDescriptorDigests(descriptor)
  if (
    encodeDescriptor(descriptor) !==
      encodeDescriptor(workspaceBundleDescriptor) ||
    source.descriptorSha256 !== workspaceBundleDescriptorSha256 ||
    source.completeTreeSha256 !==
      workspaceBundleDescriptor.completeTreeSha256 ||
    source.files.length !== declaredWorkspacePaths.length
  ) {
    throw sourceInvalid()
  }
  const files = source.files.map((file) => {
    if (
      !declaredWorkspacePaths.includes(
        file.relativePath as (typeof declaredWorkspacePaths)[number],
      ) ||
      file.mode !== '0644'
    ) {
      throw sourceInvalid()
    }
    const descriptorEntry = descriptorForWorkspacePath(
      file.relativePath,
    )
    const bytes = Buffer.from(file.bytes)
    if (
      file.sha256 !== descriptorEntry.sha256 ||
      bytes.length !== descriptorEntry.bytes ||
      sha256(bytes) !== descriptorEntry.sha256
    ) {
      throw sourceInvalid()
    }
    return {
      relativePath: file.relativePath,
      mode: '0644',
      bytes,
      sha256: file.sha256,
    } satisfies SnapshotFile
  })
  files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  )
  if (
    !sameStrings(
      files.map(({ relativePath }) => relativePath),
      declaredWorkspacePaths,
    )
  ) {
    throw sourceInvalid()
  }
  return files
}

async function inspectWorkspaceRoot(
  workspace: AdmittedSemesterWorkspace,
): Promise<
  | { readonly status: 'verified'; readonly canonicalRoot: string }
  | Extract<
      WorkspaceBundleVerification,
      { readonly status: 'manual_recovery_required' | 'unavailable' }
    >
> {
  if (
    !path.isAbsolute(workspace.canonicalRoot) ||
    workspace.formatVersion !== 3 ||
    workspace.workspaceId !== workspace.manifest.workspaceId
  ) {
    return {
      status: 'manual_recovery_required',
      conflicts: [{ relativePath: '.', reason: 'type' }],
    }
  }
  try {
    const stats = await lstat(workspace.canonicalRoot)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      return {
        status: 'manual_recovery_required',
        conflicts: [
          {
            relativePath: '.',
            reason: stats.isSymbolicLink() ? 'symlink' : 'type',
          },
        ],
      }
    }
    const canonicalRoot = await realpath(workspace.canonicalRoot)
    if (canonicalRoot !== path.resolve(workspace.canonicalRoot)) {
      return {
        status: 'manual_recovery_required',
        conflicts: [{ relativePath: '.', reason: 'symlink' }],
      }
    }
    return { status: 'verified', canonicalRoot }
  } catch {
    return { status: 'unavailable' }
  }
}

async function inspectSkillTree(input: {
  readonly workspaceRoot: string
  readonly expected: SnapshotFile
  readonly missing: string[]
  readonly conflicts: WorkspaceBundleConflict[]
}): Promise<void> {
  for (const relativePath of [
    '.agents',
    '.agents/skills',
    declaredSkillRoot,
  ]) {
    const state = await inspectDirectory(
      input.workspaceRoot,
      relativePath,
    )
    if (state === 'missing') {
      input.missing.push(declaredSkillPath)
      return
    }
    if (state !== 'directory') {
      input.conflicts.push({
        relativePath,
        reason: state,
      })
      return
    }
  }

  let entries: string[]
  try {
    entries = await readdir(
      path.join(input.workspaceRoot, declaredSkillRoot),
    )
  } catch {
    input.conflicts.push({
      relativePath: declaredSkillRoot,
      reason: 'unavailable',
    })
    return
  }
  for (const name of entries) {
    if (name !== 'SKILL.md') {
      input.conflicts.push({
        relativePath: `${declaredSkillRoot}/${name}`,
        reason: 'extra',
      })
    }
  }
  await inspectDeclaredFile({
    workspaceRoot: input.workspaceRoot,
    relativePath: declaredSkillPath,
    expected: input.expected,
    missing: input.missing,
    conflicts: input.conflicts,
  })
}

async function inspectDirectory(
  workspaceRoot: string,
  relativePath: string,
): Promise<
  'directory' | 'missing' | 'symlink' | 'type' | 'unavailable'
> {
  try {
    const stats = await lstat(path.join(workspaceRoot, relativePath))
    if (stats.isSymbolicLink()) return 'symlink'
    if (!stats.isDirectory()) return 'type'
    return 'directory'
  } catch (error) {
    return hasErrnoCode(error, 'ENOENT') ? 'missing' : 'unavailable'
  }
}

async function inspectDeclaredFile(input: {
  readonly workspaceRoot: string
  readonly relativePath: string
  readonly expected: SnapshotFile
  readonly missing: string[]
  readonly conflicts: WorkspaceBundleConflict[]
}): Promise<void> {
  const target = path.join(input.workspaceRoot, input.relativePath)
  let stats
  try {
    stats = await lstat(target)
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) {
      input.missing.push(input.relativePath)
    } else {
      input.conflicts.push({
        relativePath: input.relativePath,
        reason: 'unavailable',
      })
    }
    return
  }
  if (stats.isSymbolicLink()) {
    input.conflicts.push({
      relativePath: input.relativePath,
      reason: 'symlink',
    })
    return
  }
  if (!stats.isFile()) {
    input.conflicts.push({
      relativePath: input.relativePath,
      reason: 'type',
    })
    return
  }
  if (stats.nlink !== 1) {
    input.conflicts.push({
      relativePath: input.relativePath,
      reason: 'link',
    })
    return
  }
  if ((stats.mode & 0o777) !== bundleFileMode) {
    input.conflicts.push({
      relativePath: input.relativePath,
      reason: 'mode',
    })
    return
  }
  try {
    const bytes = await readNoFollowRegularFile(target)
    if (
      bytes.length !== input.expected.bytes.length ||
      sha256(bytes) !== input.expected.sha256 ||
      !bytes.equals(input.expected.bytes)
    ) {
      input.conflicts.push({
        relativePath: input.relativePath,
        reason: 'modified',
      })
    }
  } catch {
    input.conflicts.push({
      relativePath: input.relativePath,
      reason: 'unavailable',
    })
  }
}

async function ensureBundleParents(
  workspaceRoot: string,
  relativePath: string,
): Promise<void> {
  const segments = path.dirname(relativePath).split('/')
  if (segments.length === 1 && segments[0] === '.') return
  let current = workspaceRoot
  for (const segment of segments) {
    current = path.join(current, segment)
    try {
      await mkdir(current, { mode: bundleDirectoryMode })
      await syncDirectory(path.dirname(current))
    } catch (error) {
      if (!hasErrnoCode(error, 'EEXIST')) throw error
    }
    const stats = await lstat(current)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error('unsafe bundle parent')
    }
  }
}

async function writeAbsentFile(
  target: string,
  bytes: Buffer,
): Promise<boolean> {
  let handle
  try {
    handle = await open(
      target,
      fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_WRONLY |
        fsConstants.O_NOFOLLOW,
      bundleFileMode,
    )
  } catch (error) {
    if (hasErrnoCode(error, 'EEXIST')) return false
    throw error
  }
  try {
    await handle.chmod(bundleFileMode)
    await handle.writeFile(bytes)
    await handle.sync()
  } finally {
    await handle.close()
  }
  await syncDirectory(path.dirname(target))
  return true
}

async function syncDirectory(directory: string): Promise<void> {
  const handle = await open(directory, fsConstants.O_RDONLY)
  try {
    await handle.sync()
  } finally {
    await handle.close()
  }
}

async function canonicalDirectory(
  resourceRoot: string | URL,
): Promise<string> {
  const candidate =
    resourceRoot instanceof URL
      ? fileURLToPath(resourceRoot)
      : resourceRoot
  if (!path.isAbsolute(candidate)) throw sourceInvalid()
  const stats = await lstat(candidate)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw sourceInvalid()
  }
  return realpath(candidate)
}

type ResourceTreeEntry = {
  readonly relativePath: string
  readonly type: 'directory' | 'file'
}

async function readResourceTree(
  resourceRoot: string,
): Promise<ResourceTreeEntry[]> {
  const entries: ResourceTreeEntry[] = []
  await walkResource(resourceRoot, '', entries)
  return entries.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  )
}

async function walkResource(
  directory: string,
  prefix: string,
  entries: ResourceTreeEntry[],
): Promise<void> {
  for (const name of (await readdir(directory)).sort()) {
    const relativePath = prefix ? `${prefix}/${name}` : name
    const target = path.join(directory, name)
    const stats = await lstat(target)
    if (stats.isSymbolicLink()) throw sourceInvalid()
    if (stats.isDirectory()) {
      entries.push({ relativePath, type: 'directory' })
      await walkResource(target, relativePath, entries)
    } else if (stats.isFile()) {
      entries.push({ relativePath, type: 'file' })
    } else {
      throw sourceInvalid()
    }
  }
}

async function readExactRegularFile(
  target: string,
  descriptor: WorkspaceBundleEntryDescriptor,
): Promise<Buffer> {
  const stats = await lstat(target)
  if (
    !stats.isFile() ||
    stats.isSymbolicLink() ||
    stats.nlink !== 1 ||
    (stats.mode & 0o777) !== bundleFileMode
  ) {
    throw sourceInvalid()
  }
  const bytes = await readNoFollowRegularFile(target)
  if (
    bytes.length !== descriptor.bytes ||
    sha256(bytes) !== descriptor.sha256
  ) {
    throw sourceInvalid()
  }
  return bytes
}

async function readNoFollowRegularFile(target: string): Promise<Buffer> {
  const handle = await open(
    target,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const before = await handle.stat({ bigint: true })
    if (!before.isFile() || before.nlink !== 1n) {
      throw new Error('not an owned regular file')
    }
    const bytes = await handle.readFile()
    const after = await handle.stat({ bigint: true })
    if (
      !after.isFile() ||
      after.nlink !== 1n ||
      before.dev !== after.dev ||
      before.ino !== after.ino ||
      before.size !== after.size ||
      before.mtimeNs !== after.mtimeNs ||
      before.ctimeNs !== after.ctimeNs
    ) {
      throw new Error('file changed while reading')
    }
    return bytes
  } finally {
    await handle.close()
  }
}

function descriptorForWorkspacePath(
  relativePath: string,
): WorkspaceBundleEntryDescriptor {
  if (relativePath === 'AGENTS.md') {
    return workspaceBundleDescriptor.roots[0]!.entries[0]!
  }
  if (relativePath === declaredSkillPath) {
    return workspaceBundleDescriptor.roots[1]!.entries[0]!
  }
  throw sourceInvalid()
}

function snapshotFile(
  files: readonly SnapshotFile[],
  relativePath: string,
): SnapshotFile {
  const file = files.find(
    (candidate) => candidate.relativePath === relativePath,
  )
  if (!file) throw sourceInvalid()
  return file
}

function verifyDescriptorDigests(
  descriptor: WorkspaceBundleDescriptor,
): void {
  for (const root of descriptor.roots) {
    if (
      sha256(encodeRootEntries(root.entries)) !==
      root.completeTreeSha256
    ) {
      throw sourceInvalid()
    }
  }
  if (
    sha256(encodeBundleRoots(descriptor.roots)) !==
      descriptor.completeTreeSha256 ||
    sha256(encodeDescriptor(descriptor)) !==
      workspaceBundleDescriptorSha256
  ) {
    throw sourceInvalid()
  }
}

function encodeRootEntries(
  entries: readonly WorkspaceBundleEntryDescriptor[],
): string {
  return JSON.stringify(
    entries.map(({ relativePath, type, mode, bytes, sha256 }) => ({
      relativePath,
      type,
      mode,
      bytes,
      sha256,
    })),
  )
}

function encodeBundleRoots(
  roots: readonly WorkspaceBundleRootDescriptor[],
): string {
  return JSON.stringify(
    roots.map(
      ({ kind, root, skillName, completeTreeSha256 }) => ({
        kind,
        root,
        skillName,
        completeTreeSha256,
      }),
    ),
  )
}

function encodeDescriptor(
  descriptor: WorkspaceBundleDescriptor,
): string {
  return JSON.stringify({
    schemaVersion: descriptor.schemaVersion,
    bundleId: descriptor.bundleId,
    roots: descriptor.roots.map((root) => ({
      kind: root.kind,
      root: root.root,
      skillName: root.skillName,
      entries: root.entries.map((entry) => ({
        relativePath: entry.relativePath,
        type: entry.type,
        mode: entry.mode,
        bytes: entry.bytes,
        sha256: entry.sha256,
      })),
      completeTreeSha256: root.completeTreeSha256,
    })),
    completeTreeSha256: descriptor.completeTreeSha256,
  })
}

function cloneDescriptor(
  descriptor: WorkspaceBundleDescriptor,
): WorkspaceBundleDescriptor {
  return {
    schemaVersion: 1,
    bundleId: descriptor.bundleId,
    roots: descriptor.roots.map((root) => ({
      kind: root.kind,
      root: root.root,
      skillName: root.skillName,
      entries: root.entries.map((entry) => ({ ...entry })),
      completeTreeSha256: root.completeTreeSha256,
    })),
    completeTreeSha256: descriptor.completeTreeSha256,
  }
}

function freezeSnapshot(
  source: VerifiedBundleSource,
): VerifiedBundleSource {
  for (const root of source.descriptor.roots) {
    for (const entry of root.entries) Object.freeze(entry)
    Object.freeze(root.entries)
    Object.freeze(root)
  }
  Object.freeze(source.descriptor.roots)
  Object.freeze(source.descriptor)
  for (const file of source.files) Object.freeze(file)
  Object.freeze(source.files)
  return Object.freeze(source)
}

function verifiedResult(): Extract<
  WorkspaceBundleVerification,
  { readonly status: 'verified' }
> {
  return {
    status: 'verified',
    descriptorSha256: workspaceBundleDescriptorSha256,
    completeTreeSha256:
      workspaceBundleDescriptor.completeTreeSha256,
  }
}

function sortConflicts(
  conflicts: readonly WorkspaceBundleConflict[],
): WorkspaceBundleConflict[] {
  return [...conflicts].sort((left, right) => {
    const pathOrder = left.relativePath.localeCompare(right.relativePath)
    return pathOrder === 0
      ? left.reason.localeCompare(right.reason)
      : pathOrder
  })
}

function sameStrings(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    [...actual]
      .sort()
      .every((value, index) => value === [...expected].sort()[index])
  )
}

function sha256(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function sourceInvalid(): WorkspaceBundleSourceError {
  return new WorkspaceBundleSourceError()
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  )
}
