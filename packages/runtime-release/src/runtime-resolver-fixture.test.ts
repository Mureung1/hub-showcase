/// <reference types="node" />

import { createHash } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdtemp,
  open,
  realpath,
  rm,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import { pack } from 'tar-stream'

import {
  runtimeManifestRosterSha256,
} from './canonical-runtime-manifest.js'
import type {
  CanonicalRuntimeManifest,
  RuntimeManifestEntry,
  RuntimeManifestFileEntry,
} from './canonical-runtime-manifest.js'
import type {
  RuntimeReleaseDescriptor,
} from './contract.js'
import type {
  ArchiveTransport,
  ArchiveTransportRequest,
  ArchiveTransportResponse,
} from './runtime-archive-transport.js'
import type {
  RuntimeCacheLayout,
} from './runtime-cache-authority.js'
import {
  admitRuntimeRelease,
} from './runtime-release-authority.js'
import type {
  RuntimeReleaseAdmission,
  RuntimeReleaseAdmissionInput,
} from './runtime-release-authority.js'

export type RuntimeResolverFixtureFile = {
  readonly bytes: Buffer
  readonly mode: '100644' | '100755'
  readonly path: string
  readonly type: 'file'
}

export type RuntimeResolverFixtureSymlink = {
  readonly path: string
  readonly target: string
  readonly type: 'symlink'
}

export type RuntimeResolverFixtureEntry =
  | RuntimeResolverFixtureFile
  | RuntimeResolverFixtureSymlink

export type RuntimeResolverReleaseFixtureOptions = {
  readonly launcherVersion?: string
  readonly noticeBytes?: Uint8Array
  readonly releaseId?: string
  readonly transformArchive?: (archiveBytes: Buffer) => Buffer
  readonly transformTar?: (tarBytes: Buffer) => Buffer
}

export type RuntimeResolverReleaseFixture = {
  readonly admission: RuntimeReleaseAdmission
  readonly admissionInput: RuntimeReleaseAdmissionInput
  readonly archiveBytes: Buffer
  readonly canonicalManifest: CanonicalRuntimeManifest
  readonly canonicalManifestBytes: Buffer
  readonly canonicalManifestResource:
    'resources/runtime/manifest.json'
  readonly descriptor: RuntimeReleaseDescriptor
  readonly entries: readonly RuntimeResolverFixtureEntry[]
}

export type OwnerOnlyTempAppDataRoot = {
  readonly appDataRoot: string
  cleanup(): Promise<void>
}

export type ScriptedArchiveResponse = {
  readonly afterChunks?: () => void | Promise<void>
  readonly beforeBodyError?: () => void | Promise<void>
  readonly beforeChunks?: () => void | Promise<void>
  readonly bodyError?: Error
  readonly chunks?: readonly Uint8Array[]
  readonly headers?: ArchiveTransportResponse['headers']
  readonly requestError?: Error
  readonly statusCode: number
}

export type ExactArchiveResponseOptions = {
  readonly chunks?: readonly Uint8Array[]
  readonly etag?: string
}

/**
 * Test-only deterministic transport for resolver integration tests.
 * Each exchange consumes exactly one script, including request failures.
 */
export class ScriptedArchiveTransport implements ArchiveTransport {
  readonly requests: ArchiveTransportRequest[] = []
  closedResponses = 0
  readonly #responses: ScriptedArchiveResponse[]

  constructor(responses: readonly ScriptedArchiveResponse[] = []) {
    this.#responses = [...responses]
  }

  enqueue(...responses: readonly ScriptedArchiveResponse[]): void {
    this.#responses.push(...responses)
  }

  async exchange<T>(
    request: ArchiveTransportRequest,
    consume: (response: ArchiveTransportResponse) => Promise<T>,
  ): Promise<T> {
    this.requests.push(request)
    const scripted = this.#responses.shift()
    if (scripted === undefined) {
      throw new Error('Unexpected Runtime archive transport request.')
    }
    if (scripted.requestError !== undefined) {
      throw scripted.requestError
    }
    try {
      return await consume({
        statusCode: scripted.statusCode,
        headers: scripted.headers ?? {},
        body: scriptedResponseBody(scripted),
      })
    } finally {
      this.closedResponses += 1
    }
  }

