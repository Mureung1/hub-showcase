import { execFile as nodeExecFile } from 'node:child_process'
import {
  lstat,
  realpath,
} from 'node:fs/promises'
import path from 'node:path'

import type {
  ApplicationCompatibilityDescriptor,
  ApplicationPreflightFailureCode,
  SupportedBrowserDescriptor,
} from './host-contract.js'

const probeOutputByteLimit = 4096
const probeTimeoutMs = 5000

export type BrowserCandidateInspection =
  | { readonly status: 'absent' }
  | { readonly status: 'invalid' }
  | {
      readonly status: 'found'
      readonly canonicalPath: string
      readonly bundleId: string
      readonly version: string
    }

export type CompatibilityPreflightReady = {
  readonly status: 'ready'
  readonly discovered: {
    readonly os: 'darwin'
    readonly arch: 'arm64'
    readonly macosVersion: string
    readonly nodeVersion: string
    readonly npmVersion: string
    readonly browser: {
      readonly name: 'Google Chrome' | 'Chromium'
      readonly bundleId:
        | 'com.google.Chrome'
        | 'org.chromium.Chromium'
      readonly version: string
      readonly canonicalPath: string
    }
  }
}

export type CompatibilityPreflightBlocked = {
  readonly status: 'blocked'
  readonly code: Extract<
    ApplicationPreflightFailureCode,
    | 'unsupported_platform'
    | 'unsupported_architecture'
    | 'unsupported_macos'
    | 'unsupported_node'
    | 'unsupported_npm'
    | 'unsupported_browser'
  >
  readonly found: string
  readonly supported: string
  readonly remediation: string
}

export type CompatibilityPreflightResult =
  | CompatibilityPreflightReady
  | CompatibilityPreflightBlocked

export type CompatibilityPreflightDependencies = {
  readonly platform: string
  readonly arch: string
  readonly nodeVersion: string
  readonly npmUserAgent: string | undefined
  readonly execFile: (
    executable: string,
    args: readonly string[],
    signal: AbortSignal,
  ) => Promise<string>
  readonly inspectBrowserCandidate: (input: {
    readonly browser: SupportedBrowserDescriptor
    readonly candidate: string
    readonly signal: AbortSignal
  }) => Promise<BrowserCandidateInspection>
}

type BrowserInspectionHooks = {
  readonly execFile: (
    executable: string,
    args: readonly string[],
    signal: AbortSignal,
  ) => Promise<string>
  readonly afterPlistRead?: () => void | Promise<void>
}

export async function runCompatibilityPreflight(input: {
  readonly descriptor: ApplicationCompatibilityDescriptor
  readonly userHome: string
  readonly signal: AbortSignal
}): Promise<CompatibilityPreflightResult> {
  return runCompatibilityPreflightForTesting(input, {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.versions.node,
    npmUserAgent: process.env.npm_config_user_agent,
    execFile: executeAbsoluteFile,
    inspectBrowserCandidate: ({ candidate, signal }) =>
      inspectBrowserBundleForTesting(
        { candidate, signal },
        { execFile: executeAbsoluteFile },
      ),
  })
}

/**
 * Source-internal probe seam. Package-root exports never expose probe
 * dependencies or raw discovered Browser paths.
 */
