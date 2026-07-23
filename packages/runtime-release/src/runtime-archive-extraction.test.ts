import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rename,
  rm,
  stat,
  symlink,
  unlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { gzipSync } from 'node:zlib'

import { pack } from 'tar-stream'

import {
  createRuntimeCacheLayout,
  createRuntimeStagingIdentity,
  inspectRuntimeCacheRoot,
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import { extractVerifiedRuntimeArchive } from './runtime-archive-extraction.js'
import type { RuntimeArchiveExtractionTestOptions } from './runtime-archive-extraction.js'
import {
  RuntimeReleaseAuthorityError,
  admitRuntimeRelease,
} from './runtime-release-authority.js'

type FixtureFile = {
  readonly bytes: Buffer
  readonly mode: '100644' | '100755'
  readonly path: string
  readonly type: 'file'
}

type FixtureSymlink = {
  readonly path: string
  readonly target: string
  readonly type: 'symlink'
}

type FixtureEntry = FixtureFile | FixtureSymlink

type RuntimeArchiveFixture = {
  readonly admission: ReturnType<typeof admitRuntimeRelease>
  readonly archiveBytes: Buffer
  readonly canonicalManifestBytes: Buffer
  readonly layout: ReturnType<typeof createRuntimeCacheLayout>
  readonly mutationAuthority: Awaited<
    ReturnType<typeof revalidateRuntimeCacheRootForMutation>
  >
  readonly root: string
  readonly staging: ReturnType<typeof createRuntimeStagingIdentity>
}

type RuntimeArchiveFixtureOptions = {
  readonly transformArchive?: (archiveBytes: Buffer) => Buffer
  readonly transformTar?: (tarBytes: Buffer) => Buffer
}

const TRANSACTION_NONCE = 'b'.repeat(32)

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
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

function fixtureEntries(): FixtureEntry[] {
  const files = [
    ['NOTICE', 'AY-PLE notice\n', '100644'],
    [
      'THIRD_PARTY_NOTICES.md',
      '# Third-party notices\n',
      '100644',
    ],
    ['bundle/bridge/worker.py', 'print("bridge")\n', '100644'],
    [
      'bundle/python/bin/python3.10',
      '#!/bin/sh\nexit 0\n',
      '100755',
    ],
    [
      'bundle/site-packages/codex_cli_bin/bin/codex',
      '#!/bin/sh\nexit 0\n',
      '100755',
    ],
    ['licenses/openai/LICENSE', 'OpenAI license\n', '100644'],
    [
      'provenance/inputs.json',
      '{"source":"fixture"}\n',
      '100644',
    ],
    ['sbom.spdx.json', '{"spdxVersion":"SPDX-2.3"}\n', '100644'],
  ] as const
  return [
    ...files.map(
      ([entryPath, contents, mode]): FixtureFile => ({
        bytes: Buffer.from(contents),
        mode,
        path: entryPath,
        type: 'file',
      }),
    ),
    {
      path: 'bundle/python/bin/python3',
      target: 'python3.10',
      type: 'symlink',
    },
  ].sort((left, right) =>
    compareUnicodeCodePoints(left.path, right.path),
  )
}

function treeEvidence(entries: readonly FixtureEntry[]) {
  const manifestEntries = entries.map((entry) =>
    entry.type === 'file'
      ? {
          bytes: entry.bytes.byteLength,
          mode: entry.mode,
          path: entry.path,
          sha256: sha256(entry.bytes),
          type: 'file' as const,
        }
      : entry,
  )
  const files = manifestEntries.filter(
    (entry): entry is Extract<(typeof manifestEntries)[number], { type: 'file' }> =>
      entry.type === 'file',
  )
  return {
    entries: manifestEntries,
    file_count: files.length,
    regular_file_bytes: files.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    roster_sha256: sha256(JSON.stringify({ entries: manifestEntries })),
    symlink_count: manifestEntries.length - files.length,
  }
}

function canonicalManifest(entries: readonly FixtureEntry[]) {
  const payload = treeEvidence(entries)
  const bundle = treeEvidence(
    entries.filter((entry) => entry.path.startsWith('bundle/')),
  )
  const provenance = payload.entries.find(
    (entry) => entry.path === 'provenance/inputs.json',
  )
  assert.equal(provenance?.type, 'file')
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
      sha256: (provenance as Extract<typeof provenance, { type: 'file' }>)
        .sha256,
    },
  } as const
}

function parentDirectories(entries: readonly FixtureEntry[]): string[] {
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

async function canonicalArchive(
  canonicalManifestBytes: Buffer,
  entries: readonly FixtureEntry[],
  options: RuntimeArchiveFixtureOptions = {},
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
          mode: Number.parseInt(entry.mode.slice(3), 8),
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
    {
      level: 9,
    },
  )
  return options.transformArchive?.(archiveBytes) ?? archiveBytes
}

