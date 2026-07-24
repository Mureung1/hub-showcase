import { createHash } from 'node:crypto'
import {
  constants as fsConstants,
  type BigIntStats,
} from 'node:fs'
import {
  lstat,
  open,
  readdir,
  realpath,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

import {
  decodeRuntimeReleaseDescriptor,
  type RuntimeReleaseDescriptor,
} from '@ay-ple/runtime-release'
import {
  captureWorkspaceBundleSourceAt,
  decodeWorkspaceBundleDescriptor,
  type VerifiedBundleSource,
} from '@ay-ple/semester-workspace'

import {
  decodeApplicationCompatibilityDescriptor,
  type ApplicationCompatibilityDescriptor,
} from './host-contract.js'

const packageDescriptorResource =
  'resources/package-resources.json'
const packageDescriptorByteLimit = 1024 * 1024
const smallDescriptorByteLimit = 1024 * 1024
const runtimeManifestByteLimit = 16 * 1024 * 1024
const staticFileByteLimit = 32 * 1024 * 1024
const staticSiteByteLimit = 128 * 1024 * 1024
const resourceModeMask = 0o777

type ResourceFileDescriptor = {
  readonly resource: string
  readonly type: 'file'
  readonly mode: '0644'
  readonly bytes: number
  readonly sha256: string
}

type StaticSiteEntryDescriptor = {
  readonly relativePath: string
  readonly type: 'file'
  readonly mode: '0644'
  readonly bytes: number
  readonly sha256: string
}

type PackageResourceDescriptor = {
  readonly schemaVersion: 1
  readonly compatibilityDescriptor: ResourceFileDescriptor
  readonly runtimeRelease: {
    readonly descriptor: ResourceFileDescriptor
    readonly canonicalManifest: ResourceFileDescriptor
  }
  readonly workspaceBundle: {
    readonly sourceRoot: string
    readonly descriptor: ResourceFileDescriptor
  }
  readonly staticSite: {
    readonly sourceRoot: string
    readonly entries: readonly StaticSiteEntryDescriptor[]
    readonly completeTreeSha256: string
  }
}

export type VerifiedStaticSite = {
  readonly entryPaths: readonly string[]
  readonly completeTreeSha256: string
  has(relativePath: string): boolean
  read(relativePath: string): Uint8Array | null
}

export type VerifiedPackageResources = {
  readonly packageRoot: string
  readonly compatibility: ApplicationCompatibilityDescriptor
  readonly compatibilityDescriptorSha256: string
  readonly runtime: {
    readonly descriptor: RuntimeReleaseDescriptor
    readonly releaseDescriptorSha256: string
    readonly canonicalManifestResource: string
    readonly canonicalManifestBytes: Uint8Array
  }
  readonly workspace: {
    readonly descriptorResource: string
    readonly source: VerifiedBundleSource
  }
  readonly staticSite: VerifiedStaticSite
}

type PackageResourceVerificationHooks = {
  readonly afterFileRead?: (resource: string) => void | Promise<void>
}

type FileIdentity = {
  readonly dev: bigint
  readonly ino: bigint
  readonly uid: bigint
  readonly mode: bigint
  readonly nlink: bigint
  readonly size: bigint
  readonly mtimeNs: bigint
  readonly ctimeNs: bigint
}

type RootAuthority = {
  readonly canonicalRoot: string
  readonly identity: FileIdentity
}

export class PackageResourceVerificationError extends Error {
  readonly code = 'package_integrity_failed'

  constructor() {
    super('The installed AY-PLE package resources could not be verified.')
    this.name = 'PackageResourceVerificationError'
  }
}

export async function verifyPackageResources(input: {
  readonly executableModuleUrl: string | URL
}): Promise<VerifiedPackageResources> {
  return verifyPackageResourcesForTesting(input, {})
}

/**
 * Source-internal race seam. The public package root does not export this
 * function or its hooks.
 */
export async function verifyPackageResourcesForTesting(
  input: {
    readonly executableModuleUrl: string | URL
  },
  hooks: PackageResourceVerificationHooks,
): Promise<VerifiedPackageResources> {
  try {
    const executableModuleUrl = snapshotModuleUrl(
      input.executableModuleUrl,
    )
    const authority = await packageRootFromExecutable(
      executableModuleUrl,
    )
    const packageDescriptorBytes = await readResourceFile({
      authority,
      descriptor: {
        resource: packageDescriptorResource,
        mode: '0644',
        bytes: null,
        sha256: null,
      },
      maximumBytes: packageDescriptorByteLimit,
      hooks,
    })
    const packageDescriptor = decodePackageResourceDescriptor(
      decodeJson(packageDescriptorBytes),
    )

    const compatibilityBytes = await readDeclaredResource(
      authority,
      packageDescriptor.compatibilityDescriptor,
      smallDescriptorByteLimit,
      hooks,
    )
    const compatibility = deepFreeze(
      decodeApplicationCompatibilityDescriptor(
        decodeJson(compatibilityBytes),
      ),
    )

    const runtimeDescriptorBytes = await readDeclaredResource(
      authority,
      packageDescriptor.runtimeRelease.descriptor,
      smallDescriptorByteLimit,
      hooks,
    )
    const runtimeDescriptor = deepFreeze(
      decodeRuntimeReleaseDescriptor(
        decodeJson(runtimeDescriptorBytes),
      ),
    )
    const canonicalManifestBytes = await readDeclaredResource(
      authority,
      packageDescriptor.runtimeRelease.canonicalManifest,
      runtimeManifestByteLimit,
      hooks,
    )
    requireRuntimeBinding(
      compatibility,
      runtimeDescriptor,
      packageDescriptor,
    )

    const workspaceDescriptorBytes = await readDeclaredResource(
      authority,
      packageDescriptor.workspaceBundle.descriptor,
      smallDescriptorByteLimit,
      hooks,
    )
    const workspaceDescriptor = decodeWorkspaceBundleDescriptor(
      decodeJson(workspaceDescriptorBytes),
    )
    requireWorkspaceDescriptorBinding(
      compatibility,
      packageDescriptor,
    )
    const workspaceSource = await captureWorkspaceBundleSourceAt(
      containedResourcePath(
        authority.canonicalRoot,
        packageDescriptor.workspaceBundle.sourceRoot,
      ),
    )
    if (
      workspaceSource.descriptorSha256 !==
        packageDescriptor.workspaceBundle.descriptor.sha256 ||
      workspaceSource.completeTreeSha256 !==
        workspaceDescriptor.completeTreeSha256 ||
      !isDeepStrictEqual(
        workspaceSource.descriptor,
        workspaceDescriptor,
      )
    ) {
      throw invalidPackage()
    }

    const staticSite = await captureStaticSite({
      authority,
      descriptor: packageDescriptor.staticSite,
      hooks,
    })
    await requireRootAuthority(authority)

    return Object.freeze({
      packageRoot: authority.canonicalRoot,
      compatibility,
      compatibilityDescriptorSha256:
        packageDescriptor.compatibilityDescriptor.sha256,
      runtime: Object.freeze({
        descriptor: runtimeDescriptor,
        releaseDescriptorSha256:
          packageDescriptor.runtimeRelease.descriptor.sha256,
        canonicalManifestResource:
          packageDescriptor.runtimeRelease.canonicalManifest.resource,
        canonicalManifestBytes: Uint8Array.from(
          canonicalManifestBytes,
        ),
      }),
      workspace: Object.freeze({
        descriptorResource:
          packageDescriptor.workspaceBundle.descriptor.resource,
        source: workspaceSource,
      }),
      staticSite,
    })
  } catch (error) {
    if (error instanceof PackageResourceVerificationError) throw error
    throw invalidPackage()
  }
}

function snapshotModuleUrl(value: string | URL): URL {
  const encoded = value instanceof URL ? value.href : value
  if (typeof encoded !== 'string') throw invalidPackage()
  let parsed: URL
  try {
    parsed = new URL(encoded)
  } catch {
    throw invalidPackage()
  }
  if (parsed.protocol !== 'file:') throw invalidPackage()
  return new URL(parsed.href)
}

async function packageRootFromExecutable(
  executableModuleUrl: URL,
): Promise<RootAuthority> {
  const executablePath = fileURLToPath(executableModuleUrl)
  const canonicalExecutable = await realpath(executablePath)
  const executableStat = await lstat(canonicalExecutable, {
    bigint: true,
  })
  if (!executableStat.isFile() || executableStat.isSymbolicLink()) {
    throw invalidPackage()
  }
  const canonicalRoot = await realpath(
    path.resolve(path.dirname(canonicalExecutable), '..'),
  )
  const rootStat = await lstat(canonicalRoot, { bigint: true })
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw invalidPackage()
  }
  const relativeExecutable = path.relative(
    canonicalRoot,
    canonicalExecutable,
  )
  if (
    relativeExecutable === '' ||
    relativeExecutable.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeExecutable)
  ) {
    throw invalidPackage()
  }
  return {
    canonicalRoot,
    identity: fileIdentity(rootStat),
  }
}

