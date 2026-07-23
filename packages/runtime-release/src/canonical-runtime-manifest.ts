/// <reference types="node" />

import { createHash } from 'node:crypto'
import path from 'node:path'

const REQUIRED_PAYLOAD_TOP_LEVEL = [
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'bundle',
  'licenses',
  'provenance',
  'sbom.spdx.json',
] as const

const MACOS_FILENAME_COLLATOR = new Intl.Collator('und', {
  usage: 'search',
  sensitivity: 'accent',
})

const MAX_FULL_CASE_FOLD_PASSES = 8

type JsonObject = Record<string, unknown>

type RuntimeManifestPathGraphNode = {
  readonly segment: string
  readonly comparisonKey: string
  readonly children: RuntimeManifestPathGraphNode[]
  terminalType?: RuntimeManifestEntry['type']
}

export type RuntimeManifestFileEntry = {
  readonly bytes: number
  readonly mode: '100644' | '100755'
  readonly path: string
  readonly sha256: string
  readonly type: 'file'
}

export type RuntimeManifestSymlinkEntry = {
  readonly path: string
  readonly target: string
  readonly type: 'symlink'
}

export type RuntimeManifestEntry =
  | RuntimeManifestFileEntry
  | RuntimeManifestSymlinkEntry

export type RuntimeManifestTreeEvidence = {
  readonly file_count: number
  readonly regular_file_bytes: number
  readonly roster_sha256: string
  readonly symlink_count: number
}

export type CanonicalRuntimeManifest = {
  readonly schema_version: 2
  readonly kind: 'ay_ple_runtime_release'
  readonly runtime_contract_version: number
  readonly target: {
    readonly system: 'Darwin'
    readonly architecture: 'arm64'
    readonly id: 'darwin-arm64'
  }
  readonly identity: {
    readonly native_codex_version: string
    readonly python_version: string
    readonly source_commit: string
    readonly patch_stack_sha256: string
  }
  readonly launch: {
    readonly python_executable: string
    readonly bridge_entrypoint: string
    readonly site_packages: string
    readonly native_executable: string
  }
  readonly payload: RuntimeManifestTreeEvidence & {
    readonly entries: readonly RuntimeManifestEntry[]
  }
  readonly bundle: RuntimeManifestTreeEvidence & {
    readonly path: 'bundle'
  }
  readonly input_provenance: {
    readonly path: string
    readonly sha256: string
  }
}

export class CanonicalRuntimeManifestContractError extends TypeError {
  constructor() {
    super('The canonical Runtime manifest is invalid.')
    this.name = 'CanonicalRuntimeManifestContractError'
  }
}

export function decodeCanonicalRuntimeManifest(
  value: unknown,
): CanonicalRuntimeManifest {
  if (
    !isExactObject(value, [
      'bundle',
      'identity',
      'input_provenance',
      'kind',
      'launch',
      'payload',
      'runtime_contract_version',
      'schema_version',
      'target',
    ]) ||
    value.schema_version !== 2 ||
    value.kind !== 'ay_ple_runtime_release' ||
    !isPositiveSafeInteger(value.runtime_contract_version)
  ) {
    throw invalidManifest()
  }

  const target = decodeTarget(value.target)
  const identity = decodeIdentity(value.identity)
  const entries = decodeEntries(value.payload)
  const payload = decodePayloadEvidence(value.payload, entries)
  const bundleEntries = entries.filter((entry) =>
    entry.path.startsWith('bundle/'),
  )
  const bundle = decodeBundleEvidence(value.bundle, bundleEntries)
  const launch = decodeLaunch(value.launch, entries)
  const inputProvenance = decodeInputProvenance(
    value.input_provenance,
    entries,
  )

  return {
    schema_version: 2,
    kind: 'ay_ple_runtime_release',
    runtime_contract_version: value.runtime_contract_version as number,
    target,
    identity,
    launch,
    payload,
    bundle,
    input_provenance: inputProvenance,
  }
}

export function runtimeManifestRosterSha256(
  entries: readonly RuntimeManifestEntry[],
): string {
  return createHash('sha256')
    .update(JSON.stringify(sortJsonKeys({ entries })))
    .digest('hex')
}

