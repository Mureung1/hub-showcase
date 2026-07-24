import { createHash } from 'node:crypto'
import {
  constants as fsConstants,
  type BigIntStats,
} from 'node:fs'
import {
  lstat,
  open,
  opendir,
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
  type WorkspaceBundleDescriptor,
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
const declaredTreeEntryLimit = 4096
const declaredTreeDepthLimit = 32
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
  readonly signal?: AbortSignal
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
    readonly signal?: AbortSignal
  },
  hooks: PackageResourceVerificationHooks,
): Promise<VerifiedPackageResources> {
  try {
    const signal =
      input.signal ?? new AbortController().signal
    requirePackageSignal(signal)
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
      signal,
    })
    const packageDescriptor = decodePackageResourceDescriptor(
      decodeJson(packageDescriptorBytes),
    )

    const compatibilityBytes = await readDeclaredResource(
      authority,
      packageDescriptor.compatibilityDescriptor,
      smallDescriptorByteLimit,
      hooks,
      signal,
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
      signal,
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
      signal,
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
      signal,
    )
    const workspaceDescriptor = decodeWorkspaceBundleDescriptor(
      decodeJson(workspaceDescriptorBytes),
    )
    requireWorkspaceDescriptorBinding(
      compatibility,
      packageDescriptor,
    )
    const workspaceExpectedFiles =
      workspaceDeclaredPaths(workspaceDescriptor)
    const workspaceTree = await captureDeclaredTreeAuthority({
      authority,
      expectedFiles: workspaceExpectedFiles,
      resource: packageDescriptor.workspaceBundle.sourceRoot,
      signal,
    })
    requirePackageSignal(signal)
    const workspaceSource = await captureWorkspaceBundleSourceAt(
      workspaceTree.canonicalRoot,
    )
    requirePackageSignal(signal)
    await revalidateDeclaredTreeAuthority(
      workspaceTree,
      workspaceExpectedFiles,
      signal,
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
      signal,
    })
    requirePackageSignal(signal)
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
  signal: AbortSignal,
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
    signal,
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
  readonly signal: AbortSignal
}): Promise<Uint8Array> {
  requirePackageSignal(input.signal)
  await requireRootAuthority(input.authority)
  requirePackageSignal(input.signal)
  const resourcePath = await inspectResourcePath(
    input.authority.canonicalRoot,
    input.descriptor.resource,
    'file',
  )
  requirePackageSignal(input.signal)
  const beforePath = await lstat(resourcePath, { bigint: true })
  requirePackageSignal(input.signal)
  const file = await open(
    resourcePath,
    fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
  )
  try {
    const beforeFile = await file.stat({ bigint: true })
    requirePackageSignal(input.signal)
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
    requirePackageSignal(input.signal)
    await input.hooks.afterFileRead?.(
      input.descriptor.resource,
    )
    requirePackageSignal(input.signal)
    const afterFile = await file.stat({ bigint: true })
    const afterPath = await lstat(resourcePath, { bigint: true })
    await inspectResourcePath(
      input.authority.canonicalRoot,
      input.descriptor.resource,
      'file',
    )
    requirePackageSignal(input.signal)
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
    requirePackageSignal(input.signal)
    return Uint8Array.from(bytes)
  } finally {
    await file.close()
  }
}

async function captureStaticSite(input: {
  readonly authority: RootAuthority
  readonly descriptor: PackageResourceDescriptor['staticSite']
  readonly hooks: PackageResourceVerificationHooks
  readonly signal: AbortSignal
}): Promise<VerifiedStaticSite> {
  const expectedFiles = input.descriptor.entries.map(
    ({ relativePath }) => relativePath,
  )
  const staticTree = await captureDeclaredTreeAuthority({
    authority: input.authority,
    expectedFiles,
    resource: input.descriptor.sourceRoot,
    signal: input.signal,
  })

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
      signal: input.signal,
    })
    totalBytes += bytes.byteLength
    if (totalBytes > staticSiteByteLimit) throw invalidPackage()
    snapshots.set(entry.relativePath, bytes)
  }
  await revalidateDeclaredTreeAuthority(
    staticTree,
    expectedFiles,
    input.signal,
  )
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

type DeclaredTreeAuthority = {
  readonly authority: RootAuthority
  readonly canonicalRoot: string
  readonly identity: FileIdentity
  readonly resource: string
}