async function readDeclaredResource(
  authority: RootAuthority,
  descriptor: ResourceFileDescriptor,
  maximumBytes: number,
  hooks: PackageResourceVerificationHooks,
): Promise<Uint8Array> {
  return readResourceFile({
    authority,
    descriptor: {
      ...descriptor,
      bytes: descriptor.bytes,
      sha256: descriptor.sha256,
    },
    maximumBytes,
    hooks,
  })
}

async function readResourceFile(input: {
  readonly authority: RootAuthority
  readonly descriptor: {
    readonly resource: string
    readonly mode: '0644'
    readonly bytes: number | null
    readonly sha256: string | null
  }
  readonly maximumBytes: number
  readonly hooks: PackageResourceVerificationHooks
}): Promise<Uint8Array> {
  await requireRootAuthority(input.authority)
  const resourcePath = await inspectResourcePath(
    input.authority.canonicalRoot,
    input.descriptor.resource,
    'file',
  )
  const beforePath = await lstat(resourcePath, { bigint: true })
  const file = await open(
    resourcePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const beforeFile = await file.stat({ bigint: true })
    const size = Number(beforeFile.size)
    if (
      !beforeFile.isFile() ||
      beforeFile.isSymbolicLink() ||
      beforeFile.nlink !== 1n ||
      !Number.isSafeInteger(size) ||
      size < 0 ||
      size > input.maximumBytes ||
      (beforeFile.mode & BigInt(resourceModeMask)) !== 0o644n ||
      (input.descriptor.bytes !== null &&
        size !== input.descriptor.bytes) ||
      !sameIdentity(beforePath, beforeFile)
    ) {
      throw invalidPackage()
    }
    const bytes = await file.readFile()
    await input.hooks.afterFileRead?.(
      input.descriptor.resource,
    )
    const afterFile = await file.stat({ bigint: true })
    const afterPath = await lstat(resourcePath, { bigint: true })
    await inspectResourcePath(
      input.authority.canonicalRoot,
      input.descriptor.resource,
      'file',
    )
    if (
      bytes.byteLength !== size ||
      !sameIdentity(beforeFile, afterFile) ||
      !sameIdentity(beforeFile, afterPath) ||
      (input.descriptor.sha256 !== null &&
        sha256(bytes) !== input.descriptor.sha256)
    ) {
      throw invalidPackage()
    }
    await requireRootAuthority(input.authority)
    return Uint8Array.from(bytes)
  } finally {
    await file.close()
  }
}