function decodeTarget(
  value: unknown,
): CanonicalRuntimeManifest['target'] {
  if (
    !isExactObject(value, ['architecture', 'id', 'system']) ||
    value.system !== 'Darwin' ||
    value.architecture !== 'arm64' ||
    value.id !== 'darwin-arm64'
  ) {
    throw invalidManifest()
  }
  return {
    system: 'Darwin',
    architecture: 'arm64',
    id: 'darwin-arm64',
  }
}

function decodeIdentity(
  value: unknown,
): CanonicalRuntimeManifest['identity'] {
  if (
    !isExactObject(value, [
      'native_codex_version',
      'patch_stack_sha256',
      'python_version',
      'source_commit',
    ]) ||
    !isExactSemver(value.native_codex_version) ||
    !isExactSemver(value.python_version) ||
    !isSourceCommit(value.source_commit) ||
    !isSha256(value.patch_stack_sha256)
  ) {
    throw invalidManifest()
  }
  return {
    native_codex_version: value.native_codex_version,
    python_version: value.python_version,
    source_commit: value.source_commit,
    patch_stack_sha256: value.patch_stack_sha256,
  }
}

function decodeLaunch(
  value: unknown,
  entries: readonly RuntimeManifestEntry[],
): CanonicalRuntimeManifest['launch'] {
  if (
    !isExactObject(value, [
      'bridge_entrypoint',
      'native_executable',
      'python_executable',
      'site_packages',
    ])
  ) {
    throw invalidManifest()
  }
  const pythonExecutable = decodeBundlePath(value.python_executable)
  const bridgeEntrypoint = decodeBundlePath(value.bridge_entrypoint)
  const sitePackages = decodeBundlePath(value.site_packages)
  const nativeExecutable = decodeBundlePath(value.native_executable)
  requireSelectedFile(entries, pythonExecutable, true)
  requireSelectedFile(entries, bridgeEntrypoint, false)
  requireSelectedFile(entries, nativeExecutable, true)
  if (
    !entries.some((entry) =>
      entry.path.startsWith(`${sitePackages}/`),
    )
  ) {
    throw invalidManifest()
  }
  return {
    python_executable: pythonExecutable,
    bridge_entrypoint: bridgeEntrypoint,
    site_packages: sitePackages,
    native_executable: nativeExecutable,
  }
}

function decodeEntries(value: unknown): readonly RuntimeManifestEntry[] {
  if (
    !isExactObject(value, [
      'entries',
      'file_count',
      'regular_file_bytes',
      'roster_sha256',
      'symlink_count',
    ]) ||
    !Array.isArray(value.entries) ||
    value.entries.length === 0
  ) {
    throw invalidManifest()
  }

  const entries = value.entries.map(decodeEntry)
  for (let index = 0; index < entries.length; index += 1) {
    const current = entries[index]
    const previous = entries[index - 1]
    if (
      previous !== undefined &&
      compareUnicodeCodePoints(previous.path, current.path) >= 0
    ) {
      throw invalidManifest()
    }
  }
  assertSafeManifestPathGraph(entries)
  assertExactPayloadTopLevel(entries)
  assertSafeSymlinkTargets(entries)
  return entries
}

function decodeEntry(value: unknown): RuntimeManifestEntry {
  if (!isJsonObject(value) || typeof value.type !== 'string') {
    throw invalidManifest()
  }
  if (value.type === 'file') {
    if (
      !isExactObject(value, [
        'bytes',
        'mode',
        'path',
        'sha256',
        'type',
      ]) ||
      !isSafeManifestPath(value.path) ||
      !isNonNegativeSafeInteger(value.bytes) ||
      (value.mode !== '100644' && value.mode !== '100755') ||
      !isSha256(value.sha256)
    ) {
      throw invalidManifest()
    }
    return {
      bytes: value.bytes as number,
      mode: value.mode,
      path: value.path,
      sha256: value.sha256,
      type: 'file',
    }
  }
  if (value.type === 'symlink') {
    if (
      !isExactObject(value, ['path', 'target', 'type']) ||
      !isSafeManifestPath(value.path) ||
      !isSafeSymlinkTargetText(value.target)
    ) {
      throw invalidManifest()
    }
    return {
      path: value.path,
      target: value.target,
      type: 'symlink',
    }
  }
  throw invalidManifest()
}

function decodePayloadEvidence(
  value: unknown,
  entries: readonly RuntimeManifestEntry[],
): CanonicalRuntimeManifest['payload'] {
  const evidence = decodeTreeEvidence(value, entries)
  return { ...evidence, entries }
}

