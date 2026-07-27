/// <reference types="node" />

import { createHash } from 'node:crypto'
import {
  lstat,
  readFile,
  readdir,
  readlink,
  realpath,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CANONICAL_MANIFEST_PATH = fileURLToPath(
  new URL(
    '../manifests/production-runtime-darwin-arm64.json',
    import.meta.url,
  ),
)
const EXPECTED_SOURCE_COMMIT =
  '8c68d4c87dc54d38861f5114e920c3de2efa5876'
const EXPECTED_SOURCE_REPOSITORY = 'https://github.com/openai/codex'
const EXPECTED_SOURCE_TAG = 'rust-v0.144.4'
const EXPECTED_UNPATCHED_MANIFEST = {
  bytes: 20546,
  git_mode: '100644',
  path: 'manifests/unpatched.json',
  sha256: 'ad3deefc4d2ea29dc289e226059d84155d1d8e2e43d4399da610a569737fec17',
} as const
const EXPECTED_PYTHON_VERSION = '3.10.18'
const EXPECTED_PYTHON_BUILD = '20250818'
const EXPECTED_PYTHON_DISTRIBUTION = 'CPython'
const EXPECTED_RUNTIME_VERSION = '0.144.4'
const EXPECTED_RUNTIME_BINARY_VERSION = 'codex-cli 0.144.4'
const EXPECTED_RUNTIME_DISTRIBUTION = 'openai-codex-cli-bin'
const EXPECTED_PATCH_STACK_SHA256 =
  'e826484de7b9b14de8a925016434f2be43021126582eb46ddc8f5d9faa2646a4'
const EXPECTED_PATCH_IDS = [
  '0001-response-last-router',
  '0002-bounded-notification-routing',
  '0003-router-review-corrections',
  '0004-notification-opt-out-config',
  '0005-strict-response-classification',
  '0006-plan-user-input-seam',
  '0007-thread-start-settings',
  '0008-thread-mcp-status',
] as const
const EXPECTED_TARGET = {
  architecture: 'arm64',
  id: 'darwin-arm64',
  system: 'Darwin',
} as const

type JsonObject = Record<string, unknown>

interface TreeEvidence {
  file_count: number
  regular_file_bytes: number
  roster_sha256: string
  symlink_count: number
}

interface FileTreeRecord {
  bytes: number
  git_mode: '100644' | '100755'
  sha256: string
  type: 'file'
}

interface SymlinkTreeRecord {
  target: string
  type: 'symlink'
}

type TreeRecord = FileTreeRecord | SymlinkTreeRecord

export interface VerifiedProductionBundle {
  bridgeEntrypoint: string
  codexPathDirectory: string
  nativeExecutable: string
  patchStackSha256: string
  pythonBuild: string
  pythonExecutable: string
  pythonVersion: string
  runtimeBinaryVersion: string
  runtimeVersion: string
  sitePackages: string
  sourceCommit: string
}

interface ProductionBundleVerificationAuthority {
  readonly artifactRoot: string
  readonly canonicalManifestPath: string
}

const PRODUCTION_BUNDLE_AUTHORITIES = new WeakMap<
  VerifiedProductionBundle,
  ProductionBundleVerificationAuthority
>()

/**
 * Package-private test seam. Production callers must omit this argument so the
 * tracked canonical manifest remains the authority.
 */
export interface ProductionBundleVerificationTestOptions {
  canonicalManifestPath?: string
}

export class ProductionBundleVerificationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProductionBundleVerificationError'
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireObject(
  parent: JsonObject,
  key: string,
  label: string,
): JsonObject {
  const value = parent[key]
  if (!isJsonObject(value)) {
    throw new ProductionBundleVerificationError(`${label} is invalid`)
  }
  return value
}

function requireString(
  parent: JsonObject,
  key: string,
  label: string,
): string {
  const value = parent[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new ProductionBundleVerificationError(`${label} is invalid`)
  }
  return value
}

function requireNonNegativeSafeInteger(
  parent: JsonObject,
  key: string,
  label: string,
): number {
  const value = parent[key]
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new ProductionBundleVerificationError(`${label} is invalid`)
  }
  return value as number
}

