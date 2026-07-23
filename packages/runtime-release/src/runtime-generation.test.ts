import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rename,
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
  createRuntimeCacheLayout,
  createRuntimeQuarantineIdentity,
  createRuntimeStagingIdentity,
  inspectRuntimeCacheRoot,
  revalidateRuntimeCacheRootForMutation,
} from './runtime-cache-authority.js'
import {
  inspectPublishedRuntimeGeneration,
  publishVerifiedRuntimeGeneration,
  quarantineOwnedRuntimeGeneration,
  verifyPublishedRuntimeGeneration,
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

test('complete-tree verification rebinds the runtime pathname before return', async () => {
  const fixture = await createGenerationFixture()
  const preservedRuntime = `${fixture.runtimeRoot}.preserved`
  try {
    await assert.rejects(
      verifyRuntimeGenerationTree({
        admission: fixture.admission,
        canonicalManifestBytes: fixture.canonicalManifestBytes,
        expectedDevice: fixture.device,
        expectedOwnerUid: process.getuid!(),
        runtimeRoot: fixture.runtimeRoot,
        signal: new AbortController().signal,
        testOptions: {
          beforeFinalPathRebind: async () => {
            await rename(fixture.runtimeRoot, preservedRuntime)
            await mkdir(fixture.runtimeRoot, { mode: 0o700 })
          },
        },
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_integrity_failed',
    )
    assert.equal(await pathExists(preservedRuntime), true)
    assert.equal(await pathExists(fixture.runtimeRoot), true)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('publishes a staging receipt before rename and requires fresh tree readback', async () => {
  const fixture = await createGenerationFixture()
  try {
    const published = await publishVerifiedRuntimeGeneration({
      admission: fixture.admission,
      canonicalManifestBytes: fixture.canonicalManifestBytes,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
      staging: await createStagingSnapshot(fixture),
    })
    const stagingStats = await lstat(
      fixture.layout.generation.root,
      { bigint: true },
    )

    assert.equal(
      published.runtime.runtimeRoot,
      fixture.layout.generation.runtimeRoot,
    )
    assert.equal(
      published.receipt.generationIdentity.inode,
      String(stagingStats.ino),
    )
    assert.equal(await pathExists(fixture.staging.path), false)
    assert.equal(await pathExists(fixture.layout.generation.root), true)

    const reused = await verifyPublishedRuntimeGeneration({
      admission: fixture.admission,
      canonicalManifestBytes: fixture.canonicalManifestBytes,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
    })
    assert.deepEqual(reused?.runtime, published.runtime)

    await writeFile(
      path.join(
        fixture.layout.generation.runtimeRoot,
        'bundle/bridge/worker.py',
      ),
      'tampered after receipt\n',
    )
    await assert.rejects(
      verifyPublishedRuntimeGeneration({
        admission: fixture.admission,
        canonicalManifestBytes: fixture.canonicalManifestBytes,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: new AbortController().signal,
      }),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_integrity_failed',
    )

    const inspection = await inspectPublishedRuntimeGeneration({
      admission: fixture.admission,
      canonicalManifestBytes: fixture.canonicalManifestBytes,
      layout: fixture.layout,
      mutationAuthority: fixture.mutationAuthority,
      signal: new AbortController().signal,
    })
    assert.equal(inspection.kind, 'owned-invalid')
    assert.equal(
      inspection.kind === 'owned-invalid'
        ? inspection.authority.roster
        : undefined,
      'complete',
    )
    if (inspection.kind !== 'owned-invalid') {
      assert.fail('Expected an owned invalid generation')
    }
    const transactionNonce = '8'.repeat(32)
    const controller = new AbortController()
    const quarantine = await quarantineOwnedRuntimeGeneration(
      {
        admission: fixture.admission,
        authority: inspection.authority,
        canonicalManifestBytes: fixture.canonicalManifestBytes,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: controller.signal,
        transactionNonce,
      },
      {
        afterRename: async () => {
          controller.abort()
        },
      },
    )
    assert.equal(quarantine.cancelledAfterCommit, true)
    assert.equal(
      await pathExists(fixture.layout.generation.root),
      false,
    )
    assert.equal(
      await pathExists(
        createRuntimeQuarantineIdentity(
          fixture.layout,
          transactionNonce,
          'generation',
        ).path,
      ),
      true,
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('a competing final is preserved without publishing or trusting it', async () => {
  const fixture = await createGenerationFixture()
  try {
    await assert.rejects(
      publishVerifiedRuntimeGeneration(
        {
          admission: fixture.admission,
          canonicalManifestBytes: fixture.canonicalManifestBytes,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
          staging: await createStagingSnapshot(fixture),
        },
        {
          beforeFinalAbsenceCheck: async () => {
            await mkdir(fixture.layout.generation.root, {
              mode: 0o700,
            })
            await writeFile(
              path.join(fixture.layout.generation.root, 'foreign'),
              'preserve me\n',
            )
          },
        },
      ),
      (error: unknown) =>
        error instanceof RuntimeReleaseAuthorityError &&
        error.failure.code === 'runtime_recovery_required',
    )
    assert.equal(
      await pathExists(
        path.join(fixture.layout.generation.root, 'foreign'),
      ),
      true,
    )
    assert.equal(await pathExists(fixture.staging.path), true)
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

test('an abort after rename finishes strict readback without synthesizing ready', async () => {
  const fixture = await createGenerationFixture()
  const controller = new AbortController()
  try {
    const published = await publishVerifiedRuntimeGeneration(
      {
        admission: fixture.admission,
        canonicalManifestBytes: fixture.canonicalManifestBytes,
        layout: fixture.layout,
        mutationAuthority: fixture.mutationAuthority,
        signal: controller.signal,
        staging: await createStagingSnapshot(fixture),
      },
      {
        afterRename: async () => {
          controller.abort()
        },
      },
    )
    assert.equal(published.cancelledAfterCommit, true)
    assert.equal(
      (
        await verifyPublishedRuntimeGeneration({
          admission: fixture.admission,
          canonicalManifestBytes: fixture.canonicalManifestBytes,
          layout: fixture.layout,
          mutationAuthority: fixture.mutationAuthority,
          signal: new AbortController().signal,
        })
      )?.generationIdentity.inode,
      published.generationIdentity.inode,
    )
  } finally {
    await rm(fixture.root, { recursive: true, force: true })
  }
})

async function createStagingSnapshot(
  fixture: GenerationFixture,
) {
  const stagingTree = await verifyRuntimeGenerationTree({
    admission: fixture.admission,
    canonicalManifestBytes: fixture.canonicalManifestBytes,
    expectedDevice: fixture.device,
    expectedOwnerUid: process.getuid!(),
    runtimeRoot: fixture.runtimeRoot,
    signal: new AbortController().signal,
  })
  const stagingStats = await lstat(fixture.staging.path, {
    bigint: true,
  })
  return {
    kind: 'runtime_staging_verification_snapshot' as const,
    release: fixture.admission.identity,
    stagingRoot: fixture.staging.path,
    runtimeRoot: fixture.runtimeRoot,
    stagingIdentity: {
      device: String(stagingStats.dev),
      inode: String(stagingStats.ino),
      ownerUid: Number(stagingStats.uid),
    },
    runtimeIdentity: stagingTree.runtimeIdentity,
    tree: stagingTree.tree,
  }
}

async function createGenerationFixture() {
  const createdRoot = await mkdtemp(
    path.join(tmpdir(), 'ay-ple-generation-'),
  )
  await chmod(createdRoot, 0o700)
  const root = await realpath(createdRoot)
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
  const layout = createRuntimeCacheLayout(root, admission)
  for (const directory of [
    path.dirname(layout.cacheRoot),
    layout.cacheRoot,
    ...Object.values(layout.namespaces),
    path.join(
      layout.namespaces.generations,
      admission.identity.releaseId,
    ),
    path.dirname(layout.generation.root),
  ]) {
    await mkdir(directory, { recursive: true, mode: 0o700 })
    await chmod(directory, 0o700)
  }
  const staging = createRuntimeStagingIdentity(layout, '1'.repeat(32))
  await mkdir(staging.path, { mode: 0o700 })
  const runtimeRoot = path.join(staging.path, 'runtime')
  await mkdir(runtimeRoot, { mode: 0o700 })
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
  const inspection = await inspectRuntimeCacheRoot({
    appDataRoot: root,
  })
  const mutationAuthority =
    await revalidateRuntimeCacheRootForMutation(inspection)
  return {
    admission,
    canonicalManifestBytes,
    device: String(stats.dev),
    layout,
    mutationAuthority,
    regularFileBytes: entries.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    root,
    runtimeRoot,
    staging,
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

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await lstat(targetPath)
    return true
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return false
    }
    throw error
  }
}