async function createRuntimeArchiveFixture(
  options: RuntimeArchiveFixtureOptions = {},
): Promise<RuntimeArchiveFixture> {
  const entries = fixtureEntries()
  const manifest = canonicalManifest(entries)
  const canonicalManifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  const archiveBytes = await canonicalArchive(
    canonicalManifestBytes,
    entries,
    options,
  )
  const descriptor = {
    schemaVersion: 1,
    launcher: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    distribution: {
      repository: 'https://github.com/ay-ple/ay-ple',
      applicationReleaseTag: 'v0.1.0-preview.1',
      runtimeAssetReleaseTag: 'runtime-v0.1.0',
    },
    runtime: {
      releaseId: '0.1.0',
      target: 'darwin-arm64',
      runtimeContractVersion: 1,
    },
    archive: {
      format: 'ay-ple-runtime-tar-gzip-v1',
      assetName: 'ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
      url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
      bytes: archiveBytes.byteLength,
      sha256: sha256(archiveBytes),
    },
    manifest: {
      packageResource: 'resources/runtime/manifest.json',
      schemaVersion: 2,
      bytes: canonicalManifestBytes.byteLength,
      sha256: sha256(canonicalManifestBytes),
    },
  } as const
  const admission = admitRuntimeRelease({
    descriptor,
    canonicalManifestResource: 'resources/runtime/manifest.json',
    canonicalManifestBytes,
    application: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    target: 'darwin-arm64',
    runtimeContractVersion: 1,
  })
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'runtime-archive-test-')),
  )
  const appDataRoot = path.join(root, 'app-data')
  await mkdir(appDataRoot, { mode: 0o700 })
  await chmod(appDataRoot, 0o700)
  const layout = createRuntimeCacheLayout(appDataRoot, admission)
  await mkdir(layout.cacheRoot, { recursive: true, mode: 0o700 })
  await chmod(path.dirname(layout.cacheRoot), 0o700)
  await chmod(layout.cacheRoot, 0o700)
  await mkdir(layout.namespaces.archives, { mode: 0o700 })
  await mkdir(layout.namespaces.staging, { mode: 0o700 })
  await writeFile(layout.archive.path, archiveBytes, {
    mode: 0o600,
    flag: 'wx',
  })
  const staging = createRuntimeStagingIdentity(
    layout,
    TRANSACTION_NONCE,
  )
  await mkdir(staging.path, { mode: 0o700 })
  const inspection = await inspectRuntimeCacheRoot({ appDataRoot })
  const mutationAuthority =
    await revalidateRuntimeCacheRootForMutation(inspection)
  return {
    admission,
    archiveBytes,
    canonicalManifestBytes,
    layout,
    mutationAuthority,
    root,
    staging,
  }
}

async function withFixture(
  run: (fixture: RuntimeArchiveFixture) => Promise<void>,
  options: RuntimeArchiveFixtureOptions = {},
): Promise<void> {
  const fixture = await createRuntimeArchiveFixture(options)
  try {
    await run(fixture)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
}

function withEmbeddedNulInNoticeHeader(tarBytes: Buffer): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, 'NOTICE')
  const nameOffset = headerOffset
  const terminatorOffset = nameOffset + Buffer.byteLength('NOTICE')
  assert.equal(mutated[terminatorOffset], 0)
  Buffer.from('hidden').copy(mutated, terminatorOffset + 1)
  writeTarChecksum(mutated, headerOffset)
  return mutated
}

function rewriteTarPath(
  tarBytes: Buffer,
  currentPath: string,
  replacementPath: string,
): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, currentPath)
  const encoded = Buffer.from(replacementPath)
  assert.ok(encoded.byteLength <= 100)
  mutated.fill(0, headerOffset, headerOffset + 100)
  encoded.copy(mutated, headerOffset)
  writeTarChecksum(mutated, headerOffset)
  return mutated
}

function rewriteTarLinkTarget(
  tarBytes: Buffer,
  entryPath: string,
  replacementTarget: string,
): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, entryPath)
  const encoded = Buffer.from(replacementTarget)
  assert.ok(encoded.byteLength <= 100)
  mutated.fill(0, headerOffset + 157, headerOffset + 257)
  encoded.copy(mutated, headerOffset + 157)
  writeTarChecksum(mutated, headerOffset)
  return mutated
}

function rewriteTarType(
  tarBytes: Buffer,
  entryPath: string,
  typeflag: string,
): Buffer {
  assert.equal(Buffer.byteLength(typeflag), 1)
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, entryPath)
  mutated[headerOffset + 156] = typeflag.charCodeAt(0)
  writeTarChecksum(mutated, headerOffset)
  return mutated
}

function rewriteTarMode(
  tarBytes: Buffer,
  entryPath: string,
  mode: number,
): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, entryPath)
  const encoded = `${mode.toString(8).padStart(7, '0')}\0`
  mutated.write(encoded, headerOffset + 100, 8, 'ascii')
  writeTarChecksum(mutated, headerOffset)
  return mutated
}

function duplicateTarMember(
  tarBytes: Buffer,
  entryPath: string,
): Buffer {
  const start = findTarHeader(tarBytes, entryPath)
  const size = tarEntrySize(tarBytes, start)
  const end = start + 512 + Math.ceil(size / 512) * 512
  return Buffer.concat([
    tarBytes.subarray(0, tarBytes.byteLength - 1024),
    tarBytes.subarray(start, end),
    tarBytes.subarray(tarBytes.byteLength - 1024),
  ])
}

function removeTarMember(
  tarBytes: Buffer,
  entryPath: string,
): Buffer {
  const start = findTarHeader(tarBytes, entryPath)
  const size = tarEntrySize(tarBytes, start)
  const end = start + 512 + Math.ceil(size / 512) * 512
  return Buffer.concat([
    tarBytes.subarray(0, start),
    tarBytes.subarray(end),
  ])
}

function rewriteTarSize(
  tarBytes: Buffer,
  entryPath: string,
  size: number,
): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, entryPath)
  const encoded = `${size.toString(8).padStart(11, '0')} `
  assert.equal(Buffer.byteLength(encoded), 12)
  mutated.write(encoded, headerOffset + 124, 12, 'ascii')
  writeTarChecksum(mutated, headerOffset)
  return mutated
}