  assertExhausted(): void {
    if (this.#responses.length !== 0) {
      throw new Error('Runtime archive transport scripts remain.')
    }
  }

  remainingResponses(): number {
    return this.#responses.length
  }
}

export async function createRuntimeResolverReleaseFixture(
  options: RuntimeResolverReleaseFixtureOptions = {},
): Promise<RuntimeResolverReleaseFixture> {
  const launcherVersion =
    options.launcherVersion ?? '0.1.0-preview.1'
  const releaseId = options.releaseId ?? '0.1.0'
  const entries = fixtureEntries(options)
  const manifestValue = createCanonicalManifest(entries)
  const canonicalManifestBytes = Buffer.from(
    `${JSON.stringify(manifestValue, null, 2)}\n`,
  )
  const archiveBytes = await createCanonicalArchive(
    canonicalManifestBytes,
    entries,
    options,
  )
  const canonicalManifestResource =
    'resources/runtime/manifest.json' as const
  const descriptor = {
    schemaVersion: 1,
    launcher: {
      packageName: 'ay-ple',
      version: launcherVersion,
    },
    distribution: {
      repository: 'https://github.com/ay-ple/ay-ple',
      applicationReleaseTag: `v${launcherVersion}`,
      runtimeAssetReleaseTag: `runtime-v${releaseId}`,
    },
    runtime: {
      releaseId,
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    archive: {
      format: 'ay-ple-runtime-tar-gzip-v1',
      assetName:
        `ay-ple-runtime-${releaseId}-darwin-arm64.tar.gz`,
      url:
        'https://github.com/ay-ple/ay-ple/releases/download/' +
        `runtime-v${releaseId}/` +
        `ay-ple-runtime-${releaseId}-darwin-arm64.tar.gz`,
      bytes: archiveBytes.byteLength,
      sha256: sha256(archiveBytes),
    },
    manifest: {
      packageResource: canonicalManifestResource,
      schemaVersion: 2,
      bytes: canonicalManifestBytes.byteLength,
      sha256: sha256(canonicalManifestBytes),
    },
  } satisfies RuntimeReleaseDescriptor
  const admissionInput: RuntimeReleaseAdmissionInput = {
    application: {
      packageName: 'ay-ple',
      version: launcherVersion,
    },
    canonicalManifestBytes,
    canonicalManifestResource,
    descriptor,
    runtimeContractVersion: 1,
    target: 'darwin-arm64',
  }
  const admission = admitRuntimeRelease(admissionInput)

  return {
    admission,
    admissionInput,
    archiveBytes,
    canonicalManifest: admission.manifest,
    canonicalManifestBytes,
    canonicalManifestResource,
    descriptor: admission.descriptor,
    entries,
  }
}

export async function createOwnerOnlyTempAppDataRoot(): Promise<
  OwnerOnlyTempAppDataRoot
> {
  const created = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-runtime-resolver-'),
  )
  await chmod(created, 0o700)
  const appDataRoot = await realpath(created)
  await assertOwnerOnlyDirectory(appDataRoot)
  let cleanupPromise: Promise<void> | undefined

  return {
    appDataRoot,
    cleanup: async () => {
      cleanupPromise ??= rm(appDataRoot, {
        force: true,
        recursive: true,
      })
      await cleanupPromise
    },
  }
}

/**
 * Seeds a standalone nlink-one retained archive after cache bootstrap.
 */
export async function seedRetainedRuntimeArchive(input: {
  readonly archiveBytes: Uint8Array
  readonly layout: RuntimeCacheLayout
}): Promise<void> {
  const handle = await open(input.layout.archive.path, 'wx', 0o600)
  try {
    await handle.writeFile(input.archiveBytes)
    await handle.sync()
  } finally {
    await handle.close()
  }
  const directory = await open(
    input.layout.namespaces.archives,
    'r',
  )
  try {
    await directory.sync()
  } finally {
    await directory.close()
  }
}

