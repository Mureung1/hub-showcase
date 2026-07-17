import assert from 'node:assert/strict'
import { chmod, mkdir, mkdtemp, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { verifyProductionBundle } from './production-bundle.js'

const SOURCE_COMMIT = '8c68d4c87dc54d38861f5114e920c3de2efa5876'
const PATCH_STACK_SHA256 =
  'a8fcb62ca1838930f9e3b6dad5e345fab3724e609d005b77a0bde6c97b4a6015'
const PATCH_IDS = [
  '0001-response-last-router',
  '0002-bounded-notification-routing',
  '0003-router-review-corrections',
  '0004-notification-opt-out-config',
  '0005-strict-response-classification',
] as const
const BUNDLE_ROSTER_SHA256 =
  'abda2d5f81f0cae29d301de36c5266dce712ba912a842ab50a97b226297ad9a4'

type JsonObject = Record<string, unknown>

interface BundleFixture {
  artifactRoot: string
  canonicalManifestPath: string
  manifest: JsonObject
  root: string
  writeManifest(manifest?: JsonObject): Promise<void>
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function canonicalManifest(value: JsonObject): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function createBundleFixture(): Promise<BundleFixture> {
  const root = await mkdtemp(path.join(tmpdir(), 'codex-production-bundle-ts-'))
  const artifactRoot = path.join(root, 'artifact')
  const bundleRoot = path.join(artifactRoot, 'bundle')
  const pythonExecutable = path.join(bundleRoot, 'python/bin/python3.10')
  const bridgeEntrypoint = path.join(bundleRoot, 'bridge/worker.py')
  const sitePackages = path.join(bundleRoot, 'site-packages')
  const nativeExecutable = path.join(sitePackages, 'codex_cli_bin/bin/codex')
  const codexPathDirectory = path.join(
    sitePackages,
    'codex_cli_bin/codex-path',
  )

  await Promise.all([
    mkdir(path.dirname(pythonExecutable), { recursive: true }),
    mkdir(path.dirname(bridgeEntrypoint), { recursive: true }),
    mkdir(path.dirname(nativeExecutable), { recursive: true }),
    mkdir(codexPathDirectory, { recursive: true }),
  ])
  await Promise.all([
    writeFile(pythonExecutable, '#!/python\n'),
    writeFile(bridgeEntrypoint, 'worker\n'),
    writeFile(path.join(sitePackages, 'runtime.txt'), 'sdk\n'),
    writeFile(nativeExecutable, '#!/codex\n'),
  ])
  await Promise.all([
    chmod(pythonExecutable, 0o755),
    chmod(nativeExecutable, 0o755),
    symlink('python/bin/python3.10', path.join(bundleRoot, 'python-link')),
    symlink('python/bin/python3.10', path.join(bundleRoot, 'control-\x7f')),
    symlink('python/bin/python3.10', path.join(bundleRoot, 'unicode-é')),
    symlink('control-\x7f', path.join(bundleRoot, 'target-control')),
    symlink('unicode-é', path.join(bundleRoot, 'target-unicode')),
  ])

  const manifest: JsonObject = {
    bridge: {
      entrypoint: 'bundle/bridge/worker.py',
    },
    bundle: {
      file_count: 4,
      path: 'bundle',
      regular_file_bytes: 30,
      roster_sha256: BUNDLE_ROSTER_SHA256,
      symlink_count: 5,
    },
    installed: {
      site_packages: {
        path: 'bundle/site-packages',
      },
    },
    kind: 'codex_chat_runtime_bundle',
    python: {
      build: '20250818',
      distribution: 'CPython',
      executable: 'bundle/python/bin/python3.10',
      version: '3.10.18',
    },
    runtime: {
      binary_version: 'codex-cli 0.144.4',
      distribution: 'openai-codex-cli-bin',
      executable: 'bundle/site-packages/codex_cli_bin/bin/codex',
      version: '0.144.4',
    },
    schema_version: 1,
    source: {
      commit: SOURCE_COMMIT,
      patch_stack_sha256: PATCH_STACK_SHA256,
      patches: PATCH_IDS.map((id, index) => ({ id, order: index + 1 })),
      repository: 'https://github.com/openai/codex',
      tag: 'rust-v0.144.4',
      unpatched_manifest: {
        bytes: 20546,
        git_mode: '100644',
        path: 'manifests/unpatched.json',
        sha256:
          'ad3deefc4d2ea29dc289e226059d84155d1d8e2e43d4399da610a569737fec17',
      },
    },
    target: {
      architecture: 'arm64',
      id: 'darwin-arm64',
      system: 'Darwin',
    },
  }
  const canonicalManifestPath = path.join(root, 'canonical-manifest.json')
  const writeManifest = async (value: JsonObject = manifest): Promise<void> => {
    const encoded = canonicalManifest(value)
    await Promise.all([
      writeFile(path.join(artifactRoot, 'manifest.json'), encoded),
      writeFile(canonicalManifestPath, encoded),
    ])
  }
  await writeManifest()
  return { artifactRoot, canonicalManifestPath, manifest, root, writeManifest }
}

async function withFixture(
  run: (fixture: BundleFixture) => Promise<void>,
): Promise<void> {
  const fixture = await createBundleFixture()
  try {
    await run(fixture)
  } finally {
    await rm(fixture.root, { force: true, recursive: true })
  }
}

test('verifies a complete production bundle and returns only absolute launch metadata', async () => {
  await withFixture(async ({ artifactRoot, canonicalManifestPath }) => {
    const verified = await verifyProductionBundle(artifactRoot, {
      canonicalManifestPath,
    })

    assert.deepEqual(verified, {
      bridgeEntrypoint: path.join(artifactRoot, 'bundle/bridge/worker.py'),
      codexPathDirectory: path.join(
        artifactRoot,
        'bundle/site-packages/codex_cli_bin/codex-path',
      ),
      nativeExecutable: path.join(
        artifactRoot,
        'bundle/site-packages/codex_cli_bin/bin/codex',
      ),
      patchStackSha256: PATCH_STACK_SHA256,
      pythonBuild: '20250818',
      pythonExecutable: path.join(
        artifactRoot,
        'bundle/python/bin/python3.10',
      ),
      pythonVersion: '3.10.18',
      runtimeBinaryVersion: 'codex-cli 0.144.4',
      runtimeVersion: '0.144.4',
      sitePackages: path.join(artifactRoot, 'bundle/site-packages'),
      sourceCommit: SOURCE_COMMIT,
    })
    for (const value of Object.values(verified)) {
      if (typeof value === 'string' && value.startsWith(artifactRoot)) {
        assert.equal(path.isAbsolute(value), true)
      }
    }
  })
})

test('rejects a relative artifact root before reading a manifest', async () => {
  await assert.rejects(
    verifyProductionBundle('relative/artifact'),
    /artifact root must be absolute/,
  )
})

test('rejects a materialized manifest that differs byte-for-byte from canonical', async () => {
  await withFixture(async ({
    artifactRoot,
    canonicalManifestPath,
    manifest,
  }) => {
    await writeFile(
      path.join(artifactRoot, 'manifest.json'),
      JSON.stringify(manifest),
    )

    await assert.rejects(
      verifyProductionBundle(artifactRoot, { canonicalManifestPath }),
      /manifest differs from the canonical manifest/,
    )
  })
})

test('rejects exact source, runtime, and ordered patch provenance drift', async (t) => {
  const cases: Array<{
    name: string
    mutate(manifest: JsonObject): void
    expected: RegExp
  }> = [
    {
      name: 'source commit',
      mutate: (manifest) => {
        ;(manifest.source as JsonObject).commit = '0'.repeat(40)
      },
      expected: /source commit drift/,
    },
    {
      name: 'runtime version',
      mutate: (manifest) => {
        ;(manifest.runtime as JsonObject).version = '0.144.5'
      },
      expected: /runtime version drift/,
    },
    {
      name: 'runtime binary version',
      mutate: (manifest) => {
        ;(manifest.runtime as JsonObject).binary_version = 'codex-cli 0.144.5'
      },
      expected: /runtime binary version drift/,
    },
    {
      name: 'runtime distribution',
      mutate: (manifest) => {
        ;(manifest.runtime as JsonObject).distribution = 'other-runtime'
      },
      expected: /runtime distribution drift/,
    },
    {
      name: 'Python version',
      mutate: (manifest) => {
        ;(manifest.python as JsonObject).version = '3.10.19'
      },
      expected: /Python runtime drift/,
    },
    {
      name: 'Python build',
      mutate: (manifest) => {
        ;(manifest.python as JsonObject).build = 'other-build'
      },
      expected: /Python runtime drift/,
    },
    {
      name: 'source repository',
      mutate: (manifest) => {
        ;(manifest.source as JsonObject).repository = 'https://example.test/codex'
      },
      expected: /source repository or tag drift/,
    },
    {
      name: 'source tag',
      mutate: (manifest) => {
        ;(manifest.source as JsonObject).tag = 'rust-v0.144.5'
      },
      expected: /source repository or tag drift/,
    },
    {
      name: 'unpatched manifest',
      mutate: (manifest) => {
        const source = manifest.source as JsonObject
        const unpatched = source.unpatched_manifest as JsonObject
        unpatched.sha256 = '0'.repeat(64)
      },
      expected: /unpatched provenance drift/,
    },
    {
      name: 'patch order',
      mutate: (manifest) => {
        const source = manifest.source as JsonObject
        source.patches = [...(source.patches as JsonObject[])].reverse()
      },
      expected: /patch order drift/,
    },
    {
      name: 'patch stack digest',
      mutate: (manifest) => {
        ;(manifest.source as JsonObject).patch_stack_sha256 = 'f'.repeat(64)
      },
      expected: /patch stack digest drift/,
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(async (fixture) => {
        const manifest = cloneJson(fixture.manifest)
        row.mutate(manifest)
        await fixture.writeManifest(manifest)

        await assert.rejects(
          verifyProductionBundle(fixture.artifactRoot, {
            canonicalManifestPath: fixture.canonicalManifestPath,
          }),
          row.expected,
        )
      })
    })
  }
})

test('rejects schema, kind, and target drift', async (t) => {
  const cases: Array<{
    name: string
    mutate(manifest: JsonObject): void
    expected: RegExp
  }> = [
    {
      name: 'schema',
      mutate: (manifest) => {
        manifest.schema_version = 2
      },
      expected: /schema version drift/,
    },
    {
      name: 'kind',
      mutate: (manifest) => {
        manifest.kind = 'other_bundle'
      },
      expected: /kind drift/,
    },
    {
      name: 'target',
      mutate: (manifest) => {
        ;(manifest.target as JsonObject).architecture = 'x64'
      },
      expected: /target drift/,
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(async (fixture) => {
        const manifest = cloneJson(fixture.manifest)
        row.mutate(manifest)
        await fixture.writeManifest(manifest)

        await assert.rejects(
          verifyProductionBundle(fixture.artifactRoot, {
            canonicalManifestPath: fixture.canonicalManifestPath,
          }),
          row.expected,
        )
      })
    })
  }
})