function decodeBundleEvidence(
  value: unknown,
  entries: readonly RuntimeManifestEntry[],
): CanonicalRuntimeManifest['bundle'] {
  if (
    !isExactObject(value, [
      'file_count',
      'path',
      'regular_file_bytes',
      'roster_sha256',
      'symlink_count',
    ]) ||
    value.path !== 'bundle'
  ) {
    throw invalidManifest()
  }
  return {
    path: 'bundle',
    ...decodeTreeEvidence(value, entries),
  }
}

function decodeTreeEvidence(
  value: unknown,
  entries: readonly RuntimeManifestEntry[],
): RuntimeManifestTreeEvidence {
  if (
    !isJsonObject(value) ||
    !isNonNegativeSafeInteger(value.file_count) ||
    !isNonNegativeSafeInteger(value.regular_file_bytes) ||
    !isSha256(value.roster_sha256) ||
    !isNonNegativeSafeInteger(value.symlink_count)
  ) {
    throw invalidManifest()
  }
  const files = entries.filter(
    (entry): entry is RuntimeManifestFileEntry => entry.type === 'file',
  )
  const regularFileBytes = files.reduce(
    (total, entry) => total + entry.bytes,
    0,
  )
  if (
    !Number.isSafeInteger(regularFileBytes) ||
    value.file_count !== files.length ||
    value.regular_file_bytes !== regularFileBytes ||
    value.symlink_count !== entries.length - files.length ||
    value.roster_sha256 !== runtimeManifestRosterSha256(entries)
  ) {
    throw invalidManifest()
  }
  return {
    file_count: value.file_count as number,
    regular_file_bytes: value.regular_file_bytes as number,
    roster_sha256: value.roster_sha256,
    symlink_count: value.symlink_count as number,
  }
}

function decodeInputProvenance(
  value: unknown,
  entries: readonly RuntimeManifestEntry[],
): CanonicalRuntimeManifest['input_provenance'] {
  if (
    !isExactObject(value, ['path', 'sha256']) ||
    !isSafeManifestPath(value.path) ||
    !value.path.startsWith('provenance/') ||
    !isSha256(value.sha256)
  ) {
    throw invalidManifest()
  }
  const entry = entries.find((candidate) => candidate.path === value.path)
  if (
    entry === undefined ||
    entry.type !== 'file' ||
    entry.sha256 !== value.sha256
  ) {
    throw invalidManifest()
  }
  return { path: value.path, sha256: value.sha256 }
}

function requireSelectedFile(
  entries: readonly RuntimeManifestEntry[],
  selectedPath: string,
  executable: boolean,
): void {
  const entry = entries.find((candidate) => candidate.path === selectedPath)
  if (
    entry === undefined ||
    entry.type !== 'file' ||
    (executable && entry.mode !== '100755')
  ) {
    throw invalidManifest()
  }
}

function decodeBundlePath(value: unknown): string {
  if (
    !isSafeManifestPath(value) ||
    (value !== 'bundle' && !value.startsWith('bundle/'))
  ) {
    throw invalidManifest()
  }
  return value
}

function assertExactPayloadTopLevel(
  entries: readonly RuntimeManifestEntry[],
): void {
  const actual = new Set(entries.map((entry) => entry.path.split('/')[0]))
  if (
    actual.size !== REQUIRED_PAYLOAD_TOP_LEVEL.length ||
    REQUIRED_PAYLOAD_TOP_LEVEL.some((name) => !actual.has(name))
  ) {
    throw invalidManifest()
  }
  for (const requiredFile of [
    'NOTICE',
    'THIRD_PARTY_NOTICES.md',
    'sbom.spdx.json',
  ]) {
    const entry = entries.find(
      (candidate) => candidate.path === requiredFile,
    )
    if (entry?.type !== 'file') throw invalidManifest()
  }
  for (const requiredSubtree of [
    'bundle',
    'licenses',
    'provenance',
  ]) {
    if (
      !entries.some((entry) =>
        entry.path.startsWith(`${requiredSubtree}/`),
      )
    ) {
      throw invalidManifest()
    }
  }
}

