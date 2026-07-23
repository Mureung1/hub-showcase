export type LandingReleaseLink = {
  readonly url: string
}

export type LandingReleaseDisplay = {
  readonly schemaVersion: 1
  readonly release: {
    readonly channel: 'public-preview'
    readonly packageName: 'ay-ple'
    readonly applicationVersion: string
    readonly applicationReleaseTag: string
    readonly exactCommand: string
  }
  readonly runtime: {
    readonly applicationVersion: string
    readonly releaseId: string
    readonly firstDownloadBytes: number
    readonly installedRegularBytes: number
    readonly conservativeFreeSpaceBytes: number
    readonly cacheDisplayLocation: string
  }
  readonly compatibility: {
    readonly applicationVersion: string
    readonly platformLabel: string
    readonly minimumMacosVersion: string
    readonly nodeRange: string
    readonly npmRange: string
    readonly browsers: readonly {
      readonly name: string
      readonly minimumMajor: number
    }[]
    readonly networkLabels: readonly string[]
    readonly accountLabel: string
  }
  readonly links: {
    readonly applicationVersion: string
    readonly docs: LandingReleaseLink
    readonly github: LandingReleaseLink
    readonly releaseEvidence: LandingReleaseLink
    readonly privacy: LandingReleaseLink
    readonly security: LandingReleaseLink
    readonly license: LandingReleaseLink
    readonly notice: LandingReleaseLink
    readonly thirdPartyNotices: LandingReleaseLink
  }
  readonly rollback:
    | null
    | {
        readonly status: 'still-supported'
        readonly applicationVersion: string
        readonly exactCommand: string
        readonly releaseEvidence: LandingReleaseLink
      }
}

export class LandingReleaseDisplayError extends TypeError {
  constructor() {
    super('The Landing release display artifact is invalid.')
    this.name = 'LandingReleaseDisplayError'
  }
}

export function decodeLandingReleaseDisplay(
  value: unknown,
): LandingReleaseDisplay {
  if (
    !isExactObject(value, [
      'compatibility',
      'links',
      'release',
      'rollback',
      'runtime',
      'schemaVersion',
    ]) ||
    value.schemaVersion !== 1
  ) {
    throw invalidDisplay()
  }

  const release = decodeRelease(value.release)
  const runtime = decodeRuntime(value.runtime)
  const compatibility = decodeCompatibility(value.compatibility)
  const links = decodeLinks(value.links)
  const rollback = decodeRollback(value.rollback, release.applicationVersion)

  if (
    runtime.applicationVersion !== release.applicationVersion ||
    compatibility.applicationVersion !== release.applicationVersion ||
    links.applicationVersion !== release.applicationVersion
  ) {
    throw invalidDisplay()
  }

  return {
    schemaVersion: 1,
    release,
    runtime,
    compatibility,
    links,
    rollback,
  }
}

function decodeRelease(
  value: unknown,
): LandingReleaseDisplay['release'] {
  if (
    !isExactObject(value, [
      'applicationReleaseTag',
      'applicationVersion',
      'channel',
      'exactCommand',
      'packageName',
    ]) ||
    value.channel !== 'public-preview' ||
    value.packageName !== 'ay-ple' ||
    !isExactSemver(value.applicationVersion)
  ) {
    throw invalidDisplay()
  }

  const applicationVersion = value.applicationVersion
  if (
    value.applicationReleaseTag !== `v${applicationVersion}` ||
    value.exactCommand !== `npx ay-ple@${applicationVersion}`
  ) {
    throw invalidDisplay()
  }

  return {
    channel: 'public-preview',
    packageName: 'ay-ple',
    applicationVersion,
    applicationReleaseTag: `v${applicationVersion}`,
    exactCommand: `npx ay-ple@${applicationVersion}`,
  }
}

function decodeRuntime(
  value: unknown,
): LandingReleaseDisplay['runtime'] {
  if (
    !isExactObject(value, [
      'applicationVersion',
      'cacheDisplayLocation',
      'conservativeFreeSpaceBytes',
      'firstDownloadBytes',
      'installedRegularBytes',
      'releaseId',
    ]) ||
    !isExactSemver(value.applicationVersion) ||
    !isExactSemver(value.releaseId) ||
    !isPositiveSafeInteger(value.firstDownloadBytes) ||
    !isPositiveSafeInteger(value.installedRegularBytes) ||
    !isPositiveSafeInteger(value.conservativeFreeSpaceBytes) ||
    !isSafeDisplayPath(value.cacheDisplayLocation)
  ) {
    throw invalidDisplay()
  }

  const minimumBound =
    Number(value.firstDownloadBytes) + Number(value.installedRegularBytes)
  if (Number(value.conservativeFreeSpaceBytes) < minimumBound) {
    throw invalidDisplay()
  }

  return {
    applicationVersion: value.applicationVersion,
    releaseId: value.releaseId,
    firstDownloadBytes: Number(value.firstDownloadBytes),
    installedRegularBytes: Number(value.installedRegularBytes),
    conservativeFreeSpaceBytes: Number(value.conservativeFreeSpaceBytes),
    cacheDisplayLocation: value.cacheDisplayLocation,
  }
}