export async function runCompatibilityPreflightForTesting(
  input: {
    readonly descriptor: ApplicationCompatibilityDescriptor
    readonly userHome: string
    readonly signal: AbortSignal
  },
  dependencies: CompatibilityPreflightDependencies,
): Promise<CompatibilityPreflightResult> {
  const descriptor = snapshotDescriptor(input.descriptor)
  const userHome = snapshotUserHome(input.userHome)
  const signal = input.signal
  const platform = dependencies.platform
  const arch = dependencies.arch
  const nodeVersion = dependencies.nodeVersion
  const npmUserAgent = dependencies.npmUserAgent
  const execFile = dependencies.execFile.bind(dependencies)
  const inspectBrowserCandidate =
    dependencies.inspectBrowserCandidate.bind(dependencies)

  if (!matchesStandardBrowserLocations(descriptor)) {
    return blocked(
      'unsupported_browser',
      'package Browser location policy mismatch',
      descriptor.browsers
        .map((browser) => `${browser.name}의 표준 Applications 위치`)
        .join(' 또는 '),
      'AY-PLE package를 다시 설치하세요.',
    )
  }
  if (userHome === '') {
    return blocked(
      'unsupported_browser',
      'OS user home을 확인할 수 없음',
      'OS user record의 absolute home',
      '현재 macOS user account를 확인한 뒤 다시 실행하세요.',
    )
  }
  if (platform !== descriptor.platform.os) {
    return blocked(
      'unsupported_platform',
      safeFound(platform),
      descriptor.platform.os,
      '지원되는 Apple Silicon Mac에서 실행하세요.',
    )
  }
  if (arch !== descriptor.platform.arch) {
    return blocked(
      'unsupported_architecture',
      safeFound(arch),
      descriptor.platform.arch,
      'arm64 Node를 사용해 다시 실행하세요.',
    )
  }

  let macosOutput: string
  try {
    macosOutput = await execFile(
      '/usr/bin/sw_vers',
      ['-productVersion'],
      signal,
    )
  } catch {
    return blocked(
      'unsupported_macos',
      '확인할 수 없음',
      `macOS ${descriptor.platform.minimumMacosVersion} 이상`,
      'macOS version을 확인한 뒤 다시 실행하세요.',
    )
  }
  const macosVersion = exactDottedVersion(macosOutput)
  if (
    !macosVersion ||
    compareVersions(
      macosVersion,
      descriptor.platform.minimumMacosVersion,
    ) < 0
  ) {
    return blocked(
      'unsupported_macos',
      macosVersion ?? '확인할 수 없음',
      `macOS ${descriptor.platform.minimumMacosVersion} 이상`,
      'macOS를 업데이트한 뒤 다시 실행하세요.',
    )
  }

  const exactNodeVersion = exactSemver(nodeVersion)
  if (
    !exactNodeVersion ||
    !isVersionInRange(
      exactNodeVersion,
      descriptor.node.range,
    )
  ) {
    return blocked(
      'unsupported_node',
      exactNodeVersion ?? '확인할 수 없음',
      descriptor.node.range,
      `Node ${descriptor.node.range} 조건으로 다시 실행하세요.`,
    )
  }

  const npmVersion = exactNpmVersion(npmUserAgent)
  if (
    !npmVersion ||
    !isVersionInRange(npmVersion, descriptor.npm.range)
  ) {
    return blocked(
      'unsupported_npm',
      npmVersion ?? 'npm 실행 정보를 확인할 수 없음',
      descriptor.npm.range,
      `npm ${descriptor.npm.range}의 exact npx command로 다시 실행하세요.`,
    )
  }

  const foundBrowsers: string[] = []
  for (const browser of descriptor.browsers) {
    for (const candidate of browserCandidates(browser, userHome)) {
      let inspection: BrowserCandidateInspection
      try {
        inspection = await inspectBrowserCandidate({
          browser,
          candidate,
          signal,
        })
      } catch {
        inspection = { status: 'invalid' }
      }
      if (inspection.status === 'absent') continue
      if (inspection.status === 'invalid') {
        foundBrowsers.push(`${browser.name} 확인 실패`)
        continue
      }
      const browserVersion = exactDottedVersion(inspection.version)
      if (browserVersion) {
        foundBrowsers.push(`${browser.name} ${browserVersion}`)
      } else {
        foundBrowsers.push(`${browser.name} version 확인 실패`)
      }
      if (
        inspection.canonicalPath !== candidate ||
        inspection.bundleId !== browser.bundleId ||
        !browserVersion ||
        Number(browserVersion.split('.')[0]) < browser.minimumMajor
      ) {
        continue
      }
      return {
        status: 'ready',
        discovered: {
          os: descriptor.platform.os,
          arch: descriptor.platform.arch,
          macosVersion,
          nodeVersion: exactNodeVersion,
          npmVersion,
          browser: {
            name: browser.name,
            bundleId: browser.bundleId,
            version: browserVersion,
            canonicalPath: inspection.canonicalPath,
          },
        },
      }
    }
  }
  return blocked(
    'unsupported_browser',
    foundBrowsers.length > 0
      ? foundBrowsers.join(', ')
      : '설치된 지원 Browser 없음',
    descriptor.browsers
      .map((browser) => `${browser.name} ${browser.minimumMajor}+`)
      .join(' 또는 '),
    '지원되는 최신 Chrome 또는 Chromium을 설치하세요.',
  )
}