function corruptTarHeaderChecksum(tarBytes: Buffer): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, 'NOTICE')
  mutated[headerOffset + 148] ^= 1
  return mutated
}

function corruptTarFileBytes(
  tarBytes: Buffer,
  entryPath: string,
): Buffer {
  const mutated = Buffer.from(tarBytes)
  const headerOffset = findTarHeader(mutated, entryPath)
  assert.ok(tarEntrySize(mutated, headerOffset) > 0)
  mutated[headerOffset + 512] ^= 1
  return mutated
}

function findTarHeader(tarBytes: Buffer, expectedName: string): number {
  let offset = 0
  while (offset + 512 <= tarBytes.byteLength) {
    const header = tarBytes.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const terminator = header.indexOf(0, 0)
    const name = header
      .subarray(0, terminator === -1 ? 100 : terminator)
      .toString('utf8')
    if (name === expectedName) return offset
    const size = tarEntrySize(tarBytes, offset)
    offset += 512 + Math.ceil(size / 512) * 512
  }
  assert.fail(`Missing TAR header: ${expectedName}`)
}

function tarEntrySize(tarBytes: Buffer, headerOffset: number): number {
  const sizeText = tarBytes
    .subarray(headerOffset + 124, headerOffset + 136)
    .toString('ascii')
    .replace(/\0.*$/u, '')
    .trim()
  return Number.parseInt(sizeText || '0', 8)
}

function writeTarChecksum(tarBytes: Buffer, headerOffset: number): void {
  const header = tarBytes.subarray(headerOffset, headerOffset + 512)
  header.fill(0x20, 148, 156)
  const checksum = header.reduce((total, byte) => total + byte, 0)
  const encoded = `${checksum.toString(8).padStart(6, '0')}\0 `
  header.write(encoded, 148, 8, 'ascii')
}

async function assertArchiveError(
  action: () => Promise<unknown>,
  expectedCode: string,
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.equal(error instanceof RuntimeReleaseAuthorityError, true)
    assert.equal(
      (error as RuntimeReleaseAuthorityError).failure.code,
      expectedCode,
    )
    return true
  })
}

function extractFixture(
  fixture: RuntimeArchiveFixture,
  testOptions: RuntimeArchiveExtractionTestOptions = {},
) {
  return extractVerifiedRuntimeArchive(
    {
      admission: fixture.admission,
      canonicalManifestBytes: fixture.canonicalManifestBytes,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      staging: fixture.staging,
    },
    testOptions,
  )
}

async function listTree(root: string): Promise<string[]> {
  const result: string[] = []
  async function visit(directory: string, relativeRoot: string): Promise<void> {
    const names = (await readdir(directory)).sort(compareUnicodeCodePoints)
    for (const name of names) {
      const absolute = path.join(directory, name)
      const relative = relativeRoot
        ? `${relativeRoot}/${name}`
        : name
      result.push(relative)
      const stats = await stat(absolute)
      if (stats.isDirectory()) await visit(absolute, relative)
    }
  }
  await visit(root, '')
  return result
}

test('extracts one canonical archive into an exact verified staging tree', async () => {
  await withFixture(async (fixture) => {
    const verified = await extractVerifiedRuntimeArchive({
      admission: fixture.admission,
      canonicalManifestBytes: fixture.canonicalManifestBytes,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      staging: fixture.staging,
    })

    assert.deepEqual(verified.tree, {
      fileCount: 8,
      regularFileBytes: 149,
      symlinkCount: 1,
    })
    assert.equal(verified.stagingRoot, fixture.staging.path)
    assert.equal(
      verified.runtimeRoot,
      path.join(fixture.staging.path, 'runtime'),
    )
    assert.deepEqual(await listTree(verified.runtimeRoot), [
      'NOTICE',
      'THIRD_PARTY_NOTICES.md',
      'bundle',
      'bundle/bridge',
      'bundle/bridge/worker.py',
      'bundle/python',
      'bundle/python/bin',
      'bundle/python/bin/python3',
      'bundle/python/bin/python3.10',
      'bundle/site-packages',
      'bundle/site-packages/codex_cli_bin',
      'bundle/site-packages/codex_cli_bin/bin',
      'bundle/site-packages/codex_cli_bin/bin/codex',
      'licenses',
      'licenses/openai',
      'licenses/openai/LICENSE',
      'manifest.json',
      'provenance',
      'provenance/inputs.json',
      'sbom.spdx.json',
    ])
    assert.deepEqual(
      await readFile(path.join(verified.runtimeRoot, 'manifest.json')),
      fixture.canonicalManifestBytes,
    )
    assert.equal(
      await readlink(
        path.join(verified.runtimeRoot, 'bundle/python/bin/python3'),
      ),
      'python3.10',
    )
    assert.equal(
      (await stat(
        path.join(verified.runtimeRoot, 'bundle/python/bin/python3.10'),
      )).mode & 0o7777,
      0o755,
    )
  })
})

