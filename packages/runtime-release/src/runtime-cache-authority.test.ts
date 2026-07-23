import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { RuntimeReleaseAdmission } from './runtime-release-authority.js'
import {
  RuntimeReleaseAuthorityError,
  admitRuntimeRelease,
} from './runtime-release-authority.js'
import {
  createRuntimeCacheLayout,
  createRuntimeCacheQuarantinePlan,
  createRuntimeGenerationVerificationReceipt,
  createRuntimeQuarantineIdentity,
  createRuntimeStagingIdentity,
  inspectRuntimeCacheRoot,
} from './runtime-cache-authority.js'

function fixtureAdmission(): RuntimeReleaseAdmission {
  const payloadEntries = [
    {
      bytes: 12,
      mode: '100644',
      path: 'NOTICE',
      sha256: '1'.repeat(64),
      type: 'file',
    },
    {
      bytes: 18,
      mode: '100644',
      path: 'THIRD_PARTY_NOTICES.md',
      sha256: '2'.repeat(64),
      type: 'file',
    },
    {
      bytes: 7,
      mode: '100644',
      path: 'bundle/bridge/worker.py',
      sha256: '3'.repeat(64),
      type: 'file',
    },
    {
      bytes: 9,
      mode: '100755',
      path: 'bundle/python/bin/python3.10',
      sha256: '4'.repeat(64),
      type: 'file',
    },
    {
      bytes: 11,
      mode: '100755',
      path: 'bundle/site-packages/codex_cli_bin/bin/codex',
      sha256: '5'.repeat(64),
      type: 'file',
    },
    {
      bytes: 20,
      mode: '100644',
      path: 'licenses/openai/LICENSE',
      sha256: '6'.repeat(64),
      type: 'file',
    },
    {
      bytes: 30,
      mode: '100644',
      path: 'provenance/inputs.json',
      sha256: '7'.repeat(64),
      type: 'file',
    },
    {
      bytes: 22,
      mode: '100644',
      path: 'sbom.spdx.json',
      sha256: '8'.repeat(64),
      type: 'file',
    },
  ] as const
  const payloadEvidence = testTreeEvidence(payloadEntries)
  const bundleEvidence = testTreeEvidence(
    payloadEntries.filter((entry) => entry.path.startsWith('bundle/')),
  )
  const manifestBytes = Buffer.from(
    JSON.stringify({
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
        ...payloadEvidence,
        entries: payloadEntries,
      },
      bundle: {
        path: 'bundle',
        ...bundleEvidence,
      },
      input_provenance: {
        path: 'provenance/inputs.json',
        sha256: '7'.repeat(64),
      },
    }),
  )
  const digest = createSha256(manifestBytes)
  return admitRuntimeRelease({
    application: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    canonicalManifestResource: 'resources/runtime/manifest.json',
    canonicalManifestBytes: manifestBytes,
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
        bytes: manifestBytes.byteLength,
        sha256: digest,
      },
    },
    runtimeContractVersion: 1,
    target: 'darwin-arm64',
  })
}