/**
 * `CFBundleIdentifier` and version are compatibility hints, not code
 * signature or application authenticity attestation. H1d must revalidate
 * the same canonical path immediately before Browser open.
 */
export async function inspectBrowserBundleForTesting(
  input: {
    readonly candidate: string
    readonly signal: AbortSignal
  },
  hooks: BrowserInspectionHooks,
): Promise<BrowserCandidateInspection> {
  const candidate = input.candidate
  if (
    typeof candidate !== 'string' ||
    !path.isAbsolute(candidate) ||
    path.normalize(candidate) !== candidate ||
    !candidate.endsWith('.app')
  ) {
    return { status: 'invalid' }
  }
  let initialBundle
  try {
    initialBundle = await lstat(candidate, { bigint: true })
  } catch (error) {
    return isMissing(error)
      ? { status: 'absent' }
      : { status: 'invalid' }
  }
  try {
    if (
      initialBundle.isSymbolicLink() ||
      !initialBundle.isDirectory()
    ) {
      return { status: 'invalid' }
    }
    await requireNoSymlinkPath(candidate, 'directory')
    if ((await realpath(candidate)) !== candidate) {
      return { status: 'invalid' }
    }
    const plist = path.join(candidate, 'Contents', 'Info.plist')
    await requireNoSymlinkPath(plist, 'file')
    const initialPlist = await lstat(plist, { bigint: true })
    if (
      initialPlist.isSymbolicLink() ||
      !initialPlist.isFile()
    ) {
      return { status: 'invalid' }
    }
    const bundleId = exactProbeText(
      await hooks.execFile(
        '/usr/bin/plutil',
        [
          '-extract',
          'CFBundleIdentifier',
          'raw',
          '-expect',
          'string',
          plist,
        ],
        input.signal,
      ),
    )
    const version = exactProbeText(
      await hooks.execFile(
        '/usr/bin/plutil',
        [
          '-extract',
          'CFBundleShortVersionString',
          'raw',
          '-expect',
          'string',
          plist,
        ],
        input.signal,
      ),
    )
    await hooks.afterPlistRead?.()
    const finalBundle = await lstat(candidate, { bigint: true })
    const finalPlist = await lstat(plist, { bigint: true })
    await requireNoSymlinkPath(candidate, 'directory')
    await requireNoSymlinkPath(plist, 'file')
    if (
      !bundleId ||
      !version ||
      !sameFileIdentity(initialBundle, finalBundle) ||
      !sameFileIdentity(initialPlist, finalPlist) ||
      (await realpath(candidate)) !== candidate
    ) {
      return { status: 'invalid' }
    }
    return {
      status: 'found',
      canonicalPath: candidate,
      bundleId,
      version,
    }
  } catch {
    return { status: 'invalid' }
  }
}

function snapshotDescriptor(
  descriptor: ApplicationCompatibilityDescriptor,
): ApplicationCompatibilityDescriptor {
  try {
    return structuredClone(descriptor)
  } catch {
    return {
      schemaVersion: 1,
      application: { packageName: 'ay-ple', version: '' },
      platform: {
        os: 'darwin',
        arch: 'arm64',
        minimumMacosVersion: '',
      },
      node: { range: '>=22.12 <23' },
      npm: { range: '>=10 <11' },
      browsers: [],
      workspaceBundle: {
        descriptorResource: '',
        descriptorSha256: '',
      },
    }
  }
}

function snapshotUserHome(value: string): string {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return ''
  }
  return path.normalize(value)
}

function matchesStandardBrowserLocations(
  descriptor: ApplicationCompatibilityDescriptor,
): boolean {
  return descriptor.browsers.every((browser) => {
    const applicationName = `${browser.name}.app`
    return (
      browser.candidateLocations.system ===
        `/Applications/${applicationName}` &&
      browser.candidateLocations.userHomeRelative ===
        `Applications/${applicationName}`
    )
  })
}