async function readRegularFile(filePath: string, label: string): Promise<Buffer> {
  let stats
  try {
    stats = await lstat(filePath)
  } catch (error) {
    throw new ProductionBundleVerificationError(`${label} is missing`, {
      cause: error,
    })
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new ProductionBundleVerificationError(
      `${label} must be a regular file and not a symlink`,
    )
  }
  try {
    return await readFile(filePath)
  } catch (error) {
    throw new ProductionBundleVerificationError(`${label} cannot be read`, {
      cause: error,
    })
  }
}

function parseManifest(encoded: Buffer): JsonObject {
  let manifest: unknown
  try {
    manifest = JSON.parse(encoded.toString('utf8')) as unknown
  } catch (error) {
    throw new ProductionBundleVerificationError(
      'canonical production manifest is not valid JSON',
      { cause: error },
    )
  }
  if (!isJsonObject(manifest)) {
    throw new ProductionBundleVerificationError(
      'canonical production manifest must be a JSON object',
    )
  }
  return manifest
}

function exactObjectEquals(
  value: unknown,
  expected: Readonly<Record<string, unknown>>,
): boolean {
  if (!isJsonObject(value)) {
    return false
  }
  const keys = Object.keys(value).sort()
  const expectedKeys = Object.keys(expected).sort()
  return (
    keys.length === expectedKeys.length &&
    keys.every((key, index) => key === expectedKeys[index]) &&
    expectedKeys.every((key) => value[key] === expected[key])
  )
}

function validateManifestContract(manifest: JsonObject): {
  bridge: JsonObject
  bundle: JsonObject
  installed: JsonObject
  python: JsonObject
  runtime: JsonObject
  source: JsonObject
} {
  if (manifest.schema_version !== 1) {
    throw new ProductionBundleVerificationError(
      'production manifest schema version drift',
    )
  }
  if (manifest.kind !== 'codex_chat_runtime_bundle') {
    throw new ProductionBundleVerificationError(
      'production manifest kind drift',
    )
  }
  if (!exactObjectEquals(manifest.target, EXPECTED_TARGET)) {
    throw new ProductionBundleVerificationError(
      'production manifest target drift',
    )
  }

  const bridge = requireObject(manifest, 'bridge', 'bridge manifest')
  const bundle = requireObject(manifest, 'bundle', 'bundle manifest')
  const installed = requireObject(manifest, 'installed', 'installed manifest')
  const python = requireObject(manifest, 'python', 'Python manifest')
  const runtime = requireObject(manifest, 'runtime', 'runtime manifest')
  const source = requireObject(manifest, 'source', 'source manifest')

  if (source.commit !== EXPECTED_SOURCE_COMMIT) {
    throw new ProductionBundleVerificationError(
      'production manifest source commit drift',
    )
  }
  if (
    source.repository !== EXPECTED_SOURCE_REPOSITORY ||
    source.tag !== EXPECTED_SOURCE_TAG
  ) {
    throw new ProductionBundleVerificationError(
      'production manifest source repository or tag drift',
    )
  }
  if (!exactObjectEquals(source.unpatched_manifest, EXPECTED_UNPATCHED_MANIFEST)) {
    throw new ProductionBundleVerificationError(
      'production manifest unpatched provenance drift',
    )
  }
  if (
    python.version !== EXPECTED_PYTHON_VERSION ||
    python.build !== EXPECTED_PYTHON_BUILD ||
    python.distribution !== EXPECTED_PYTHON_DISTRIBUTION
  ) {
    throw new ProductionBundleVerificationError(
      'production manifest Python runtime drift',
    )
  }
  if (runtime.version !== EXPECTED_RUNTIME_VERSION) {
    throw new ProductionBundleVerificationError(
      'production manifest runtime version drift',
    )
  }
  if (runtime.binary_version !== EXPECTED_RUNTIME_BINARY_VERSION) {
    throw new ProductionBundleVerificationError(
      'production manifest runtime binary version drift',
    )
  }
  if (runtime.distribution !== EXPECTED_RUNTIME_DISTRIBUTION) {
    throw new ProductionBundleVerificationError(
      'production manifest runtime distribution drift',
    )
  }
  if (source.patch_stack_sha256 !== EXPECTED_PATCH_STACK_SHA256) {
    throw new ProductionBundleVerificationError(
      'production manifest patch stack digest drift',
    )
  }

  const patches = source.patches
  if (
    !Array.isArray(patches) ||
    patches.length !== EXPECTED_PATCH_IDS.length ||
    patches.some((row) => !isJsonObject(row))
  ) {
    throw new ProductionBundleVerificationError(
      'production manifest patch order drift',
    )
  }
  for (const [index, expectedId] of EXPECTED_PATCH_IDS.entries()) {
    const row = patches[index] as JsonObject
    if (row.id !== expectedId || row.order !== index + 1) {
      throw new ProductionBundleVerificationError(
        'production manifest patch order drift',
      )
    }
  }

  return { bridge, bundle, installed, python, runtime, source }
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (value) => value.codePointAt(0) ?? 0)
  const rightPoints = Array.from(right, (value) => value.codePointAt(0) ?? 0)
  const length = Math.min(leftPoints.length, rightPoints.length)
  for (let index = 0; index < length; index += 1) {
    const difference = leftPoints[index] - rightPoints[index]
    if (difference !== 0) {
      return difference
    }
  }
  return leftPoints.length - rightPoints.length
}

function sortJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonKeys)
  }
  if (!isJsonObject(value)) {
    return value
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort(compareUnicodeCodePoints)
      .map((key) => [key, sortJsonKeys(value[key])]),
  )
}

function escapeNonAsciiForPython(value: string): string {
  return value.replace(/[^\x00-\x7e]/gu, (character) => {
    const point = character.codePointAt(0) as number
    if (point <= 0xffff) {
      return `\\u${point.toString(16).padStart(4, '0')}`
    }
    const offset = point - 0x10000
    const high = 0xd800 + (offset >> 10)
    const low = 0xdc00 + (offset & 0x3ff)
    return `\\u${high.toString(16)}\\u${low.toString(16)}`
  })
}

function canonicalPythonJson(value: JsonObject): Buffer {
  const encoded = JSON.stringify(sortJsonKeys(value), null, 2)
  return Buffer.from(`${escapeNonAsciiForPython(encoded)}\n`, 'utf8')
}

function sha256(value: Buffer): string {
  return createHash('sha256').update(value).digest('hex')
}

function isContainedBy(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  )
}

async function collectTreeRecords(
  root: string,
): Promise<Record<string, TreeRecord>> {
  const rootStats = await lstat(root).catch((error: unknown) => {
    throw new ProductionBundleVerificationError(
      'production bundle directory is missing',
      { cause: error },
    )
  })
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink()) {
    throw new ProductionBundleVerificationError(
      'production bundle directory is missing or is a symlink',
    )
  }
  const realRoot = await realpath(root)
  const records: Record<string, TreeRecord> = {}

  const visit = async (directory: string, relativeRoot: string): Promise<void> => {
    const names = (await readdir(directory)).sort(compareUnicodeCodePoints)
    for (const name of names) {
      const absolute = path.join(directory, name)
      const relative = relativeRoot
        ? path.posix.join(relativeRoot, name)
        : name
      const stats = await lstat(absolute)
      if (stats.isSymbolicLink()) {
        const target = await readlink(absolute)
        const lexicalTarget = path.resolve(path.dirname(absolute), target)
        if (!isContainedBy(root, lexicalTarget)) {
          throw new ProductionBundleVerificationError(
            `production bundle symlink escapes the bundle: ${relative}`,
          )
        }
        let realTarget: string
        try {
          realTarget = await realpath(absolute)
        } catch (error) {
          throw new ProductionBundleVerificationError(
            `production bundle symlink is dangling: ${relative}`,
            { cause: error },
          )
        }
        if (!isContainedBy(realRoot, realTarget)) {
          throw new ProductionBundleVerificationError(
            `production bundle symlink escapes the bundle: ${relative}`,
          )
        }
        records[relative] = { target, type: 'symlink' }
        continue
      }
      if (stats.isDirectory()) {
        await visit(absolute, relative)
        continue
      }
      if (!stats.isFile()) {
        throw new ProductionBundleVerificationError(
          `production bundle contains an unsupported entry: ${relative}`,
        )
      }
      const bytes = await readFile(absolute)
      records[relative] = {
        bytes: stats.size,
        git_mode: stats.mode & 0o100 ? '100755' : '100644',
        sha256: sha256(bytes),
        type: 'file',
      }
    }
  }

  await visit(root, '')
  return records
}

async function treeEvidence(root: string): Promise<TreeEvidence> {
  const records = await collectTreeRecords(root)
  const values = Object.values(records)
  const files = values.filter(
    (record): record is FileTreeRecord => record.type === 'file',
  )
  return {
    file_count: files.length,
    regular_file_bytes: files.reduce((sum, record) => sum + record.bytes, 0),
    roster_sha256: sha256(canonicalPythonJson({ files: records })),
    symlink_count: values.length - files.length,
  }
}