test('content-addressed cache identities stay contained and collision-free', () => {
  const appDataRoot = '/Users/student/Library/Application Support/AY-PLE'
  const layout = createRuntimeCacheLayout(appDataRoot, fixtureAdmission())
  const staging = createRuntimeStagingIdentity(layout, 'b'.repeat(32))
  const quarantine = createRuntimeQuarantineIdentity(
    layout,
    'c'.repeat(32),
  )
  const naturalIdentity = {
    device: '10',
    inode: '20',
    ownerUid: 501,
  }
  const receipt = createRuntimeGenerationVerificationReceipt(
    layout,
    naturalIdentity,
  )
  const quarantinePlan = createRuntimeCacheQuarantinePlan(layout, {
    source: layout.generation,
    expectedIdentity: naturalIdentity,
    transactionNonce: 'd'.repeat(32),
  })
  const identities = [
    layout.archive.path,
    layout.partial.archivePath,
    layout.partial.journalPath,
    layout.generation.root,
    layout.generation.runtimeRoot,
    layout.generation.receiptPath,
    layout.lease.path,
    staging.path,
    quarantine.path,
  ]

  assert.equal(
    layout.cacheRoot,
    path.join(appDataRoot, 'runtime-cache', 'v1'),
  )
  assert.equal(
    layout.archive.path,
    path.join(
      layout.cacheRoot,
      'archives',
      `${'a'.repeat(64)}.tar.gz`,
    ),
  )
  assert.equal(new Set(identities).size, identities.length)
  for (const identityPath of identities) {
    assert.equal(isContained(layout.cacheRoot, identityPath), true)
  }
  assert.deepEqual(receipt, {
    schemaVersion: 1,
    kind: 'runtime_generation_verification',
    release: layout.identity,
    generationIdentity: naturalIdentity,
    manifest: {
      sha256: layout.identity.manifestSha256,
      payloadRosterSha256: layout.manifestEvidence.payloadRosterSha256,
      bundleRosterSha256: layout.manifestEvidence.bundleRosterSha256,
    },
  })
  assert.equal(
    quarantinePlan.source.path,
    layout.generation.root,
  )
  assert.deepEqual(
    quarantinePlan.source.expectedIdentity,
    naturalIdentity,
  )
  assert.notEqual(
    quarantinePlan.destination.path,
    quarantine.path,
  )
  assert.throws(
    () => createRuntimeStagingIdentity(layout, '../escape'),
    RuntimeReleaseAuthorityError,
  )
})

test('cache root inspection is read-only and records natural filesystem identity', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const before = await readdir(appDataRoot)
    const inspection = await inspectRuntimeCacheRoot({
      appDataRoot,
      expectedOwnerUid: currentUid(),
    })

    assert.equal(inspection.state, 'absent')
    assert.match(inspection.appDataRootIdentity.device, /^[0-9]+$/)
    assert.match(inspection.appDataRootIdentity.inode, /^[0-9]+$/)
    assert.deepEqual(await readdir(appDataRoot), before)
  })
})

test('safe existing cache namespaces retain owner-only directory identities', async () => {
  await withAppDataRoot(async (appDataRoot) => {
    const cacheRoot = path.join(appDataRoot, 'runtime-cache', 'v1')
    await mkdir(cacheRoot, { recursive: true, mode: 0o700 })
    await chmod(path.join(appDataRoot, 'runtime-cache'), 0o700)
    await chmod(cacheRoot, 0o700)
    for (const child of [
      'archives',
      'partials',
      'generations',
      'staging',
      'quarantine',
      'leases',
    ]) {
      const childPath = path.join(cacheRoot, child)
      await mkdir(childPath, { mode: 0o700 })
      await chmod(childPath, 0o700)
    }

    const inspection = await inspectRuntimeCacheRoot({
      appDataRoot,
      expectedOwnerUid: currentUid(),
    })

    assert.equal(inspection.state, 'present')
    assert.equal(inspection.cacheRootIdentity?.ownerUid, currentUid())
    assert.deepEqual(
      Object.keys(inspection.namespaceIdentities).sort(),
      [
        'archives',
        'generations',
        'leases',
        'partials',
        'quarantine',
        'staging',
      ],
    )
  })
})