async function captureDeclaredTreeAuthority(input: {
  readonly authority: RootAuthority
  readonly expectedFiles: readonly string[]
  readonly resource: string
  readonly signal: AbortSignal
}): Promise<DeclaredTreeAuthority> {
  requirePackageSignal(input.signal)
  await requireRootAuthority(input.authority)
  const canonicalRoot = await inspectResourcePath(
    input.authority.canonicalRoot,
    input.resource,
    'directory',
  )
  const before = await lstat(canonicalRoot, { bigint: true })
  if (before.isSymbolicLink() || !before.isDirectory()) {
    throw invalidPackage()
  }
  const tree = Object.freeze({
    authority: input.authority,
    canonicalRoot,
    identity: fileIdentity(before),
    resource: input.resource,
  })
  await requireExactDeclaredTree(
    tree,
    input.expectedFiles,
    input.signal,
  )
  return tree
}

async function revalidateDeclaredTreeAuthority(
  tree: DeclaredTreeAuthority,
  expectedFiles: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  requirePackageSignal(signal)
  await requireRootAuthority(tree.authority)
  const currentRoot = await inspectResourcePath(
    tree.authority.canonicalRoot,
    tree.resource,
    'directory',
  )
  const current = await lstat(currentRoot, { bigint: true })
  if (
    currentRoot !== tree.canonicalRoot ||
    current.isSymbolicLink() ||
    !current.isDirectory() ||
    !sameFileIdentity(tree.identity, fileIdentity(current))
  ) {
    throw invalidPackage()
  }
  await requireExactDeclaredTree(tree, expectedFiles, signal)
  await requireRootAuthority(tree.authority)
  requirePackageSignal(signal)
}

async function requireExactDeclaredTree(
  tree: Pick<DeclaredTreeAuthority, 'canonicalRoot'>,
  expectedFilesInput: readonly string[],
  signal: AbortSignal,
): Promise<void> {
  const expectedFiles = new Set(expectedFilesInput)
  const expectedDirectories = new Set(
    declaredDirectories(expectedFilesInput),
  )
  const expectedEntryCount =
    expectedFiles.size + expectedDirectories.size
  if (
    expectedFiles.size !== expectedFilesInput.length ||
    expectedEntryCount === 0 ||
    expectedEntryCount > declaredTreeEntryLimit ||
    [...expectedFiles, ...expectedDirectories].some(
      (relativePath) =>
        !isSafeRelativeResource(relativePath) ||
        relativePath.split('/').length >
          declaredTreeDepthLimit,
    )
  ) {
    throw invalidPackage()
  }

  const seenFiles = new Set<string>()
  const seenDirectories = new Set<string>()
  let visitedEntries = 0

  const visit = async (
    current: string,
    relativeRoot: string,
    depth: number,
  ): Promise<void> => {
    requirePackageSignal(signal)
    if (depth > declaredTreeDepthLimit) throw invalidPackage()
    const directory = await opendir(current, { bufferSize: 1 })
    try {
      for await (const entry of directory) {
        requirePackageSignal(signal)
        visitedEntries += 1
        if (visitedEntries > expectedEntryCount) {
          throw invalidPackage()
        }
        const relativePath = relativeRoot
          ? `${relativeRoot}/${entry.name}`
          : entry.name
        if (!isSafeRelativeResource(relativePath)) {
          throw invalidPackage()
        }
        const target = path.join(current, entry.name)
        const stat = await lstat(target, { bigint: true })
        requirePackageSignal(signal)
        if (
          stat.isSymbolicLink() ||
          (!expectedFiles.has(relativePath) &&
            !expectedDirectories.has(relativePath))
        ) {
          throw invalidPackage()
        }
        if (expectedDirectories.has(relativePath)) {
          if (!stat.isDirectory()) throw invalidPackage()
          seenDirectories.add(relativePath)
          await visit(target, relativePath, depth + 1)
        } else {
          if (!stat.isFile()) throw invalidPackage()
          seenFiles.add(relativePath)
        }
      }
    } finally {
      await directory.close().catch(() => undefined)
    }
  }

  await visit(tree.canonicalRoot, '', 1)
  if (
    seenFiles.size !== expectedFiles.size ||
    seenDirectories.size !== expectedDirectories.size
  ) {
    throw invalidPackage()
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
  const entryDirectories = declaredDirectories(entryPaths)
  if (
    entries.length === 0 ||
    entries.length + entryDirectories.length >
      declaredTreeEntryLimit ||
    entryPaths.some(
      (relativePath) =>
        relativePath.split('/').length >
        declaredTreeDepthLimit,
    ) ||
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

function workspaceDeclaredPaths(
  descriptor: WorkspaceBundleDescriptor,
): readonly string[] {
  return descriptor.roots
    .flatMap((root) =>
      root.entries.map((entry) =>
        root.kind === 'instructions'
          ? entry.relativePath
          : `${root.root}/${entry.relativePath}`,
      ),
    )
    .sort(compareCodePoints)
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

function requirePackageSignal(signal: AbortSignal): void {
  if (signal.aborted) throw invalidPackage()
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