async function captureStaticSite(input: {
  readonly authority: RootAuthority
  readonly descriptor: PackageResourceDescriptor['staticSite']
  readonly hooks: PackageResourceVerificationHooks
}): Promise<VerifiedStaticSite> {
  const staticRoot = await inspectResourcePath(
    input.authority.canonicalRoot,
    input.descriptor.sourceRoot,
    'directory',
  )
  const actual = await listExactTree(staticRoot)
  const expectedFiles = input.descriptor.entries.map(
    ({ relativePath }) => relativePath,
  )
  const expectedDirectories = declaredDirectories(expectedFiles)
  if (
    !sameStrings(actual.files, expectedFiles) ||
    !sameStrings(actual.directories, expectedDirectories)
  ) {
    throw invalidPackage()
  }

  const snapshots = new Map<string, Uint8Array>()
  let totalBytes = 0
  for (const entry of input.descriptor.entries) {
    const bytes = await readResourceFile({
      authority: input.authority,
      descriptor: {
        resource: `${input.descriptor.sourceRoot}/${entry.relativePath}`,
        mode: entry.mode,
        bytes: entry.bytes,
        sha256: entry.sha256,
      },
      maximumBytes: staticFileByteLimit,
      hooks: input.hooks,
    })
    totalBytes += bytes.byteLength
    if (totalBytes > staticSiteByteLimit) throw invalidPackage()
    snapshots.set(entry.relativePath, bytes)
  }
  const frozenPaths = Object.freeze([...expectedFiles])
  const completeTreeSha256 = input.descriptor.completeTreeSha256
  return Object.freeze({
    entryPaths: frozenPaths,
    completeTreeSha256,
    has(relativePath: string): boolean {
      return typeof relativePath === 'string' &&
        snapshots.has(relativePath)
    },
    read(relativePath: string): Uint8Array | null {
      if (typeof relativePath !== 'string') return null
      const bytes = snapshots.get(relativePath)
      return bytes ? Uint8Array.from(bytes) : null
    },
  })
}