test('rejects an embedded NUL in a TAR path before recipient write', async () => {
  await withFixture(
    async (fixture) => {
      await assertArchiveError(
        () =>
          extractVerifiedRuntimeArchive({
            admission: fixture.admission,
            canonicalManifestBytes: fixture.canonicalManifestBytes,
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            staging: fixture.staging,
          }),
        'runtime_archive_unsafe',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    },
    { transformTar: withEmbeddedNulInNoticeHeader },
  )
})

test('rejects the full hostile path graph before recipient write', async (t) => {
  const cases: readonly {
    readonly name: string
    readonly transformTar: (tarBytes: Buffer) => Buffer
  }[] = [
    {
      name: 'parent traversal',
      transformTar: (tarBytes) =>
        rewriteTarPath(tarBytes, 'NOTICE', '../escape'),
    },
    {
      name: 'absolute path',
      transformTar: (tarBytes) =>
        rewriteTarPath(tarBytes, 'NOTICE', '/tmp/escape'),
    },
    {
      name: 'empty segment',
      transformTar: (tarBytes) =>
        rewriteTarPath(tarBytes, 'NOTICE', 'licenses//escape'),
    },
    {
      name: 'dot segment',
      transformTar: (tarBytes) =>
        rewriteTarPath(tarBytes, 'NOTICE', './NOTICE'),
    },
    {
      name: 'platform separator',
      transformTar: (tarBytes) =>
        rewriteTarPath(tarBytes, 'NOTICE', '..\\escape'),
    },
    {
      name: 'non-NFC Unicode',
      transformTar: (tarBytes) =>
        rewriteTarPath(
          tarBytes,
          'licenses/openai/LICENSE',
          'licenses/cafe\u0301',
        ),
    },
    {
      name: 'exact duplicate',
      transformTar: (tarBytes) =>
        rewriteTarPath(
          tarBytes,
          'THIRD_PARTY_NOTICES.md',
          'NOTICE',
        ),
    },
    {
      name: 'ASCII case-fold duplicate',
      transformTar: (tarBytes) =>
        rewriteTarPath(
          tarBytes,
          'THIRD_PARTY_NOTICES.md',
          'notice',
        ),
    },
    {
      name: 'full case-fold duplicate',
      transformTar: (tarBytes) => {
        const first = rewriteTarPath(
          tarBytes,
          'NOTICE',
          'licenses/straße',
        )
        return rewriteTarPath(
          first,
          'THIRD_PARTY_NOTICES.md',
          'licenses/strasse',
        )
      },
    },
    {
      name: 'folded directory identity',
      transformTar: (tarBytes) => {
        const first = rewriteTarPath(
          tarBytes,
          'bundle/bridge/worker.py',
          'licenses/Alpha/a',
        )
        return rewriteTarPath(
          first,
          'licenses/openai/LICENSE',
          'licenses/alpha/b',
        )
      },
    },
    {
      name: 'file-directory prefix conflict',
      transformTar: (tarBytes) =>
        rewriteTarPath(tarBytes, 'NOTICE', 'bundle'),
    },
    {
      name: 'symlink escape',
      transformTar: (tarBytes) =>
        rewriteTarLinkTarget(
          tarBytes,
          'bundle/python/bin/python3',
          '../../../../../../tmp/escape',
        ),
    },
    {
      name: 'entry count overflow',
      transformTar: (tarBytes) =>
        duplicateTarMember(tarBytes, 'NOTICE'),
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(
        async (fixture) => {
          await assertArchiveError(
            () =>
              extractVerifiedRuntimeArchive({
                admission: fixture.admission,
                canonicalManifestBytes:
                  fixture.canonicalManifestBytes,
                layout: fixture.layout,
                mutationAuthority: fixture.mutationAuthority,
                staging: fixture.staging,
              }),
            'runtime_archive_unsafe',
          )
          assert.deepEqual(await readdir(fixture.staging.path), [])
        },
        { transformTar: row.transformTar },
      )
    })
  }
})

test('rejects hardlink, sparse, special, extension, and unsafe mode headers', async (t) => {
  const typeCases = [
    ['hardlink', '1'],
    ['character device', '3'],
    ['block device', '4'],
    ['FIFO', '6'],
    ['contiguous file', '7'],
    ['PAX xattr', 'x'],
    ['global PAX', 'g'],
    ['GNU long path', 'L'],
    ['GNU long link', 'K'],
    ['GNU sparse', 'S'],
    ['socket-like unknown type', 's'],
  ] as const
  const cases: readonly {
    readonly name: string
    readonly transformTar: (tarBytes: Buffer) => Buffer
  }[] = [
    ...typeCases.map(([name, typeflag]) => ({
      name,
      transformTar: (tarBytes: Buffer) =>
        rewriteTarType(tarBytes, 'NOTICE', typeflag),
    })),
    {
      name: 'setuid mode',
      transformTar: (tarBytes) =>
        rewriteTarMode(tarBytes, 'NOTICE', 0o4644),
    },
    {
      name: 'setgid mode',
      transformTar: (tarBytes) =>
        rewriteTarMode(tarBytes, 'NOTICE', 0o2644),
    },
    {
      name: 'sticky mode',
      transformTar: (tarBytes) =>
        rewriteTarMode(tarBytes, 'NOTICE', 0o1644),
    },
    {
      name: 'unreviewed executable mode',
      transformTar: (tarBytes) =>
        rewriteTarMode(tarBytes, 'NOTICE', 0o755),
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(
        async (fixture) => {
          await assertArchiveError(
            () =>
              extractVerifiedRuntimeArchive({
                admission: fixture.admission,
                canonicalManifestBytes:
                  fixture.canonicalManifestBytes,
                layout: fixture.layout,
                mutationAuthority: fixture.mutationAuthority,
                staging: fixture.staging,
              }),
            'runtime_archive_unsafe',
          )
          assert.deepEqual(await readdir(fixture.staging.path), [])
        },
        { transformTar: row.transformTar },
      )
    })
  }
})