test('rejects file bytes, executable mode, extra files, and symlink target drift in the full bundle roster', async (t) => {
  const cases: Array<{
    name: string
    mutate(fixture: BundleFixture): Promise<void>
  }> = [
    {
      name: 'file bytes',
      mutate: async ({ artifactRoot }) => {
        await writeFile(
          path.join(artifactRoot, 'bundle/bridge/worker.py'),
          'changed\n',
        )
      },
    },
    {
      name: 'executable mode',
      mutate: async ({ artifactRoot }) => {
        await chmod(
          path.join(artifactRoot, 'bundle/python/bin/python3.10'),
          0o644,
        )
      },
    },
    {
      name: 'extra file',
      mutate: async ({ artifactRoot }) => {
        await writeFile(path.join(artifactRoot, 'bundle/extra.txt'), 'extra\n')
      },
    },
    {
      name: 'symlink target',
      mutate: async ({ artifactRoot }) => {
        const link = path.join(artifactRoot, 'bundle/python-link')
        await unlink(link)
        await symlink('bridge/worker.py', link)
      },
    },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(async (fixture) => {
        await row.mutate(fixture)

        await assert.rejects(
          verifyProductionBundle(fixture.artifactRoot, {
            canonicalManifestPath: fixture.canonicalManifestPath,
          }),
          /bundle roster drift/,
        )
      })
    })
  }
})

