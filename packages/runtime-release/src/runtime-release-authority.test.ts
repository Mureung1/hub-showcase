import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  RuntimeReleaseAuthorityError,
  admitRuntimeRelease,
  runAfterRuntimeReleaseAdmission,
} from './runtime-release-authority.js'

type JsonObject = Record<string, unknown>

type FixtureEntry =
  | {
      readonly bytes: number
      readonly mode: '100644' | '100755'
      readonly path: string
      readonly sha256: string
      readonly type: 'file'
    }
  | {
      readonly path: string
      readonly target: string
      readonly type: 'symlink'
    }

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

function treeEvidence(entries: readonly FixtureEntry[]) {
  const files = entries.filter(
    (entry): entry is Extract<FixtureEntry, { type: 'file' }> =>
      entry.type === 'file',
  )
  return {
    file_count: files.length,
    regular_file_bytes: files.reduce((total, entry) => total + entry.bytes, 0),
    roster_sha256: sha256(JSON.stringify({ entries })),
    symlink_count: entries.length - files.length,
  }
}

function createReleaseFixture() {
  const entries: FixtureEntry[] = [
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
  ]
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
      sha256: '7'.repeat(64),
    },
  } as const
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`)
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
      bytes: 1024,
      sha256: 'a'.repeat(64),
    },
    manifest: {
      packageResource: 'resources/runtime/manifest.json',
      schemaVersion: 2,
      bytes: manifestBytes.byteLength,
      sha256: sha256(manifestBytes),
    },
  } as const
  return { descriptor, entries, manifest, manifestBytes }
}

function admissionInput(
  overrides: Partial<{
    descriptor: unknown
    manifestBytes: Uint8Array
    manifestResource: string
    applicationVersion: string
    target: string
    runtimeContractVersion: number
  }> = {},
) {
  const fixture = createReleaseFixture()
  const manifestBytes =
    overrides.manifestBytes ?? fixture.manifestBytes
  const descriptor =
    overrides.descriptor ??
    {
      ...fixture.descriptor,
      manifest: {
        ...fixture.descriptor.manifest,
        bytes: manifestBytes.byteLength,
        sha256: sha256(manifestBytes),
      },
    }
  return {
    descriptor,
    canonicalManifestResource:
      overrides.manifestResource ??
      'resources/runtime/manifest.json',
    canonicalManifestBytes: manifestBytes,
    application: {
      packageName: 'ay-ple',
      version: overrides.applicationVersion ?? '0.1.0-preview.1',
    },
    target: overrides.target ?? 'darwin-arm64',
    runtimeContractVersion: overrides.runtimeContractVersion ?? 1,
  }
}

async function listTree(root: string): Promise<string[]> {
  const result: string[] = []
  async function visit(directory: string, relativeRoot: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const relative = relativeRoot
        ? `${relativeRoot}/${entry.name}`
        : entry.name
      result.push(relative)
      if (entry.isDirectory()) {
        await visit(path.join(directory, entry.name), relative)
      }
    }
  }
  await visit(root, '')
  return result
}

test('admits one exact application, target, archive, and canonical manifest binding', () => {
  const admission = admitRuntimeRelease(admissionInput())

  assert.equal(admission.descriptor.launcher.version, '0.1.0-preview.1')
  assert.equal(admission.manifest.schema_version, 2)
  assert.deepEqual(admission.identity, {
    archiveSha256: 'a'.repeat(64),
    manifestSha256: admission.descriptor.manifest.sha256,
    releaseId: '0.1.0',
    runtimeContractVersion: 1,
    target: 'darwin-arm64',
  })
})

test('strictly rejects descriptor and canonical manifest shape, range, and identity drift', async (t) => {
  const fixture = createReleaseFixture()
  const cases: Array<{
    readonly name: string
    readonly expectedCode: string
    readonly input: ReturnType<typeof admissionInput>
  }> = [
    {
      name: 'descriptor unknown field',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        descriptor: { ...fixture.descriptor, useLatest: true },
      }),
    },
    {
      name: 'descriptor missing field',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        descriptor: withoutKey(fixture.descriptor, 'archive'),
      }),
    },
    {
      name: 'descriptor type drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        descriptor: {
          ...fixture.descriptor,
          archive: {
            ...fixture.descriptor.archive,
            bytes: '1024',
          },
        },
      }),
    },
    {
      name: 'descriptor range drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        descriptor: {
          ...fixture.descriptor,
          archive: {
            ...fixture.descriptor.archive,
            bytes: 0,
          },
        },
      }),
    },
    {
      name: 'application version drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({ applicationVersion: '0.1.0-preview.2' }),
    },
    {
      name: 'unsupported target',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({ target: 'linux-x64' }),
    },
    {
      name: 'contract drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({ runtimeContractVersion: 2 }),
    },
    {
      name: 'canonical manifest resource drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestResource: 'resources/runtime/other.json',
      }),
    },
    {
      name: 'manifest missing field',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          launch: undefined,
        }),
      }),
    },
    {
      name: 'manifest unknown field',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          selectedBy: 'remote-catalog',
        }),
      }),
    },
    {
      name: 'manifest type drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          payload: {
            ...fixture.manifest.payload,
            file_count: '8',
          },
        }),
      }),
    },
    {
      name: 'manifest range drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          payload: {
            ...fixture.manifest.payload,
            regular_file_bytes: -1,
          },
        }),
      }),
    },
    {
      name: 'manifest target identity drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          target: {
            ...fixture.manifest.target,
            architecture: 'x86_64',
          },
        }),
      }),
    },
    {
      name: 'manifest entry unknown field',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          payload: {
            ...fixture.manifest.payload,
            entries: fixture.entries.map((entry, index) =>
              index === 0 ? { ...entry, source: 'ambient' } : entry,
            ),
          },
        }),
      }),
    },
    {
      name: 'manifest roster digest drift',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          payload: {
            ...fixture.manifest.payload,
            roster_sha256: '0'.repeat(64),
          },
        }),
      }),
    },
    {
      name: 'manifest non-canonical entry order',
      expectedCode: 'runtime_incompatible',
      input: admissionInput({
        manifestBytes: encodeManifest({
          ...fixture.manifest,
          payload: {
            ...fixture.manifest.payload,
            entries: [...fixture.entries].reverse(),
          },
        }),
      }),
    },
    {
      name: 'manifest byte binding drift',
      expectedCode: 'runtime_integrity_failed',
      input: admissionInput({
        descriptor: fixture.descriptor,
        manifestBytes: Buffer.concat([
          fixture.manifestBytes,
          Buffer.from('\n'),
        ]),
      }),
    },
  ]

  for (const row of cases) {
    await t.test(row.name, () => {
      assert.throws(
        () => admitRuntimeRelease(row.input),
        (error: unknown) => {
          assert.equal(error instanceof RuntimeReleaseAuthorityError, true)
          assert.equal(
            (error as RuntimeReleaseAuthorityError).failure.code,
            row.expectedCode,
          )
          return true
        },
      )
    })
  }
})

test('application, target, archive, and manifest mismatch invoke no downstream effect', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'runtime-admission-red-'))
  let effectCalls = 0
  try {
    await mkdir(path.join(root, 'sentinel'))
    const before = await listTree(root)
    const fixture = createReleaseFixture()
    const mismatches = [
      admissionInput({ applicationVersion: '0.1.0-preview.2' }),
      admissionInput({ target: 'linux-x64' }),
      admissionInput({
        descriptor: {
          ...fixture.descriptor,
          archive: {
            ...fixture.descriptor.archive,
            assetName: 'different-runtime.tar.gz',
          },
        },
      }),
      admissionInput({
        descriptor: fixture.descriptor,
        manifestBytes: Buffer.concat([
          fixture.manifestBytes,
          Buffer.from('\n'),
        ]),
      }),
    ]

    for (const mismatch of mismatches) {
      await assert.rejects(
        runAfterRuntimeReleaseAdmission(mismatch, async () => {
          effectCalls += 1
          await writeFile(
            path.join(root, 'network-or-cache-effect'),
            'bad',
          )
          return 'unreachable'
        }),
        RuntimeReleaseAuthorityError,
      )
    }

    assert.equal(effectCalls, 0)
    assert.deepEqual(await listTree(root), before)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('caller-safe failure never contains descriptor URL, digest, path, or nested cause', () => {
  const fixture = createReleaseFixture()

  assert.throws(
    () =>
      admitRuntimeRelease(
        admissionInput({
          manifestBytes: Buffer.from('not-json'),
        }),
      ),
    (error: unknown) => {
      assert.equal(error instanceof RuntimeReleaseAuthorityError, true)
      const authorityError = error as RuntimeReleaseAuthorityError
      const projection = JSON.stringify(authorityError.failure)
      assert.equal(authorityError.failure.code, 'runtime_integrity_failed')
      assert.equal(projection.includes(fixture.descriptor.archive.url), false)
      assert.equal(
        projection.includes(fixture.descriptor.archive.sha256),
        false,
      )
      assert.equal(projection.includes('resources/runtime'), false)
      assert.equal(projection.includes('not-json'), false)
      assert.deepEqual(Object.keys(authorityError.failure).sort(), [
        'code',
        'remediation',
        'retryable',
      ])
      assert.equal(authorityError.evidence.kind, 'manifest_bytes_invalid')
      return true
    },
  )
})

function encodeManifest(value: JsonObject): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
}

function withoutKey<
  Value extends Record<string, unknown>,
  Key extends keyof Value,
>(value: Value, key: Key): Omit<Value, Key> {
  const copy = { ...value }
  delete copy[key]
  return copy
}
