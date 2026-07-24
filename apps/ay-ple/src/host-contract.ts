export type SupportedBrowserDescriptor = {
  readonly name: 'Google Chrome' | 'Chromium'
  readonly bundleId: 'com.google.Chrome' | 'org.chromium.Chromium'
  readonly candidateLocations: {
    readonly system: string
    readonly userHomeRelative: string
  }
  readonly minimumMajor: number
}

export type ApplicationCompatibilityDescriptor = {
  readonly schemaVersion: 1
  readonly application: {
    readonly packageName: 'ay-ple'
    readonly version: string
  }
  readonly platform: {
    readonly os: 'darwin'
    readonly arch: 'arm64'
    readonly minimumMacosVersion: string
  }
  readonly node: {
    readonly range: '>=22.12 <23'
  }
  readonly npm: {
    readonly range: '>=10 <11'
  }
  readonly browsers: readonly SupportedBrowserDescriptor[]
  readonly workspaceBundle: {
    readonly descriptorResource: string
    readonly descriptorSha256: string
  }
}

export type ApplicationRoots = {
  readonly packageRoot: string
  readonly appDataRoot: string
  readonly workspaceRoot: string | null
}

export type ApplicationPreflightFailureCode =
  | 'unsupported_platform'
  | 'unsupported_architecture'
  | 'unsupported_macos'
  | 'unsupported_node'
  | 'unsupported_npm'
  | 'unsupported_browser'
  | 'unsafe_package_root'
  | 'unsafe_app_data_root'
  | 'overlapping_roots'
  | 'package_integrity_failed'

export type ApplicationPreflightResult<TBrowser> =
  | {
      readonly status: 'ready'
      readonly browser: TBrowser
    }
  | {
      readonly status: 'blocked'
      readonly code: ApplicationPreflightFailureCode
      readonly remediation: string
    }

export type DynamicLocalOrigin = `http://127.0.0.1:${number}`

export type ApplicationReadiness =
  | { readonly status: 'starting' }
  | {
      readonly status: 'ready'
      readonly origin: DynamicLocalOrigin
    }
  | {
      readonly status: 'failed'
      readonly code: string
    }

export type ApplicationCloseResult =
  | {
      readonly status: 'closed'
      readonly listenerClosed: true
      readonly runtimeClosed: true
    }
  | {
      readonly status: 'ambiguous'
      readonly listenerClosed: boolean
      readonly runtimeClosed: boolean
    }

export interface ListenerIndependentApplication<TRequestHandler> {
  readonly requestHandler: TRequestHandler
  readiness(): ApplicationReadiness
  close(input: { readonly signal: AbortSignal }): Promise<ApplicationCloseResult>
}

export type SingleInstanceResult<TPrimaryLease> =
  | {
      readonly status: 'primary'
      readonly lease: TPrimaryLease
    }
  | {
      readonly status: 'secondary'
      readonly origin: DynamicLocalOrigin
      readonly authenticated: true
    }
  | {
      readonly status: 'recovery_required'
      readonly remediation: string
    }

export interface ForegroundApplicationHost {
  run(input: { readonly signal: AbortSignal }): Promise<number>
}

export class ApplicationCompatibilityContractError extends TypeError {
  constructor() {
    super('The application compatibility descriptor is invalid.')
    this.name = 'ApplicationCompatibilityContractError'
  }
}

export function decodeApplicationCompatibilityDescriptor(
  value: unknown,
): ApplicationCompatibilityDescriptor {
  if (
    !isExactObject(value, [
      'application',
      'browsers',
      'node',
      'npm',
      'platform',
      'schemaVersion',
      'workspaceBundle',
    ]) ||
    value.schemaVersion !== 1
  ) {
    throw invalidCompatibility()
  }
  const application = decodeApplication(value.application)
  const platform = decodePlatform(value.platform)
  const node = decodeFixedRange(value.node, '>=22.12 <23')
  const npm = decodeFixedRange(value.npm, '>=10 <11')
  const browsers = decodeBrowsers(value.browsers)
  const workspaceBundle = decodeWorkspaceBundleBinding(
    value.workspaceBundle,
  )
  return {
    schemaVersion: 1,
    application,
    platform,
    node,
    npm,
    browsers,
    workspaceBundle,
  }
}