export function exactArchiveResponse(
  archiveBytes: Uint8Array,
  options: ExactArchiveResponseOptions = {},
): ScriptedArchiveResponse {
  return {
    statusCode: 200,
    headers: {
      'content-encoding': ['identity'],
      'content-length': [String(archiveBytes.byteLength)],
      etag: [options.etag ?? '"ay-ple-runtime-fixture"'],
    },
    chunks: options.chunks ?? [archiveBytes],
  }
}

async function* scriptedResponseBody(
  scripted: ScriptedArchiveResponse,
): AsyncIterable<Uint8Array> {
  await scripted.beforeChunks?.()
  for (const chunk of scripted.chunks ?? []) yield chunk
  await scripted.afterChunks?.()
  if (scripted.bodyError !== undefined) {
    await scripted.beforeBodyError?.()
    throw scripted.bodyError
  }
}

function fixtureEntries(
  options: RuntimeResolverReleaseFixtureOptions,
): RuntimeResolverFixtureEntry[] {
  const files = [
    [
      'NOTICE',
      Buffer.from(options.noticeBytes ?? Buffer.from('AY-PLE notice\n')),
      '100644',
    ],
    [
      'THIRD_PARTY_NOTICES.md',
      Buffer.from('# Third-party notices\n'),
      '100644',
    ],
    [
      'bundle/bridge/worker.py',
      Buffer.from('print("bridge")\n'),
      '100644',
    ],
    [
      'bundle/python/bin/python3.10',
      Buffer.from('#!/bin/sh\nexit 0\n'),
      '100755',
    ],
    [
      'bundle/site-packages/codex_cli_bin/bin/codex',
      Buffer.from('#!/bin/sh\nexit 0\n'),
      '100755',
    ],
    [
      'licenses/openai/LICENSE',
      Buffer.from('OpenAI license\n'),
      '100644',
    ],
    [
      'provenance/inputs.json',
      Buffer.from('{"source":"fixture"}\n'),
      '100644',
    ],
    [
      'sbom.spdx.json',
      Buffer.from('{"spdxVersion":"SPDX-2.3"}\n'),
      '100644',
    ],
  ] as const
  return [
    ...files.map(
      ([entryPath, bytes, mode]): RuntimeResolverFixtureFile => ({
        bytes,
        mode,
        path: entryPath,
        type: 'file',
      }),
    ),
    {
      path: 'bundle/python/bin/python3',
      target: 'python3.10',
      type: 'symlink',
    } satisfies RuntimeResolverFixtureSymlink,
  ].sort((left, right) =>
    compareUnicodeCodePoints(left.path, right.path),
  )
}

function createCanonicalManifest(
  entries: readonly RuntimeResolverFixtureEntry[],
): CanonicalRuntimeManifest {
  const payload = treeEvidence(entries)
  const bundle = treeEvidence(
    entries.filter((entry) => entry.path.startsWith('bundle/')),
  )
  const provenance = payload.entries.find(
    (entry) => entry.path === 'provenance/inputs.json',
  )
  if (provenance?.type !== 'file') {
    throw new Error('The Runtime fixture provenance is missing.')
  }
  return {
    schema_version: 2,
    kind: 'ay_ple_runtime_release',
    runtime_contract_version: 1,
    target: {
      system: 'Darwin',
      architecture: 'arm64',
      id: 'darwin-arm64',
    },
    identity: {
      native_codex_version: '0.144.4',
      python_version: '3.10.18',
      source_commit: '8c68d4c87dc54d38861f5114e920c3de2efa5876',
      patch_stack_sha256:
        'ffc43da6e5e7a146016404db54968d37d849b778e5e9b04db680cac4124fc1c9',
    },
    launch: {
      python_executable: 'bundle/python/bin/python3.10',
      bridge_entrypoint: 'bundle/bridge/worker.py',
      site_packages: 'bundle/site-packages',
      native_executable:
        'bundle/site-packages/codex_cli_bin/bin/codex',
    },
    payload,
    bundle: {
      path: 'bundle',
      file_count: bundle.file_count,
      regular_file_bytes: bundle.regular_file_bytes,
      roster_sha256: bundle.roster_sha256,
      symlink_count: bundle.symlink_count,
    },
    input_provenance: {
      path: 'provenance/inputs.json',
      sha256: provenance.sha256,
    },
  }
}