test('bounds gzip and TAR expansion and rejects corrupt archives before write', async (t) => {
  const cases: readonly {
    readonly name: string
    readonly expectedCode: 'runtime_archive_unsafe' | 'runtime_integrity_failed'
    readonly options: RuntimeArchiveFixtureOptions
  }[] = [
    {
      name: 'truncated gzip',
      expectedCode: 'runtime_integrity_failed',
      options: {
        transformArchive: (archiveBytes) =>
          archiveBytes.subarray(0, archiveBytes.byteLength - 8),
      },
    },
    {
      name: 'corrupt gzip',
      expectedCode: 'runtime_integrity_failed',
      options: {
        transformArchive: (archiveBytes) => {
          const mutated = Buffer.from(archiveBytes)
          mutated[Math.floor(mutated.byteLength / 2)] ^= 0xff
          return mutated
        },
      },
    },
    {
      name: 'truncated TAR',
      expectedCode: 'runtime_integrity_failed',
      options: {
        transformTar: (tarBytes) =>
          tarBytes.subarray(0, tarBytes.byteLength - 512),
      },
    },
    {
      name: 'corrupt TAR checksum',
      expectedCode: 'runtime_integrity_failed',
      options: { transformTar: corruptTarHeaderChecksum },
    },
    {
      name: 'missing member',
      expectedCode: 'runtime_integrity_failed',
      options: {
        transformTar: (tarBytes) =>
          removeTarMember(tarBytes, 'NOTICE'),
      },
    },
    {
      name: 'modified file bytes',
      expectedCode: 'runtime_integrity_failed',
      options: {
        transformTar: (tarBytes) =>
          corruptTarFileBytes(tarBytes, 'NOTICE'),
      },
    },
    {
      name: 'modified canonical manifest bytes',
      expectedCode: 'runtime_integrity_failed',
      options: {
        transformTar: (tarBytes) =>
          corruptTarFileBytes(tarBytes, 'manifest.json'),
      },
    },
    {
      name: 'individual file bound',
      expectedCode: 'runtime_archive_unsafe',
      options: {
        transformTar: (tarBytes) =>
          rewriteTarSize(tarBytes, 'NOTICE', 0o77777777777),
      },
    },
    {
      name: 'expanded TAR bound',
      expectedCode: 'runtime_archive_unsafe',
      options: {
        transformTar: (tarBytes) =>
          Buffer.concat([tarBytes, Buffer.alloc(512)]),
      },
    },
    {
      name: 'concatenated gzip expansion',
      expectedCode: 'runtime_archive_unsafe',
      options: {
        transformArchive: (archiveBytes) =>
          Buffer.concat([archiveBytes, archiveBytes]),
      },
    },
    {
      name: 'high-ratio decompression bomb',
      expectedCode: 'runtime_archive_unsafe',
      options: {
        transformTar: (tarBytes) =>
          Buffer.concat([tarBytes, Buffer.alloc(1024 * 1024)]),
      },
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(
        async (fixture) => {
          await assertArchiveError(
            () =>
              extractVerifiedRuntimeArchive({
                admission: fixture.admission,
                canonicalManifestBytes:
                  fixture.canonicalManifestBytes,
                layout: fixture.layout,
                mutationAuthority: fixture.mutationAuthority,
                staging: fixture.staging,
              }),
            row.expectedCode,
          )
          assert.deepEqual(await readdir(fixture.staging.path), [])
        },
        row.options,
      )
    })
  }
})