function browserCandidates(
  browser: SupportedBrowserDescriptor,
  userHome: string,
): readonly string[] {
  return [
    browser.candidateLocations.system,
    path.join(
      userHome,
      ...browser.candidateLocations.userHomeRelative.split('/'),
    ),
  ]
}

function exactNpmVersion(userAgent: string | undefined): string | null {
  // npm_config_user_agent is a launch compatibility hint. It is spoofable
  // and never acts as package-manager or publisher attestation.
  if (typeof userAgent !== 'string') return null
  const versions = userAgent
    .split(/\s+/u)
    .map((token) =>
      /^npm\/([0-9]+\.[0-9]+\.[0-9]+)$/u.exec(token)?.[1],
    )
    .filter((version): version is string => version !== undefined)
  return versions.length === 1 ? versions[0]! : null
}

function exactSemver(value: string): string | null {
  return /^[0-9]+\.[0-9]+\.[0-9]+$/u.test(value)
    ? value
    : null
}

function isVersionInRange(
  version: string,
  range: string,
): boolean {
  const match =
    /^>=([0-9]+(?:\.[0-9]+){0,2}) <([0-9]+(?:\.[0-9]+){0,2})$/u.exec(
      range,
    )
  if (!match) return false
  const minimum = normalizeVersionBound(match[1]!)
  const maximum = normalizeVersionBound(match[2]!)
  return (
    compareVersions(version, minimum) >= 0 &&
    compareVersions(version, maximum) < 0
  )
}

function normalizeVersionBound(value: string): string {
  return [...value.split('.'), '0', '0'].slice(0, 3).join('.')
}

function exactDottedVersion(value: string): string | null {
  const normalized = exactProbeText(value)
  return normalized &&
    /^[0-9]+(?:\.[0-9]+)+$/u.test(normalized)
    ? normalized
    : null
}

function exactProbeText(value: string): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return (
    normalized.length > 0 &&
    Buffer.byteLength(normalized, 'utf8') <= 512 &&
    !/[\u0000-\u001f\u007f]/u.test(normalized)
  )
    ? normalized
    : null
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split('.').map(Number)
  const rightParts = right.split('.').map(Number)
  const length = Math.max(leftParts.length, rightParts.length)
  for (let index = 0; index < length; index += 1) {
    const difference =
      (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

async function requireNoSymlinkPath(
  target: string,
  finalType: 'directory' | 'file',
): Promise<void> {
  const parsed = path.parse(target)
  const segments = target
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean)
  let current = parsed.root
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]!)
    const stat = await lstat(current, { bigint: true })
    const final = index === segments.length - 1
    if (
      stat.isSymbolicLink() ||
      (!final && !stat.isDirectory()) ||
      (final && finalType === 'directory' && !stat.isDirectory()) ||
      (final && finalType === 'file' && !stat.isFile())
    ) {
      throw new Error('unsafe Browser path')
    }
  }
}

function sameFileIdentity(
  left: Awaited<ReturnType<typeof lstat>>,
  right: Awaited<ReturnType<typeof lstat>>,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs &&
    left.ctimeMs === right.ctimeMs
  )
}

function executeAbsoluteFile(
  executable: string,
  args: readonly string[],
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    nodeExecFile(
      executable,
      [...args],
      {
        encoding: 'utf8',
        env: {},
        maxBuffer: probeOutputByteLimit,
        signal,
        timeout: probeTimeoutMs,
        windowsHide: true,
      },
      (error, stdout) => {
        if (error) {
          reject(error)
          return
        }
        resolve(stdout)
      },
    )
  })
}

function safeFound(value: string): string {
  return typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= 128 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : '확인할 수 없음'
}

function blocked(
  code: CompatibilityPreflightBlocked['code'],
  found: string,
  supported: string,
  remediation: string,
): CompatibilityPreflightBlocked {
  return {
    status: 'blocked',
    code,
    found,
    supported,
    remediation,
  }
}

function isMissing(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  )
}