function decodeApplication(
  value: unknown,
): ApplicationCompatibilityDescriptor['application'] {
  if (
    !isExactObject(value, ['packageName', 'version']) ||
    value.packageName !== 'ay-ple' ||
    !isExactSemver(value.version)
  ) {
    throw invalidCompatibility()
  }
  return { packageName: 'ay-ple', version: value.version }
}

function decodePlatform(
  value: unknown,
): ApplicationCompatibilityDescriptor['platform'] {
  if (
    !isExactObject(value, [
      'arch',
      'minimumMacosVersion',
      'os',
    ]) ||
    value.os !== 'darwin' ||
    value.arch !== 'arm64' ||
    !isDottedVersion(value.minimumMacosVersion)
  ) {
    throw invalidCompatibility()
  }
  return {
    os: 'darwin',
    arch: 'arm64',
    minimumMacosVersion: value.minimumMacosVersion,
  }
}

function decodeFixedRange<T extends '>=22.12 <23' | '>=10 <11'>(
  value: unknown,
  expected: T,
): { readonly range: T } {
  if (!isExactObject(value, ['range']) || value.range !== expected) {
    throw invalidCompatibility()
  }
  return { range: expected }
}

function decodeBrowsers(
  value: unknown,
): readonly SupportedBrowserDescriptor[] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw invalidCompatibility()
  }
  const browsers = value.map(decodeBrowser)
  if (
    browsers[0]?.name !== 'Google Chrome' ||
    browsers[1]?.name !== 'Chromium'
  ) {
    throw invalidCompatibility()
  }
  return browsers
}

function decodeBrowser(value: unknown): SupportedBrowserDescriptor {
  if (
    !isExactObject(value, [
      'bundleId',
      'candidateLocations',
      'minimumMajor',
      'name',
    ]) ||
    !isExactObject(value.candidateLocations, [
      'system',
      'userHomeRelative',
    ]) ||
    !isAbsoluteApplicationPath(value.candidateLocations.system) ||
    !isUserHomeRelativeApplicationPath(
      value.candidateLocations.userHomeRelative,
    ) ||
    !Number.isSafeInteger(value.minimumMajor) ||
    Number(value.minimumMajor) < 1
  ) {
    throw invalidCompatibility()
  }
  if (
    (value.name === 'Google Chrome' &&
      value.bundleId === 'com.google.Chrome') ||
    (value.name === 'Chromium' &&
      value.bundleId === 'org.chromium.Chromium')
  ) {
    return {
      name: value.name,
      bundleId: value.bundleId,
      candidateLocations: {
        system: value.candidateLocations.system,
        userHomeRelative: value.candidateLocations.userHomeRelative,
      },
      minimumMajor: Number(value.minimumMajor),
    }
  }
  throw invalidCompatibility()
}

function decodeWorkspaceBundleBinding(
  value: unknown,
): ApplicationCompatibilityDescriptor['workspaceBundle'] {
  if (
    !isExactObject(value, [
      'descriptorResource',
      'descriptorSha256',
    ]) ||
    !isSafeRelativeResource(value.descriptorResource) ||
    !isSha256(value.descriptorSha256)
  ) {
    throw invalidCompatibility()
  }
  return {
    descriptorResource: value.descriptorResource,
    descriptorSha256: value.descriptorSha256,
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

function isDottedVersion(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]+(?:\.[0-9]+)+$/.test(value)
}

function isAbsoluteApplicationPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    value.endsWith('.app') &&
    !value.includes('/../')
  )
}

function isUserHomeRelativeApplicationPath(
  value: unknown,
): value is string {
  return (
    typeof value === 'string' &&
    !value.startsWith('/') &&
    value.startsWith('Applications/') &&
    value.endsWith('.app') &&
    !value.split('/').includes('..')
  )
}

function isSafeRelativeResource(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
  )
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function invalidCompatibility(): ApplicationCompatibilityContractError {
  return new ApplicationCompatibilityContractError()
}