async function listExactTree(root: string): Promise<{
  readonly directories: readonly string[]
  readonly files: readonly string[]
}> {
  const directories: string[] = []
  const files: string[] = []

  async function visit(
    current: string,
    relativeRoot: string,
  ): Promise<void> {
    const names = (await readdir(current)).sort(compareCodePoints)
    for (const name of names) {
      const relativePath = relativeRoot
        ? `${relativeRoot}/${name}`
        : name
      if (!isSafeRelativeResource(relativePath)) {
        throw invalidPackage()
      }
      const target = path.join(current, name)
      const stat = await lstat(target, { bigint: true })
      if (stat.isSymbolicLink()) throw invalidPackage()
      if (stat.isDirectory()) {
        directories.push(relativePath)
        await visit(target, relativePath)
      } else if (stat.isFile()) {
        files.push(relativePath)
      } else {
        throw invalidPackage()
      }
    }
  }
  await visit(root, '')
  return {
    directories: Object.freeze(directories),
    files: Object.freeze(files),
  }
}

async function inspectResourcePath(
  packageRoot: string,
  resource: string,
  finalType: 'directory' | 'file',
): Promise<string> {
  if (!isSafeRelativeResource(resource)) throw invalidPackage()
  const segments = resource.split('/')
  let current = packageRoot
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]!)
    const stat = await lstat(current, { bigint: true })
    if (stat.isSymbolicLink()) throw invalidPackage()
    const isFinal = index === segments.length - 1
    if (
      (isFinal && finalType === 'file' && !stat.isFile()) ||
      (isFinal && finalType === 'directory' && !stat.isDirectory()) ||
      (!isFinal && !stat.isDirectory())
    ) {
      throw invalidPackage()
    }
  }
  return current
}

function containedResourcePath(
  packageRoot: string,
  resource: string,
): string {
  if (!isSafeRelativeResource(resource)) throw invalidPackage()
  const candidate = path.join(packageRoot, ...resource.split('/'))
  const relative = path.relative(packageRoot, candidate)
  if (
    relative === '' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw invalidPackage()
  }
  return candidate
}

async function requireRootAuthority(
  authority: RootAuthority,
): Promise<void> {
  const current = await lstat(authority.canonicalRoot, {
    bigint: true,
  })
  if (
    !current.isDirectory() ||
    current.isSymbolicLink() ||
    !sameFileIdentity(authority.identity, fileIdentity(current))
  ) {
    throw invalidPackage()
  }
}