test('creates symlinks last and cleans owned staging after injected faults', async (t) => {
  await t.test('symlinks last', async () => {
    await withFixture(async (fixture) => {
      const order: Array<{
        readonly path: string
        readonly type: 'directory' | 'file' | 'symlink'
      }> = []
      await extractFixture(fixture, {
        beforeEntryMaterialization: async (entry) => {
          order.push(entry)
        },
      })
      const firstSymlink = order.findIndex(
        (entry) => entry.type === 'symlink',
      )
      const lastFile = order.findLastIndex(
        (entry) => entry.type === 'file',
      )
      assert.ok(firstSymlink > lastFile)
      assert.deepEqual(
        order.slice(firstSymlink).map((entry) => entry.type),
        ['symlink'],
      )
    })
  })

  await t.test('fault during file materialization', async () => {
    await withFixture(async (fixture) => {
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeEntryMaterialization: async (entry) => {
              if (entry.path === 'NOTICE') {
                throw new Error('injected file fault')
              }
            },
          }),
        'runtime_integrity_failed',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('fault before final verification', async () => {
    await withFixture(async (fixture) => {
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalVerification: async () => {
              throw new Error('injected verifier fault')
            },
          }),
        'runtime_storage_unavailable',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })
})

test('contains staging and parent races with no-follow and no-clobber writes', async (t) => {
  await t.test('staging inode substitution after pre-scan', async () => {
    await withFixture(async (fixture) => {
      const original = `${fixture.staging.path}.original`
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterPrescan: async () => {
              await rename(fixture.staging.path, original)
              await mkdir(fixture.staging.path, { mode: 0o700 })
            },
          }),
        'runtime_recovery_required',
      )
      assert.deepEqual(await readdir(original), [])
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('staging symlink substitution after pre-scan', async () => {
    await withFixture(async (fixture) => {
      const original = `${fixture.staging.path}.original`
      const outside = path.join(fixture.root, 'outside-staging')
      await mkdir(outside, { mode: 0o700 })
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterPrescan: async () => {
              await rename(fixture.staging.path, original)
              await symlink(outside, fixture.staging.path)
            },
          }),
        'runtime_cache_unsafe',
      )
      assert.deepEqual(await readdir(original), [])
      assert.deepEqual(await readdir(outside), [])
    })
  })

  await t.test('staging namespace substitution', async () => {
    await withFixture(async (fixture) => {
      const original = `${fixture.layout.namespaces.staging}.original`
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterPrescan: async () => {
              await rename(
                fixture.layout.namespaces.staging,
                original,
              )
              await mkdir(fixture.layout.namespaces.staging, {
                mode: 0o700,
              })
            },
          }),
        'runtime_recovery_required',
      )
      assert.deepEqual(
        await readdir(path.join(original, path.basename(fixture.staging.path))),
        [],
      )
      assert.deepEqual(
        await readdir(fixture.layout.namespaces.staging),
        [],
      )
    })
  })

  await t.test('nested parent symlink substitution', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const bridge = path.join(runtimeRoot, 'bundle/bridge')
      const saved = path.join(fixture.root, 'bridge-saved')
      const outside = path.join(fixture.root, 'outside-parent')
      await mkdir(outside, { mode: 0o700 })
      let raced = false
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeEntryMaterialization: async (entry) => {
              if (
                !raced &&
                entry.path === 'bundle/bridge/worker.py'
              ) {
                raced = true
                await rename(bridge, saved)
                await symlink(outside, bridge)
              }
            },
          }),
        'runtime_recovery_required',
      )
      assert.equal(raced, true)
      assert.deepEqual(await readdir(outside), [])
      assert.deepEqual(await readdir(saved), [])
    })
  })

  await t.test('final component symlink no-clobber', async () => {
    await withFixture(async (fixture) => {
      const outside = path.join(fixture.root, 'outside-file')
      await writeFile(outside, 'outside remains\n')
      let planted = false
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeEntryMaterialization: async (entry) => {
              if (!planted && entry.path === 'NOTICE') {
                planted = true
                await symlink(
                  outside,
                  path.join(fixture.staging.path, 'runtime/NOTICE'),
                )
              }
            },
          }),
        'runtime_recovery_required',
      )
      assert.equal(planted, true)
      assert.equal(await readFile(outside, 'utf8'), 'outside remains\n')
      assert.equal(
        (
          await lstat(
            path.join(fixture.staging.path, 'runtime/NOTICE'),
          )
        ).isSymbolicLink(),
        true,
      )
    })
  })
})

