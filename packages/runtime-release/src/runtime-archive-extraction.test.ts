import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  stat,
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
import { admitRuntimeRelease } from './runtime-release-authority.js'

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
  return gzipSync(Buffer.concat(chunks), { level: 9 })
}

async function createRuntimeArchiveFixture(): Promise<RuntimeArchiveFixture> {
  const entries = fixtureEntries()
  const manifest = canonicalManifest(entries)
  const canonicalManifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  const archiveBytes = await canonicalArchive(
    canonicalManifestBytes,
    entries,
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
): Promise<void> {
  const fixture = await createRuntimeArchiveFixture()
  try {
    await run(fixture)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
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