function decodePackageResourceDescriptor(
  value: unknown,
): PackageResourceDescriptor {
  if (
    !isExactObject(value, [
      'compatibilityDescriptor',
      'runtimeRelease',
      'schemaVersion',
      'staticSite',
      'workspaceBundle',
    ]) ||
    value.schemaVersion !== 1
  ) {
    throw invalidPackage()
  }
  const compatibilityDescriptor = decodeResourceFile(
    value.compatibilityDescriptor,
  )
  if (
    !isExactObject(value.runtimeRelease, [
      'canonicalManifest',
      'descriptor',
    ])
  ) {
    throw invalidPackage()
  }
  const runtimeRelease = {
    descriptor: decodeResourceFile(value.runtimeRelease.descriptor),
    canonicalManifest: decodeResourceFile(
      value.runtimeRelease.canonicalManifest,
    ),
  }
  if (
    !isExactObject(value.workspaceBundle, [
      'descriptor',
      'sourceRoot',
    ]) ||
    !isSafeRelativeResource(value.workspaceBundle.sourceRoot)
  ) {
    throw invalidPackage()
  }
  const workspaceBundle = {
    sourceRoot: value.workspaceBundle.sourceRoot,
    descriptor: decodeResourceFile(
      value.workspaceBundle.descriptor,
    ),
  }
  if (
    !isExactObject(value.staticSite, [
      'completeTreeSha256',
      'entries',
      'sourceRoot',
    ]) ||
    !isSafeRelativeResource(value.staticSite.sourceRoot) ||
    !isSha256(value.staticSite.completeTreeSha256) ||
    !Array.isArray(value.staticSite.entries)
  ) {
    throw invalidPackage()
  }
  const entries = value.staticSite.entries.map(
    decodeStaticSiteEntry,
  )
  const entryPaths = entries.map(({ relativePath }) => relativePath)
  if (
    entries.length === 0 ||
    !entryPaths.includes('index.html') ||
    new Set(entryPaths).size !== entryPaths.length ||
    !sameStrings(entryPaths, [...entryPaths].sort(compareCodePoints)) ||
    staticSiteCompleteTreeSha256(entries) !==
      value.staticSite.completeTreeSha256
  ) {
    throw invalidPackage()
  }
  const staticSite = {
    sourceRoot: value.staticSite.sourceRoot,
    entries,
    completeTreeSha256: value.staticSite.completeTreeSha256,
  }
  const locatorResources = [
    compatibilityDescriptor.resource,
    runtimeRelease.descriptor.resource,
    runtimeRelease.canonicalManifest.resource,
    workspaceBundle.descriptor.resource,
  ]
  if (
    new Set(locatorResources).size !== locatorResources.length ||
    locatorResources.includes(packageDescriptorResource) ||
    resourcesOverlap(
      workspaceBundle.sourceRoot,
      workspaceBundle.descriptor.resource,
    ) ||
    resourcesOverlap(
      workspaceBundle.sourceRoot,
      staticSite.sourceRoot,
    ) ||
    locatorResources.some((resource) =>
      resourcesOverlap(staticSite.sourceRoot, resource),
    )
  ) {
    throw invalidPackage()
  }
  return deepFreeze({
    schemaVersion: 1,
    compatibilityDescriptor,
    runtimeRelease,
    workspaceBundle,
    staticSite,
  })
}

function decodeResourceFile(value: unknown): ResourceFileDescriptor {
  if (
    !isExactObject(value, [
      'bytes',
      'mode',
      'resource',
      'sha256',
      'type',
    ]) ||
    !isSafeRelativeResource(value.resource) ||
    value.type !== 'file' ||
    value.mode !== '0644' ||
    !isNonNegativeSafeInteger(value.bytes) ||
    !isSha256(value.sha256)
  ) {
    throw invalidPackage()
  }
  return {
    resource: value.resource,
    type: 'file',
    mode: '0644',
    bytes: value.bytes,
    sha256: value.sha256,
  }
}