function expectedTreeEvidence(bundle: JsonObject): TreeEvidence {
  if (bundle.path !== 'bundle') {
    throw new ProductionBundleVerificationError(
      'production manifest bundle path drift',
    )
  }
  const roster = requireString(
    bundle,
    'roster_sha256',
    'production bundle roster digest',
  )
  if (!/^[0-9a-f]{64}$/u.test(roster)) {
    throw new ProductionBundleVerificationError(
      'production bundle roster digest is invalid',
    )
  }
  return {
    file_count: requireNonNegativeSafeInteger(
      bundle,
      'file_count',
      'production bundle file count',
    ),
    regular_file_bytes: requireNonNegativeSafeInteger(
      bundle,
      'regular_file_bytes',
      'production bundle byte count',
    ),
    roster_sha256: roster,
    symlink_count: requireNonNegativeSafeInteger(
      bundle,
      'symlink_count',
      'production bundle symlink count',
    ),
  }
}

function safeManifestPath(
  artifactRoot: string,
  relative: unknown,
  label: string,
): string {
  if (
    typeof relative !== 'string' ||
    relative.length === 0 ||
    relative.includes('\\') ||
    relative.includes('\0') ||
    path.posix.isAbsolute(relative)
  ) {
    throw new ProductionBundleVerificationError(
      `${label} path is not a safe manifest-relative path`,
    )
  }
  const parts = relative.split('/')
  if (
    parts[0] !== 'bundle' ||
    parts.some((part) => part === '' || part === '.' || part === '..') ||
    path.posix.normalize(relative) !== relative
  ) {
    throw new ProductionBundleVerificationError(
      `${label} path is not a safe manifest-relative path`,
    )
  }
  const absolute = path.join(artifactRoot, ...parts)
  if (!isContainedBy(artifactRoot, absolute)) {
    throw new ProductionBundleVerificationError(
      `${label} path escapes the artifact root`,
    )
  }
  return absolute
}

async function verifySelectedPath(
  artifactRoot: string,
  relative: unknown,
  label: string,
  kind: 'directory' | 'executable' | 'file',
): Promise<string> {
  const absolute = safeManifestPath(artifactRoot, relative, label)
  const parts = path.relative(artifactRoot, absolute).split(path.sep)
  let cursor = artifactRoot
  for (const part of parts) {
    cursor = path.join(cursor, part)
    let stats
    try {
      stats = await lstat(cursor)
    } catch (error) {
      throw new ProductionBundleVerificationError(`${label} is missing`, {
        cause: error,
      })
    }
    if (stats.isSymbolicLink()) {
      throw new ProductionBundleVerificationError(`${label} is a symlink`)
    }
    if (cursor !== absolute && !stats.isDirectory()) {
      throw new ProductionBundleVerificationError(
        `${label} has a non-directory ancestor`,
      )
    }
    if (cursor === absolute) {
      if (kind === 'directory' && !stats.isDirectory()) {
        throw new ProductionBundleVerificationError(`${label} is not a directory`)
      }
      if (kind !== 'directory' && !stats.isFile()) {
        throw new ProductionBundleVerificationError(`${label} is not a file`)
      }
      if (kind === 'executable' && !(stats.mode & 0o100)) {
        throw new ProductionBundleVerificationError(`${label} is not executable`)
      }
    }
  }
  return absolute
}

/**
 * Verifies an already-materialized package-private runtime without executing it.
 * The tracked manifest and complete bundle roster are the only production
 * authority; this function never probes system Python or a runtime on PATH.
 */
