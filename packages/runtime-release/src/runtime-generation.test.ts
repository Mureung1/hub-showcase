import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type {
  RuntimeManifestEntry,
  RuntimeManifestFileEntry,
} from './canonical-runtime-manifest.js'
import { runtimeManifestRosterSha256 } from './canonical-runtime-manifest.js'
import {
  RuntimeReleaseAuthorityError,
  admitRuntimeRelease,
} from './runtime-release-authority.js'
import {
  verifyRuntimeGenerationTree,
} from './runtime-generation.js'

type GenerationFixture = Awaited<
  ReturnType<typeof createGenerationFixture>
>

test('complete-tree verification rejects drift before a Runtime spawn', async () => {
  const fixture = await createGenerationFixture()
  try {
    const verified = await verifyRuntimeGenerationTree({
      admission: fixture.admission,
      canonicalManifestBytes: fixture.canonicalManifestBytes,
      expectedDevice: fixture.device,
      expectedOwnerUid: process.getuid!(),
      runtimeRoot: fixture.runtimeRoot,
      signal: new AbortController().signal,
    })

    assert.equal(verified.runtimeIdentity.device, fixture.device)
    assert.equal(verified.runtimeIdentity.ownerUid, process.getuid!())
    assert.deepEqual(verified.tree, {
      fileCount: 8,
      regularFileBytes: fixture.regularFileBytes,
      symlinkCount: 0,
    })

    await writeFile(
      path.join(fixture.runtimeRoot, 'bundle/bridge/worker.py'),
      'tampered\n',
    )

    await assert.rejects(
      verifyRuntimeGenerationTree({
        admission: fixture.admission,
        canonicalManifestBytes: fixture.canonicalManifestBytes,
        expectedDevice: fixture.device,
        expectedOwnerUid: process.getuid!(),
        runtimeRoot: fixture.runtimeRoot,
        signal: new AbortController().signal,
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_integrity_failed',
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

async function createGenerationFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'ay-ple-generation-'))
  await chmod(root, 0o700)
  const runtimeRoot = path.join(root, 'runtime')
  await mkdir(runtimeRoot, { mode: 0o700 })
  const payload = new Map<string, { bytes: Buffer; mode: 0o644 | 0o755 }>([
    ['NOTICE', { bytes: Buffer.from('AY-PLE notice\n'), mode: 0o644 }],
    [
      'THIRD_PARTY_NOTICES.md',
      { bytes: Buffer.from('Third-party notice\n'), mode: 0o644 },
    ],
    [
      'bundle/bridge/worker.py',
      { bytes: Buffer.from('print("worker")\n'), mode: 0o644 },
    ],
    [
      'bundle/python/bin/python3.10',
      { bytes: Buffer.from('#!/bin/sh\nexit 0\n'), mode: 0o755 },
    ],
    [
      'bundle/site-packages/codex_cli_bin/bin/codex',
      { bytes: Buffer.from('#!/bin/sh\nexit 0\n'), mode: 0o755 },
    ],
    [
      'licenses/openai/LICENSE',
      { bytes: Buffer.from('Apache-2.0\n'), mode: 0o644 },
    ],
    [
      'provenance/inputs.json',
      { bytes: Buffer.from('{"source":"fixture"}\n'), mode: 0o644 },
    ],
    [
      'sbom.spdx.json',
      { bytes: Buffer.from('{"spdxVersion":"SPDX-2.3"}\n'), mode: 0o644 },
    ],
  ])
  const entries = [...payload.entries()]
    .map(([entryPath, value]): RuntimeManifestFileEntry => ({
      bytes: value.bytes.byteLength,
      mode: value.mode === 0o755 ? '100755' : '100644',
      path: entryPath,
      sha256: sha256(value.bytes),
      type: 'file',
    }))
    .sort((left, right) => compareUnicodeCodePoints(left.path, right.path))
  const bundleEntries = entries.filter((entry) =>
    entry.path.startsWith('bundle/'),
  )
  const manifest = {
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
      patch_stack_sha256: 'f'.repeat(64),
    },
    launch: {
      python_executable: 'bundle/python/bin/python3.10',
      bridge_entrypoint: 'bundle/bridge/worker.py',
      site_packages: 'bundle/site-packages',
      native_executable:
        'bundle/site-packages/codex_cli_bin/bin/codex',
    },
    payload: {
      ...treeEvidence(entries),
      entries,
    },
    bundle: {
      path: 'bundle',
      ...treeEvidence(bundleEntries),
    },
    input_provenance: {
      path: 'provenance/inputs.json',
      sha256: sha256(payload.get('provenance/inputs.json')!.bytes),
    },
  } as const
  const canonicalManifestBytes = Buffer.from(
    `${JSON.stringify(manifest, null, 2)}\n`,
  )
  const admission = admitRuntimeRelease({
    application: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    canonicalManifestBytes,
    canonicalManifestResource: 'resources/runtime/manifest.json',
    descriptor: {
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
        bytes: 1024,
        sha256: 'a'.repeat(64),
      },
      manifest: {
        packageResource: 'resources/runtime/manifest.json',
        schemaVersion: 2,
        bytes: canonicalManifestBytes.byteLength,
        sha256: sha256(canonicalManifestBytes),
      },
    },
    runtimeContractVersion: 1,
    target: 'darwin-arm64',
  })
  for (const [entryPath, value] of payload) {
    const destination = path.join(runtimeRoot, entryPath)
    await mkdir(path.dirname(destination), {
      recursive: true,
      mode: 0o755,
    })
    await writeFile(destination, value.bytes, {
      flag: 'wx',
      mode: value.mode,
    })
  }
  await writeFile(
    path.join(runtimeRoot, 'manifest.json'),
    canonicalManifestBytes,
    { flag: 'wx', mode: 0o644 },
  )
  const stats = await lstat(runtimeRoot, { bigint: true })
  return {
    admission,
    canonicalManifestBytes,
    device: String(stats.dev),
    regularFileBytes: entries.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    root,
    runtimeRoot,
  }
}

function treeEvidence(entries: readonly RuntimeManifestEntry[]) {
  const files = entries.filter(
    (entry): entry is RuntimeManifestFileEntry => entry.type === 'file',
  )
  return {
    file_count: files.length,
    regular_file_bytes: files.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    roster_sha256: runtimeManifestRosterSha256(entries),
    symlink_count: entries.length - files.length,
  }
}

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
