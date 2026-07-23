export type RuntimeReleaseDescriptor = {
  readonly schemaVersion: 1
  readonly launcher: {
    readonly packageName: 'ay-ple'
    readonly version: string
  }
  readonly distribution: {
    readonly repository: string
    readonly applicationReleaseTag: string
    readonly runtimeAssetReleaseTag: string
  }
  readonly runtime: {
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
  }
  readonly archive: {
    readonly format: 'ay-ple-runtime-tar-gzip-v1'
    readonly assetName: string
    readonly url: string
    readonly bytes: number
    readonly sha256: string
  }
  readonly manifest: {
    readonly packageResource: string
    readonly schemaVersion: 2
    readonly bytes: number
    readonly sha256: string
  }
}

export type RuntimeResolutionPhase =
  | 'checking_cache'
  | 'downloading'
  | 'verifying_archive'
  | 'installing'
  | 'verifying_runtime'
  | 'ready'

export type RuntimeResolveProgress = {
  readonly phase: RuntimeResolutionPhase
  readonly receivedBytes?: number
  readonly totalBytes?: number
}

export type RuntimeResolutionErrorCode =
  | 'runtime_cancelled'
  | 'runtime_incompatible'
  | 'runtime_network_unavailable'
  | 'runtime_access_denied'
  | 'runtime_release_unavailable'
  | 'runtime_integrity_failed'
  | 'runtime_archive_unsafe'
  | 'runtime_storage_unavailable'
  | 'runtime_cache_unsafe'
  | 'runtime_recovery_required'

export type RuntimeResolutionError = {
  readonly code: RuntimeResolutionErrorCode
  readonly retryable: boolean
  readonly remediation: string
}

export type VerifiedRuntime = {
  readonly runtimeRoot: string
  readonly identity: {
    readonly releaseId: string
    readonly target: 'darwin-arm64'
    readonly runtimeContractVersion: number
    readonly nativeCodexVersion: string
    readonly pythonVersion: string
    readonly sourceCommit: string
    readonly patchStackSha256: string
  }
}

export interface RuntimeResolver {
  resolve(input: {
    readonly appDataRoot: string
    readonly signal: AbortSignal
    readonly report: (progress: RuntimeResolveProgress) => void
  }): Promise<VerifiedRuntime>
}

export class RuntimeReleaseContractError extends TypeError {
  constructor() {
    super('The Runtime release descriptor is invalid.')
    this.name = 'RuntimeReleaseContractError'
  }
}

export function decodeRuntimeReleaseDescriptor(
  value: unknown,
): RuntimeReleaseDescriptor {
  if (!isExactObject(value, [
    'archive',
    'distribution',
    'launcher',
    'manifest',
    'runtime',
    'schemaVersion',
  ]) || value.schemaVersion !== 1) {
    throw invalidDescriptor()
  }
  const launcher = decodeLauncher(value.launcher)
  const distribution = decodeDistribution(value.distribution)
  const runtime = decodeRuntime(value.runtime)
  const archive = decodeArchive(value.archive)
  const manifest = decodeManifest(value.manifest)
  if (
    !archive.url.startsWith(`${distribution.repository}/releases/download/`) ||
    !archive.url.includes(`/${distribution.runtimeAssetReleaseTag}/`) ||
    !archive.url.endsWith(`/${archive.assetName}`)
  ) {
    throw invalidDescriptor()
  }
  return {
    schemaVersion: 1,
    launcher,
    distribution,
    runtime,
    archive,
    manifest,
  }
}

function decodeLauncher(
  value: unknown,
): RuntimeReleaseDescriptor['launcher'] {
  if (
    !isExactObject(value, ['packageName', 'version']) ||
    value.packageName !== 'ay-ple' ||
    !isExactSemver(value.version)
  ) {
    throw invalidDescriptor()
  }
  return { packageName: 'ay-ple', version: value.version }
}

function decodeDistribution(
  value: unknown,
): RuntimeReleaseDescriptor['distribution'] {
  if (
    !isExactObject(value, [
      'applicationReleaseTag',
      'repository',
      'runtimeAssetReleaseTag',
    ]) ||
    !isGitHubRepositoryUrl(value.repository) ||
    !isNonEmptyString(value.applicationReleaseTag) ||
    !isNonEmptyString(value.runtimeAssetReleaseTag)
  ) {
    throw invalidDescriptor()
  }
  return {
    repository: value.repository,
    applicationReleaseTag: value.applicationReleaseTag,
    runtimeAssetReleaseTag: value.runtimeAssetReleaseTag,
  }
}

function decodeRuntime(
  value: unknown,
): RuntimeReleaseDescriptor['runtime'] {
  if (
    !isExactObject(value, [
      'releaseId',
      'runtimeContractVersion',
      'target',
    ]) ||
    !isExactSemver(value.releaseId) ||
    value.target !== 'darwin-arm64' ||
    !isPositiveSafeInteger(value.runtimeContractVersion)
  ) {
    throw invalidDescriptor()
  }
  return {
    releaseId: value.releaseId,
    target: 'darwin-arm64',
    runtimeContractVersion: value.runtimeContractVersion,
  }
}

function decodeArchive(
  value: unknown,
): RuntimeReleaseDescriptor['archive'] {
  if (
    !isExactObject(value, [
      'assetName',
      'bytes',
      'format',
      'sha256',
      'url',
    ]) ||
    value.format !== 'ay-ple-runtime-tar-gzip-v1' ||
    !isSafeAssetName(value.assetName) ||
    !isHttpsUrl(value.url) ||
    !isPositiveSafeInteger(value.bytes) ||
    !isSha256(value.sha256)
  ) {
    throw invalidDescriptor()
  }
  return {
    format: 'ay-ple-runtime-tar-gzip-v1',
    assetName: value.assetName,
    url: value.url,
    bytes: value.bytes,
    sha256: value.sha256,
  }
}

function decodeManifest(
  value: unknown,
): RuntimeReleaseDescriptor['manifest'] {
  if (
    !isExactObject(value, [
      'bytes',
      'packageResource',
      'schemaVersion',
      'sha256',
    ]) ||
    !isSafeRelativeResource(value.packageResource) ||
    value.schemaVersion !== 2 ||
    !isPositiveSafeInteger(value.bytes) ||
    !isSha256(value.sha256)
  ) {
    throw invalidDescriptor()
  }
  return {
    packageResource: value.packageResource,
    schemaVersion: 2,
    bytes: value.bytes,
    sha256: value.sha256,
  }
}

function isExactObject(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isExactSemver(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$/.test(value)
  )
}

function isGitHubRepositoryUrl(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(value)
  )
}

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

function isSafeAssetName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('/') &&
    !value.includes('\\')
  )
}

function isSafeRelativeResource(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.split('/').includes('..') &&
    !value.includes('\\')
  )
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function invalidDescriptor(): RuntimeReleaseContractError {
  return new RuntimeReleaseContractError()
}