function treeEvidence(
  entries: readonly RuntimeResolverFixtureEntry[],
): CanonicalRuntimeManifest['payload'] {
  const manifestEntries = entries.map(toManifestEntry)
  const files = manifestEntries.filter(
    (entry): entry is RuntimeManifestFileEntry =>
      entry.type === 'file',
  )
  return {
    entries: manifestEntries,
    file_count: files.length,
    regular_file_bytes: files.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    roster_sha256: runtimeManifestRosterSha256(manifestEntries),
    symlink_count: manifestEntries.length - files.length,
  }
}

function toManifestEntry(
  entry: RuntimeResolverFixtureEntry,
): RuntimeManifestEntry {
  if (entry.type === 'symlink') return entry
  return {
    bytes: entry.bytes.byteLength,
    mode: entry.mode,
    path: entry.path,
    sha256: sha256(entry.bytes),
    type: 'file',
  }
}

async function createCanonicalArchive(
  canonicalManifestBytes: Buffer,
  entries: readonly RuntimeResolverFixtureEntry[],
  options: RuntimeResolverReleaseFixtureOptions,
): Promise<Buffer> {
  const archive = pack()
  const mtime = new Date(0)
  for (const directory of parentDirectories(entries)) {
    archive.entry({
      name: directory,
      type: 'directory',
      mode: 0o755,
      uid: 0,
      gid: 0,
      mtime,
    })
  }
  archive.entry(
    {
      name: 'manifest.json',
      type: 'file',
      mode: 0o644,
      uid: 0,
      gid: 0,
      mtime,
      size: canonicalManifestBytes.byteLength,
    },
    canonicalManifestBytes,
  )
  for (const entry of entries) {
    if (entry.type === 'file') {
      archive.entry(
        {
          name: entry.path,
          type: 'file',
          mode: entry.mode === '100755' ? 0o755 : 0o644,
          uid: 0,
          gid: 0,
          mtime,
          size: entry.bytes.byteLength,
        },
        entry.bytes,
      )
      continue
    }
    archive.entry({
      name: entry.path,
      type: 'symlink',
      mode: 0o777,
      uid: 0,
      gid: 0,
      mtime,
      linkname: entry.target,
      size: 0,
    })
  }
  archive.finalize()
  const chunks: Buffer[] = []
  for await (const chunk of archive) chunks.push(Buffer.from(chunk))
  const tarBytes = Buffer.concat(chunks)
  const archiveBytes = gzipSync(
    options.transformTar?.(tarBytes) ?? tarBytes,
    { level: 9 },
  )
  return options.transformArchive?.(archiveBytes) ?? archiveBytes
}

function parentDirectories(
  entries: readonly RuntimeResolverFixtureEntry[],
): string[] {
  const directories = new Set<string>()
  for (const entry of entries) {
    let directory = path.posix.dirname(entry.path)
    while (directory !== '.') {
      directories.add(directory)
      directory = path.posix.dirname(directory)
    }
  }
  return [...directories].sort(compareUnicodeCodePoints)
}

async function assertOwnerOnlyDirectory(directory: string): Promise<void> {
  const stats = await lstat(directory, { bigint: true })
  const ownerUid = process.getuid?.()
  if (
    ownerUid === undefined ||
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    Number(stats.uid) !== ownerUid ||
    Number(stats.mode & 0o7777n) !== 0o700
  ) {
    throw new Error('The temporary app data root is not owner-only.')
  }
}

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

function compareUnicodeCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(
    left,
    (character) => character.codePointAt(0)!,
  )
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