function decodeStaticSiteEntry(
  value: unknown,
): StaticSiteEntryDescriptor {
  if (
    !isExactObject(value, [
      'bytes',
      'mode',
      'relativePath',
      'sha256',
      'type',
    ]) ||
    !isSafeRelativeResource(value.relativePath) ||
    value.type !== 'file' ||
    value.mode !== '0644' ||
    !isNonNegativeSafeInteger(value.bytes) ||
    !isSha256(value.sha256)
  ) {
    throw invalidPackage()
  }
  return {
    relativePath: value.relativePath,
    type: 'file',
    mode: '0644',
    bytes: value.bytes,
    sha256: value.sha256,
  }
}

function requireRuntimeBinding(
  compatibility: ApplicationCompatibilityDescriptor,
  runtime: RuntimeReleaseDescriptor,
  resources: PackageResourceDescriptor,
): void {
  if (
    compatibility.application.packageName !==
      runtime.launcher.packageName ||
    compatibility.application.version !== runtime.launcher.version ||
    runtime.manifest.packageResource !==
      resources.runtimeRelease.canonicalManifest.resource ||
    runtime.manifest.bytes !==
      resources.runtimeRelease.canonicalManifest.bytes ||
    runtime.manifest.sha256 !==
      resources.runtimeRelease.canonicalManifest.sha256
  ) {
    throw invalidPackage()
  }
}

function requireWorkspaceDescriptorBinding(
  compatibility: ApplicationCompatibilityDescriptor,
  resources: PackageResourceDescriptor,
): void {
  if (
    compatibility.workspaceBundle.descriptorResource !==
      resources.workspaceBundle.descriptor.resource ||
    compatibility.workspaceBundle.descriptorSha256 !==
      resources.workspaceBundle.descriptor.sha256
  ) {
    throw invalidPackage()
  }
}

function staticSiteCompleteTreeSha256(
  entries: readonly StaticSiteEntryDescriptor[],
): string {
  return sha256(Buffer.from(JSON.stringify({ entries })))
}

function declaredDirectories(
  files: readonly string[],
): readonly string[] {
  const directories = new Set<string>()
  for (const file of files) {
    const segments = file.split('/')
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join('/'))
    }
  }
  return [...directories].sort(compareCodePoints)
}

function decodeJson(bytes: Uint8Array): unknown {
  let encoded: string
  try {
    encoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return JSON.parse(encoded) as unknown
  } catch {
    throw invalidPackage()
  }
}

function fileIdentity(
  stat: BigIntStats,
): FileIdentity {
  return {
    dev: stat.dev,
    ino: stat.ino,
    uid: stat.uid,
    mode: stat.mode,
    nlink: stat.nlink,
    size: stat.size,
    mtimeNs: stat.mtimeNs,
    ctimeNs: stat.ctimeNs,
  }
}

function sameIdentity(
  left: BigIntStats,
  right: BigIntStats,
): boolean {
  return sameFileIdentity(fileIdentity(left), fileIdentity(right))
}

function sameFileIdentity(
  left: FileIdentity,
  right: FileIdentity,
): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.uid === right.uid &&
    left.mode === right.mode &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  )
}

function resourcesOverlap(left: string, right: string): boolean {
  const leftSegments = left.split('/')
  const rightSegments = right.split('/')
  const shared = Math.min(leftSegments.length, rightSegments.length)
  for (let index = 0; index < shared; index += 1) {
    if (leftSegments[index] !== rightSegments[index]) return false
  }
  return true
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

function isSafeRelativeResource(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    Buffer.byteLength(value, 'utf8') > 1024 ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    return false
  }
  const segments = value.split('/')
  return segments.every(
    (segment) =>
      segment.length > 0 &&
      segment !== '.' &&
      segment !== '..',
  )
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/u.test(value)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function sameStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  )
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function deepFreeze<T>(value: T): T {
  if (
    typeof value !== 'object' ||
    value === null ||
    ArrayBuffer.isView(value)
  ) {
    return value
  }
  for (const nested of Object.values(value)) {
    deepFreeze(nested)
  }
  return Object.freeze(value)
}

function invalidPackage(): PackageResourceVerificationError {
  return new PackageResourceVerificationError()
}