test('rejects root and selected-file symlinks instead of resolving through them', async (t) => {
  await t.test('artifact root symlink', async () => {
    await withFixture(async (fixture) => {
      const linkedRoot = path.join(fixture.root, 'artifact-link')
      await symlink(fixture.artifactRoot, linkedRoot)

      await assert.rejects(
        verifyProductionBundle(linkedRoot, {
          canonicalManifestPath: fixture.canonicalManifestPath,
        }),
        /artifact root.*symlink/,
      )
    })
  })

  await t.test('selected executable symlink', async () => {
    await withFixture(async (fixture) => {
      const manifest = cloneJson(fixture.manifest)
      ;(manifest.python as JsonObject).executable = 'bundle/python-link'
      await fixture.writeManifest(manifest)

      await assert.rejects(
        verifyProductionBundle(fixture.artifactRoot, {
          canonicalManifestPath: fixture.canonicalManifestPath,
        }),
        /Python executable.*symlink/,
      )
    })
  })

  await t.test('escaping bundle symlink', async () => {
    await withFixture(async (fixture) => {
      const link = path.join(fixture.artifactRoot, 'bundle/python-link')
      await unlink(link)
      await writeFile(path.join(fixture.root, 'outside'), 'outside\n')
      await symlink('../../outside', link)

      await assert.rejects(
        verifyProductionBundle(fixture.artifactRoot, {
          canonicalManifestPath: fixture.canonicalManifestPath,
        }),
        /bundle symlink escapes the bundle/,
      )
    })
  })
})

test('rejects manifest paths that are absolute or escape the artifact root', async (t) => {
  const cases: Array<{
    name: string
    value: string
  }> = [
    { name: 'absolute', value: '/usr/bin/python3' },
    { name: 'parent escape', value: '../python3' },
  ]

  for (const row of cases) {
    await t.test(row.name, async () => {
      await withFixture(async (fixture) => {
        const manifest = cloneJson(fixture.manifest)
        ;(manifest.python as JsonObject).executable = row.value
        await fixture.writeManifest(manifest)

        await assert.rejects(
          verifyProductionBundle(fixture.artifactRoot, {
            canonicalManifestPath: fixture.canonicalManifestPath,
          }),
          /Python executable path is not a safe manifest-relative path/,
        )
      })
    })
  }
})