test('retains directory capabilities across exact check-use ancestor races', async (t) => {
  await t.test('file creation keeps exact-leaf no-clobber', async () => {
    await withFixture(async (fixture) => {
      const outside = path.join(fixture.root, 'outside-direct-leaf')
      const destination = path.join(
        fixture.staging.path,
        'runtime/NOTICE',
      )
      await writeFile(outside, 'direct leaf canary\n')
      let raced = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterParentCapabilityCheck: async (entry) => {
              if (
                !raced &&
                entry.operation === 'create' &&
                entry.type === 'file' &&
                entry.path === 'NOTICE'
              ) {
                raced = true
                await symlink(outside, destination)
              }
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(raced, true)
      assert.equal(await readFile(outside, 'utf8'), 'direct leaf canary\n')
      assert.equal((await lstat(destination)).isSymbolicLink(), true)
    })
  })

  await t.test('directory creation', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const bundle = path.join(runtimeRoot, 'bundle')
      const saved = path.join(fixture.root, 'bundle-saved')
      const outside = path.join(fixture.root, 'outside-directory-create')
      const canary = path.join(outside, 'canary')
      await mkdir(outside, { mode: 0o700 })
      await writeFile(canary, 'directory canary\n')
      let raced = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterParentCapabilityCheck: async (entry) => {
              if (
                !raced &&
                entry.operation === 'create' &&
                entry.type === 'directory' &&
                entry.path === 'bundle/bridge'
              ) {
                raced = true
                await rename(bundle, saved)
                await symlink(outside, bundle)
              }
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(raced, true)
      assert.deepEqual(await readdir(outside), ['canary'])
      assert.equal(await readFile(canary, 'utf8'), 'directory canary\n')
    })
  })

  await t.test('file creation', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const bridge = path.join(runtimeRoot, 'bundle/bridge')
      const saved = path.join(fixture.root, 'bridge-capability-saved')
      const outside = path.join(fixture.root, 'outside-file-create')
      const canary = path.join(outside, 'canary')
      await mkdir(outside, { mode: 0o700 })
      await writeFile(canary, 'file canary\n')
      let raced = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterParentCapabilityCheck: async (entry) => {
              if (
                !raced &&
                entry.operation === 'create' &&
                entry.type === 'file' &&
                entry.path === 'bundle/bridge/worker.py'
              ) {
                raced = true
                await rename(bridge, saved)
                await symlink(outside, bridge)
              }
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(raced, true)
      assert.deepEqual(await readdir(outside), ['canary'])
      assert.equal(await readFile(canary, 'utf8'), 'file canary\n')
    })
  })

  await t.test('symlink creation', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const bin = path.join(runtimeRoot, 'bundle/python/bin')
      const saved = path.join(fixture.root, 'bin-capability-saved')
      const outside = path.join(fixture.root, 'outside-symlink-create')
      const canary = path.join(outside, 'canary')
      await mkdir(outside, { mode: 0o700 })
      await writeFile(canary, 'symlink canary\n')
      let raced = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterParentCapabilityCheck: async (entry) => {
              if (
                !raced &&
                entry.operation === 'create' &&
                entry.type === 'symlink' &&
                entry.path === 'bundle/python/bin/python3'
              ) {
                raced = true
                await rename(bin, saved)
                await symlink(outside, bin)
              }
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(raced, true)
      assert.deepEqual(await readdir(outside), ['canary'])
      assert.equal(await readFile(canary, 'utf8'), 'symlink canary\n')
    })
  })

  await t.test('cleanup unlink', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const saved = path.join(fixture.root, 'runtime-cleanup-saved')
      const outside = path.join(fixture.root, 'outside-cleanup')
      const canary = path.join(outside, 'canary')
      const outsideNotice = path.join(outside, 'NOTICE')
      await mkdir(outside, { mode: 0o700 })
      await writeFile(canary, 'cleanup canary\n')
      let raced = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalVerification: async () => {
              throw new Error('force capability cleanup')
            },
            afterParentCapabilityCheck: async (entry) => {
              if (
                !raced &&
                entry.operation === 'cleanup' &&
                entry.type === 'file' &&
                entry.path === 'NOTICE'
              ) {
                raced = true
                await link(path.join(runtimeRoot, 'NOTICE'), outsideNotice)
                await rename(runtimeRoot, saved)
                await symlink(outside, runtimeRoot)
              }
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(raced, true)
      assert.deepEqual(
        (await readdir(outside)).sort(compareUnicodeCodePoints),
        ['NOTICE', 'canary'],
      )
      assert.equal(await readFile(outsideNotice, 'utf8'), 'AY-PLE notice\n')
      assert.equal(await readFile(canary, 'utf8'), 'cleanup canary\n')
    })
  })

  await t.test('cleanup refuses a swapped direct leaf', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const notice = path.join(runtimeRoot, 'NOTICE')
      const outside = path.join(fixture.root, 'outside-cleanup-leaf')
      await writeFile(outside, 'cleanup leaf canary\n')
      let raced = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalVerification: async () => {
              throw new Error('force direct-leaf cleanup')
            },
            afterParentCapabilityCheck: async (entry) => {
              if (
                !raced &&
                entry.operation === 'cleanup' &&
                entry.type === 'file' &&
                entry.path === 'NOTICE'
              ) {
                raced = true
                await unlink(notice)
                await link(outside, notice)
              }
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(raced, true)
      assert.equal(await readFile(outside, 'utf8'), 'cleanup leaf canary\n')
      assert.equal(await readFile(notice, 'utf8'), 'cleanup leaf canary\n')
    })
  })

  await t.test('cleanup requires a recorded file to still exist', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const notice = path.join(runtimeRoot, 'NOTICE')
      const movedNotice = path.join(fixture.root, 'NOTICE-moved')

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalVerification: async () => {
              await rename(notice, movedNotice)
              throw new Error('force cleanup after file rename')
            },
          }),
        'runtime_recovery_required',
      )

      assert.equal(await readFile(movedNotice, 'utf8'), 'AY-PLE notice\n')
    })
  })

  await t.test('cleanup requires the recorded runtime root to still exist', async () => {
    await withFixture(async (fixture) => {
      const runtimeRoot = path.join(fixture.staging.path, 'runtime')
      const movedRuntimeRoot = path.join(
        fixture.root,
        'runtime-cleanup-moved',
      )

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalVerification: async () => {
              await rename(runtimeRoot, movedRuntimeRoot)
              throw new Error('force cleanup after runtime root rename')
            },
          }),
        'runtime_recovery_required',
      )

      assert.deepEqual(await readdir(movedRuntimeRoot), [])
    })
  })
})