function decodeCompatibility(
  value: unknown,
): LandingReleaseDisplay['compatibility'] {
  if (
    !isExactObject(value, [
      'accountLabel',
      'applicationVersion',
      'browsers',
      'minimumMacosVersion',
      'networkLabels',
      'nodeRange',
      'npmRange',
      'platformLabel',
    ]) ||
    !isExactSemver(value.applicationVersion) ||
    !isMeaningfulText(value.platformLabel, 80) ||
    !isDottedVersion(value.minimumMacosVersion) ||
    !isMeaningfulText(value.nodeRange, 80) ||
    !isMeaningfulText(value.npmRange, 80) ||
    !isMeaningfulText(value.accountLabel, 160)
  ) {
    throw invalidDisplay()
  }

  const browsers = decodeBrowsers(value.browsers)
  const networkLabels = decodeTextList(value.networkLabels, 1, 8, 80)

  return {
    applicationVersion: value.applicationVersion,
    platformLabel: value.platformLabel,
    minimumMacosVersion: value.minimumMacosVersion,
    nodeRange: value.nodeRange,
    npmRange: value.npmRange,
    browsers,
    networkLabels,
    accountLabel: value.accountLabel,
  }
}

function decodeBrowsers(
  value: unknown,
): LandingReleaseDisplay['compatibility']['browsers'] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 4) {
    throw invalidDisplay()
  }

  const names = new Set<string>()
  const browsers = value.map((entry) => {
    if (
      !isExactObject(entry, ['minimumMajor', 'name']) ||
      !isMeaningfulText(entry.name, 80) ||
      !isPositiveSafeInteger(entry.minimumMajor) ||
      names.has(entry.name)
    ) {
      throw invalidDisplay()
    }
    names.add(entry.name)
    return {
      name: entry.name,
      minimumMajor: Number(entry.minimumMajor),
    }
  })
  return browsers
}

function decodeLinks(value: unknown): LandingReleaseDisplay['links'] {
  if (
    !isExactObject(value, [
      'applicationVersion',
      'docs',
      'github',
      'license',
      'notice',
      'privacy',
      'releaseEvidence',
      'security',
      'thirdPartyNotices',
    ]) ||
    !isExactSemver(value.applicationVersion)
  ) {
    throw invalidDisplay()
  }

  return {
    applicationVersion: value.applicationVersion,
    docs: decodeLink(value.docs),
    github: decodeLink(value.github),
    releaseEvidence: decodeLink(value.releaseEvidence),
    privacy: decodeLink(value.privacy),
    security: decodeLink(value.security),
    license: decodeLink(value.license),
    notice: decodeLink(value.notice),
    thirdPartyNotices: decodeLink(value.thirdPartyNotices),
  }
}

function decodeLink(value: unknown): LandingReleaseLink {
  if (!isExactObject(value, ['url']) || !isCanonicalHttpsUrl(value.url)) {
    throw invalidDisplay()
  }
  return { url: value.url }
}

function decodeRollback(
  value: unknown,
  currentApplicationVersion: string,
): LandingReleaseDisplay['rollback'] {
  if (value === null) return null
  if (
    !isExactObject(value, [
      'applicationVersion',
      'exactCommand',
      'releaseEvidence',
      'status',
    ]) ||
    value.status !== 'still-supported' ||
    !isExactSemver(value.applicationVersion) ||
    value.applicationVersion === currentApplicationVersion ||
    value.exactCommand !== `npx ay-ple@${value.applicationVersion}`
  ) {
    throw invalidDisplay()
  }

  return {
    status: 'still-supported',
    applicationVersion: value.applicationVersion,
    exactCommand: value.exactCommand,
    releaseEvidence: decodeLink(value.releaseEvidence),
  }
}

function decodeTextList(
  value: unknown,
  minimum: number,
  maximum: number,
  maximumLength: number,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    throw invalidDisplay()
  }
  const values = value.map((entry) => {
    if (!isMeaningfulText(entry, maximumLength)) throw invalidDisplay()
    return entry
  })
  if (new Set(values).size !== values.length) throw invalidDisplay()
  return values
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
    /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.test(
      value,
    )
  )
}

function isDottedVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^(?:0|[1-9][0-9]*)(?:\.(?:0|[1-9][0-9]*))+$/u.test(value)
  )
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0
}

function isMeaningfulText(
  value: unknown,
  maximumLength: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= maximumLength &&
    value.trim() === value &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  )
}

function isSafeDisplayPath(value: unknown): value is string {
  if (!isMeaningfulText(value, 240) || !value.startsWith('~/')) return false
  const components = value.slice(2).split('/')
  return (
    components.length > 0 &&
    components.every(
      (component) =>
        component.length > 0 && component !== '.' && component !== '..',
    )
  )
}

function isCanonicalHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  return (
    parsed.protocol === 'https:' &&
    parsed.hostname.length > 0 &&
    parsed.username === '' &&
    parsed.password === '' &&
    parsed.port === '' &&
    parsed.search === '' &&
    parsed.hash === ''
  )
}

function invalidDisplay(): LandingReleaseDisplayError {
  return new LandingReleaseDisplayError()
}