function assertSafeManifestPathGraph(
  entries: readonly RuntimeManifestEntry[],
): void {
  const root: RuntimeManifestPathGraphNode = {
    segment: '',
    comparisonKey: '',
    children: [],
  }
  for (const entry of entries) {
    let cursor: RuntimeManifestPathGraphNode = root
    const segments = entry.path.split('/')
    for (let index = 0; index < segments.length; index += 1) {
      if (cursor.terminalType !== undefined) {
        throw invalidManifest()
      }
      const segment = segments[index]
      const comparisonKey = macOSFilenameComparisonKey(segment)
      let child = cursor.children.find(
        (candidate) =>
          MACOS_FILENAME_COLLATOR.compare(
            candidate.comparisonKey,
            comparisonKey,
          ) === 0,
      )
      if (child === undefined) {
        child = {
          segment,
          comparisonKey,
          children: [],
        }
        cursor.children.push(child)
      } else if (child.segment !== segment) {
        throw invalidManifest()
      }
      cursor = child
    }
    if (
      cursor.terminalType !== undefined ||
      cursor.children.length > 0
    ) {
      throw invalidManifest()
    }
    cursor.terminalType = entry.type
  }
}

function macOSFilenameComparisonKey(value: string): string {
  let current = value
  for (let pass = 0; pass < MAX_FULL_CASE_FOLD_PASSES; pass += 1) {
    const folded = current.toUpperCase().toLowerCase()
    if (folded === current) return current
    current = folded
  }
  throw invalidManifest()
}

function assertSafeSymlinkTargets(
  entries: readonly RuntimeManifestEntry[],
): void {
  const entriesByPath = new Map(
    entries.map((entry) => [entry.path, entry] as const),
  )
  for (const entry of entries) {
    if (entry.type !== 'symlink') continue
    const visited = new Set([entry.path])
    let resolved = resolveSymlinkTarget(entry)
    while (true) {
      const exactTarget = entriesByPath.get(resolved)
      if (exactTarget?.type === 'file') break
      if (exactTarget?.type === 'symlink') {
        if (visited.has(exactTarget.path)) throw invalidManifest()
        visited.add(exactTarget.path)
        resolved = resolveSymlinkTarget(exactTarget)
        continue
      }
      if (
        entries.some((candidate) =>
          candidate.path.startsWith(`${resolved}/`),
        )
      ) {
        break
      }
      throw invalidManifest()
    }
  }
}

function resolveSymlinkTarget(
  entry: RuntimeManifestSymlinkEntry,
): string {
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(entry.path), entry.target),
  )
  if (
    resolved === '..' ||
    resolved.startsWith('../') ||
    path.posix.isAbsolute(resolved)
  ) {
    throw invalidManifest()
  }
  return resolved
}

function isSafeManifestPath(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\0') ||
    value.includes('\\') ||
    value.startsWith('/') ||
    value.normalize('NFC') !== value ||
    Buffer.byteLength(value, 'utf8') > 1024 ||
    path.posix.normalize(value) !== value
  ) {
    return false
  }
  const segments = value.split('/')
  return (
    segments.every(
      (segment) =>
        segment !== '' &&
        segment !== '.' &&
        segment !== '..' &&
        Buffer.byteLength(segment, 'utf8') <= 255,
    ) && value !== 'manifest.json'
  )
}

function isSafeSymlinkTargetText(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value !== '.' &&
    !value.includes('\0') &&
    !value.includes('\\') &&
    !path.posix.isAbsolute(value) &&
    value.normalize('NFC') === value &&
    path.posix.normalize(value) === value &&
    Buffer.byteLength(value, 'utf8') <= 1024
  )
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is JsonObject {
  if (!isJsonObject(value)) return false
  const actual = Object.keys(value).sort(compareUnicodeCodePoints)
  const expected = [...keys].sort(compareUnicodeCodePoints)
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isExactSemver(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/u.test(value)
  )
}

function isSourceCommit(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{40}$/u.test(value)
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value)
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (!isJsonObject(value)) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => compareUnicodeCodePoints(left, right))
      .map(([key, child]) => [key, sortJsonKeys(child)]),
  )
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0)!)
  const rightPoints = Array.from(
    right,
    (character) => character.codePointAt(0)!,
  )
  const length = Math.min(leftPoints.length, rightPoints.length)
  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index]
    }
  }
  return leftPoints.length - rightPoints.length
}

function invalidManifest(): CanonicalRuntimeManifestContractError {
  return new CanonicalRuntimeManifestContractError()
}