test('symlink, unsafe owner/mode, and ambiguous residue fail closed without mutation', async (t) => {
  await t.test('symlink app data root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'runtime-cache-link-'))
    try {
      const actual = path.join(root, 'actual')
      const linked = path.join(root, 'linked')
      await mkdir(actual, { mode: 0o700 })
      await symlink(actual, linked)

      await assertCacheFailure(linked, 'runtime_cache_unsafe')
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

  await t.test('unsafe mode', async () => {
    await withAppDataRoot(async (appDataRoot) => {
      await chmod(appDataRoot, 0o755)
      try {
        await assertCacheFailure(appDataRoot, 'runtime_cache_unsafe')
      } finally {
        await chmod(appDataRoot, 0o700)
      }
    })
  })

  await t.test('owner mismatch', async () => {
    await withAppDataRoot(async (appDataRoot) => {
      await assertCacheFailure(
        appDataRoot,
        'runtime_cache_unsafe',
        currentUid() + 1,
      )
    })
  })

  await t.test('unknown cache namespace residue', async () => {
    await withAppDataRoot(async (appDataRoot) => {
      const cacheRoot = path.join(appDataRoot, 'runtime-cache', 'v1')
      await mkdir(cacheRoot, { recursive: true, mode: 0o700 })
      await chmod(path.join(appDataRoot, 'runtime-cache'), 0o700)
      await chmod(cacheRoot, 0o700)
      await writeFile(path.join(cacheRoot, 'current'), 'ambiguous')
      const before = await snapshot(cacheRoot)

      await assertCacheFailure(appDataRoot, 'runtime_recovery_required')

      assert.deepEqual(await snapshot(cacheRoot), before)
    })
  })

  await t.test('symlink cache namespace', async () => {
    await withAppDataRoot(async (appDataRoot) => {
      const cacheRoot = path.join(appDataRoot, 'runtime-cache', 'v1')
      const outside = path.join(appDataRoot, 'outside')
      await mkdir(cacheRoot, { recursive: true, mode: 0o700 })
      await mkdir(outside, { mode: 0o700 })
      await chmod(path.join(appDataRoot, 'runtime-cache'), 0o700)
      await chmod(cacheRoot, 0o700)
      await symlink(outside, path.join(cacheRoot, 'archives'))

      await assertCacheFailure(appDataRoot, 'runtime_cache_unsafe')
    })
  })
})

async function assertCacheFailure(
  appDataRoot: string,
  expectedCode: string,
  expectedOwnerUid = currentUid(),
): Promise<void> {
  await assert.rejects(
    inspectRuntimeCacheRoot({ appDataRoot, expectedOwnerUid }),
    (error: unknown) => {
      assert.equal(error instanceof RuntimeReleaseAuthorityError, true)
      const authorityError = error as RuntimeReleaseAuthorityError
      assert.equal(authorityError.failure.code, expectedCode)
      assert.equal(
        JSON.stringify(authorityError.failure).includes(appDataRoot),
        false,
      )
      return true
    },
  )
}

async function withAppDataRoot(
  run: (appDataRoot: string) => Promise<void>,
): Promise<void> {
  const temporary = await mkdtemp(path.join(tmpdir(), 'runtime-cache-root-'))
  const canonical = await realpath(temporary)
  await chmod(canonical, 0o700)
  try {
    await run(canonical)
  } finally {
    await rm(canonical, { force: true, recursive: true })
  }
}

async function snapshot(root: string): Promise<Array<{
  readonly mode: number
  readonly name: string
  readonly type: 'directory' | 'file' | 'symlink'
}>> {
  const entries = await readdir(root, { withFileTypes: true })
  return Promise.all(
    entries
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (entry) => {
        const stats = await lstat(path.join(root, entry.name))
        return {
          mode: stats.mode & 0o777,
          name: entry.name,
          type: entry.isSymbolicLink()
            ? 'symlink'
            : entry.isDirectory()
              ? 'directory'
              : 'file',
        }
      }),
  )
}

function currentUid(): number {
  const uid = process.getuid?.()
  assert.notEqual(uid, undefined)
  return uid as number
}

function isContained(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative === '' ||
    (!path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`))
  )
}

function createSha256(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

function testTreeEvidence(
  entries: readonly {
    readonly bytes: number
    readonly path: string
  }[],
) {
  return {
    file_count: entries.length,
    regular_file_bytes: entries.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    roster_sha256: createSha256(JSON.stringify({ entries })),
    symlink_count: 0,
  }
}