test('post-extraction verifier rejects tree, mode, manifest, and legal roster drift', async (t) => {
  const cases: readonly {
    readonly name: string
    readonly expectedCode:
      | 'runtime_integrity_failed'
      | 'runtime_recovery_required'
    readonly mutate: (runtimeRoot: string) => Promise<void>
  }[] = [
    {
      name: 'modified payload file',
      expectedCode: 'runtime_integrity_failed',
      mutate: (runtimeRoot) =>
        writeFile(
          path.join(runtimeRoot, 'bundle/bridge/worker.py'),
          'changed bytes!!\n',
        ),
    },
    {
      name: 'reviewed mode drift',
      expectedCode: 'runtime_integrity_failed',
      mutate: (runtimeRoot) =>
        chmod(
          path.join(runtimeRoot, 'bundle/python/bin/python3.10'),
          0o644,
        ),
    },
    {
      name: 'canonical manifest drift',
      expectedCode: 'runtime_integrity_failed',
      mutate: async (runtimeRoot) => {
        const manifestPath = path.join(runtimeRoot, 'manifest.json')
        const bytes = await readFile(manifestPath)
        bytes[0] ^= 1
        await writeFile(manifestPath, bytes)
      },
    },
    {
      name: 'missing NOTICE legal roster',
      expectedCode: 'runtime_recovery_required',
      mutate: (runtimeRoot) =>
        unlink(path.join(runtimeRoot, 'NOTICE')),
    },
    {
      name: 'modified provenance',
      expectedCode: 'runtime_integrity_failed',
      mutate: (runtimeRoot) =>
        writeFile(
          path.join(runtimeRoot, 'provenance/inputs.json'),
          '{"source":"drifted"}\n',
        ),
    },
    {
      name: 'extra top-level entry',
      expectedCode: 'runtime_recovery_required',
      mutate: (runtimeRoot) =>
        writeFile(path.join(runtimeRoot, 'EXTRA'), 'extra\n'),
    },
    {
      name: 'selected executable replaced by symlink',
      expectedCode: 'runtime_recovery_required',
      mutate: async (runtimeRoot) => {
        const executable = path.join(
          runtimeRoot,
          'bundle/python/bin/python3.10',
        )
        await unlink(executable)
        await symlink('python3', executable)
      },
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(async (fixture) => {
        await assertArchiveError(
          () =>
            extractFixture(fixture, {
              beforeFinalVerification: async () => {
                await row.mutate(
                  path.join(fixture.staging.path, 'runtime'),
                )
              },
            }),
          row.expectedCode,
        )
      })
    })
  }

  await t.test('external hardlink appears during final file verification', async () => {
    await withFixture(async (fixture) => {
      const outsideAlias = path.join(fixture.root, 'NOTICE-alias')
      let linked = false

      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalFileVerification: async (entry) => {
              if (!linked && entry.path === 'NOTICE') {
                linked = true
                await link(
                  path.join(fixture.staging.path, 'runtime/NOTICE'),
                  outsideAlias,
                )
              }
            },
          }),
        'runtime_integrity_failed',
      )

      assert.equal(linked, true)
      assert.equal(await readFile(outsideAlias, 'utf8'), 'AY-PLE notice\n')
    })
  })

  await t.test('staging mode changes immediately before final verification', async () => {
    await withFixture(async (fixture) => {
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            beforeFinalVerification: async () => {
              await chmod(fixture.staging.path, 0o777)
            },
          }),
        'runtime_recovery_required',
      )
      assert.equal((await stat(fixture.staging.path)).mode & 0o7777, 0o777)
    })
  })
})

test('maps materialization storage operation failures without masking integrity', async (t) => {
  for (const operation of [
    'directory_create',
    'directory_chmod',
    'file_create',
    'file_write',
    'file_chmod',
    'file_sync',
    'symlink_create',
  ] as const) {
    await t.test(operation, async () => {
      await withFixture(async (fixture) => {
        let injected = false
        await assertArchiveError(
          () =>
            extractFixture(fixture, {
              beforeStorageOperation: async (entry) => {
                if (!injected && entry.operation === operation) {
                  injected = true
                  throw new Error(`injected ${operation} failure`)
                }
              },
            }),
          'runtime_storage_unavailable',
        )
        assert.equal(injected, true)
        assert.deepEqual(await readdir(fixture.staging.path), [])
      })
    })
  }
})

test('binds archive and staging filesystem preconditions before verified output', async (t) => {
  await t.test('archive symlink', async () => {
    await withFixture(async (fixture) => {
      const original = `${fixture.layout.archive.path}.original`
      await rename(fixture.layout.archive.path, original)
      await symlink(original, fixture.layout.archive.path)
      await assertArchiveError(
        () => extractFixture(fixture),
        'runtime_cache_unsafe',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('archive digest drift', async () => {
    await withFixture(async (fixture) => {
      const drifted = Buffer.from(fixture.archiveBytes)
      drifted[Math.floor(drifted.byteLength / 2)] ^= 1
      await writeFile(fixture.layout.archive.path, drifted)
      await assertArchiveError(
        () => extractFixture(fixture),
        'runtime_integrity_failed',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('archive truncation', async () => {
    await withFixture(async (fixture) => {
      await writeFile(
        fixture.layout.archive.path,
        fixture.archiveBytes.subarray(
          0,
          fixture.archiveBytes.byteLength - 1,
        ),
      )
      await assertArchiveError(
        () => extractFixture(fixture),
        'runtime_integrity_failed',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('archive mutation between passes', async () => {
    await withFixture(async (fixture) => {
      const drifted = Buffer.from(fixture.archiveBytes)
      drifted[Math.floor(drifted.byteLength / 2)] ^= 1
      await assertArchiveError(
        () =>
          extractFixture(fixture, {
            afterPrescan: async () => {
              await writeFile(fixture.layout.archive.path, drifted)
            },
          }),
        'runtime_integrity_failed',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('canonical manifest byte argument drift', async () => {
    await withFixture(async (fixture) => {
      await assertArchiveError(
        () =>
          extractVerifiedRuntimeArchive({
            admission: fixture.admission,
            canonicalManifestBytes: Buffer.concat([
              fixture.canonicalManifestBytes,
              Buffer.from('\n'),
            ]),
            layout: fixture.layout,
            mutationAuthority: fixture.mutationAuthority,
            staging: fixture.staging,
          }),
        'runtime_integrity_failed',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })

  await t.test('nonempty staging root', async () => {
    await withFixture(async (fixture) => {
      const sentinel = path.join(fixture.staging.path, 'existing')
      await writeFile(sentinel, 'preserve\n')
      await assertArchiveError(
        () => extractFixture(fixture),
        'runtime_cache_unsafe',
      )
      assert.equal(await readFile(sentinel, 'utf8'), 'preserve\n')
    })
  })

  await t.test('staging mode drift', async () => {
    await withFixture(async (fixture) => {
      await chmod(fixture.staging.path, 0o755)
      await assertArchiveError(
        () => extractFixture(fixture),
        'runtime_cache_unsafe',
      )
      assert.deepEqual(await readdir(fixture.staging.path), [])
    })
  })
})