export async function verifyProductionBundle(
  artifactRoot: string,
  options: ProductionBundleVerificationTestOptions = {},
): Promise<VerifiedProductionBundle> {
  if (!path.isAbsolute(artifactRoot)) {
    throw new ProductionBundleVerificationError(
      'production artifact root must be absolute',
    )
  }
  const normalizedRoot = path.normalize(artifactRoot)
  let rootStats
  try {
    rootStats = await lstat(normalizedRoot)
  } catch (error) {
    throw new ProductionBundleVerificationError(
      'production artifact root is missing',
      { cause: error },
    )
  }
  if (rootStats.isSymbolicLink()) {
    throw new ProductionBundleVerificationError(
      'production artifact root must not be a symlink',
    )
  }
  if (!rootStats.isDirectory()) {
    throw new ProductionBundleVerificationError(
      'production artifact root must be a directory',
    )
  }

  const canonicalManifestPath =
    options.canonicalManifestPath ?? CANONICAL_MANIFEST_PATH
  if (!path.isAbsolute(canonicalManifestPath)) {
    throw new ProductionBundleVerificationError(
      'canonical manifest path must be absolute',
    )
  }
  const [canonicalBytes, localBytes] = await Promise.all([
    readRegularFile(canonicalManifestPath, 'canonical production manifest'),
    readRegularFile(
      path.join(normalizedRoot, 'manifest.json'),
      'materialized production manifest',
    ),
  ])
  if (!localBytes.equals(canonicalBytes)) {
    throw new ProductionBundleVerificationError(
      'materialized production manifest differs from the canonical manifest',
    )
  }

  const manifest = parseManifest(canonicalBytes)
  const { bridge, bundle, installed, python, runtime, source } =
    validateManifestContract(manifest)
  const sitePackagesManifest = requireObject(
    installed,
    'site_packages',
    'site-packages manifest',
  )

  const expectedBundle = expectedTreeEvidence(bundle)
  const actualBundle = await treeEvidence(path.join(normalizedRoot, 'bundle'))
  if (
    actualBundle.file_count !== expectedBundle.file_count ||
    actualBundle.regular_file_bytes !== expectedBundle.regular_file_bytes ||
    actualBundle.roster_sha256 !== expectedBundle.roster_sha256 ||
    actualBundle.symlink_count !== expectedBundle.symlink_count
  ) {
    throw new ProductionBundleVerificationError(
      `production bundle roster drift: expected=${JSON.stringify(expectedBundle)}, actual=${JSON.stringify(actualBundle)}`,
    )
  }

  const sitePackagesPath = requireString(
    sitePackagesManifest,
    'path',
    'site-packages path',
  )
  const codexPath = path.posix.join(
    sitePackagesPath,
    'codex_cli_bin',
    'codex-path',
  )
  const [
    pythonExecutable,
    bridgeEntrypoint,
    sitePackages,
    nativeExecutable,
    codexPathDirectory,
  ] =
    await Promise.all([
      verifySelectedPath(
        normalizedRoot,
        python.executable,
        'Python executable',
        'executable',
      ),
      verifySelectedPath(
        normalizedRoot,
        bridge.entrypoint,
        'bridge entrypoint',
        'file',
      ),
      verifySelectedPath(
        normalizedRoot,
        sitePackagesPath,
        'site-packages',
        'directory',
      ),
      verifySelectedPath(
        normalizedRoot,
        runtime.executable,
        'native executable',
        'executable',
      ),
      verifySelectedPath(
        normalizedRoot,
        codexPath,
        'Codex helper path',
        'directory',
      ),
    ])

  const verified = Object.freeze({
    bridgeEntrypoint,
    codexPathDirectory,
    nativeExecutable,
    patchStackSha256: requireString(
      source,
      'patch_stack_sha256',
      'patch stack digest',
    ),
    pythonBuild: requireString(python, 'build', 'Python build'),
    pythonExecutable,
    pythonVersion: requireString(python, 'version', 'Python version'),
    runtimeBinaryVersion: requireString(
      runtime,
      'binary_version',
      'runtime binary version',
    ),
    runtimeVersion: requireString(runtime, 'version', 'runtime version'),
    sitePackages,
    sourceCommit: requireString(source, 'commit', 'source commit'),
  })
  PRODUCTION_BUNDLE_AUTHORITIES.set(
    verified,
    Object.freeze({
      artifactRoot: normalizedRoot,
      canonicalManifestPath,
    }),
  )
  return verified
}

/**
 * Package-private launch-time re-attestation seam. The original verified
 * object is an opaque capability: callers cannot reconstruct its complete-tree
 * verification authority from selected paths or stale metadata.
 */
export async function reverifyProductionBundle(
  bundle: VerifiedProductionBundle,
): Promise<VerifiedProductionBundle> {
  const authority = PRODUCTION_BUNDLE_AUTHORITIES.get(bundle)
  if (!authority) {
    throw new ProductionBundleVerificationError(
      'production bundle was not issued by the verifier',
    )
  }
  return verifyProductionBundle(authority.artifactRoot, {
    canonicalManifestPath: authority.canonicalManifestPath,
  })
}
