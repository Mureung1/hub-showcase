import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'

import {
  captureCanonicalWorkspaceBundleSource,
} from '@ay-ple/semester-workspace'

import {
  PackageResourceVerificationError,
  verifyPackageResources,
  verifyPackageResourcesForTesting,
} from './package-resources.js'

type PackageFixture = Awaited<ReturnType<typeof createPackageFixture>>

test('captures declared package resources from the executable module and ignores ambient repository files', async () => {
  const fixture = await createPackageFixture()
  try {
    await writeFile(path.join(fixture.root, 'AGENTS.md'), 'ambient\n')
    await mkdir(path.join(fixture.root, '.agents'), { mode: 0o700 })
    await writeFile(
      path.join(fixture.root, '.agents', 'ambient.txt'),
      'ambient\n',
    )

    const verified = await verifyPackageResources({
      executableModuleUrl: fixture.executableModuleUrl,
    })

    assert.equal(verified.packageRoot, fixture.root)
    assert.equal(
      verified.compatibility.application.version,
      '0.1.0-preview.1',
    )
    assert.equal(
      verified.runtime.releaseDescriptorSha256,
      fixture.runtimeDescriptorSha256,
    )
    assert.equal(
      verified.workspace.source,
      verified.workspace.source,
    )
    assert.deepEqual(
      verified.staticSite.entryPaths,
      ['assets/app.js', 'index.html'],
    )
    assert.equal(
      Buffer.from(verified.staticSite.read('assets/app.js')!).toString(),
      'console.log("original")\n',
    )

    await writeFile(
      path.join(fixture.root, 'public', 'assets', 'app.js'),
      'console.log("mutated")\n',
    )
    const firstRead = verified.staticSite.read('assets/app.js')!
    firstRead.fill(0)
    assert.equal(
      Buffer.from(verified.staticSite.read('assets/app.js')!).toString(),
      'console.log("original")\n',
    )
  } finally {
    await fixture.cleanup()
  }
})

test('rejects malformed descriptor bytes and exact-shape drift', async (t) => {
  const cases: Array<{
    readonly name: string
    readonly mutate: (fixture: PackageFixture) => Promise<void>
  }> = [
    {
      name: 'invalid UTF-8',
      mutate: async (fixture) => {
        await writeFile(fixture.packageDescriptorPath, Uint8Array.of(0xff))
      },
    },
    {
      name: 'unknown descriptor field',
      mutate: async (fixture) => {
        const descriptor = JSON.parse(
          await readFile(fixture.packageDescriptorPath, 'utf8'),
        ) as Record<string, unknown>
        descriptor.ambientFallback = true
        await writeFile(
          fixture.packageDescriptorPath,
          JSON.stringify(descriptor),
        )
      },
    },
    {
      name: 'oversized descriptor',
      mutate: async (fixture) => {
        await writeFile(
          fixture.packageDescriptorPath,
          Buffer.alloc(1_048_577, 0x20),
        )
      },
    },
  ]

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      const fixture = await createPackageFixture()
      try {
        await fixtureCase.mutate(fixture)
        await assert.rejects(
          verifyPackageResources({
            executableModuleUrl: fixture.executableModuleUrl,
          }),
          PackageResourceVerificationError,
        )
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('rejects missing, extra, digest-drifted, linked, and non-file resources', async (t) => {
  const cases: Array<{
    readonly name: string
    readonly mutate: (fixture: PackageFixture) => Promise<void>
  }> = [
    {
      name: 'missing resource',
      mutate: (fixture) =>
        rm(path.join(fixture.root, 'resources', 'runtime', 'manifest.json')),
    },
    {
      name: 'unexpected static asset',
      mutate: (fixture) =>
        writeFile(
          path.join(fixture.root, 'public', 'assets', 'extra.js'),
          'extra\n',
        ),
    },
    {
      name: 'resource digest drift',
      mutate: (fixture) =>
        writeFile(
          path.join(fixture.root, 'resources', 'runtime', 'manifest.json'),
          '{}',
        ),
    },
    {
      name: 'symlinked static asset',
      mutate: async (fixture) => {
        const asset = path.join(
          fixture.root,
          'public',
          'assets',
          'app.js',
        )
        const outside = path.join(fixture.root, 'outside.js')
        await writeFile(outside, 'console.log("original")\n')
        await rm(asset)
        await symlink(outside, asset)
      },
    },
    {
      name: 'directory in place of file',
      mutate: async (fixture) => {
        const asset = path.join(
          fixture.root,
          'public',
          'assets',
          'app.js',
        )
        await rm(asset)
        await mkdir(asset)
      },
    },
    {
      name: 'descriptor inside workspace payload tree',
      mutate: async (fixture) => {
        const descriptor = JSON.parse(
          await readFile(fixture.packageDescriptorPath, 'utf8'),
        ) as {
          workspaceBundle: {
            descriptor: { resource: string }
          }
        }
        descriptor.workspaceBundle.descriptor.resource =
          'resources/workspace/bundle.json'
        await writeFile(
          fixture.packageDescriptorPath,
          JSON.stringify(descriptor),
        )
      },
    },
  ]

  for (const fixtureCase of cases) {
    await t.test(fixtureCase.name, async () => {
      const fixture = await createPackageFixture()
      try {
        await fixtureCase.mutate(fixture)
        await assert.rejects(
          verifyPackageResources({
            executableModuleUrl: fixture.executableModuleUrl,
          }),
          PackageResourceVerificationError,
        )
      } finally {
        await fixture.cleanup()
      }
    })
  }
})

test('rejects a package descriptor symlink without reading its target', async () => {
  const fixture = await createPackageFixture()
  try {
    const outside = path.join(fixture.root, 'outside-descriptor.json')
    await rename(fixture.packageDescriptorPath, outside)
    await symlink(outside, fixture.packageDescriptorPath)

    await assert.rejects(
      verifyPackageResources({
        executableModuleUrl: fixture.executableModuleUrl,
      }),
      PackageResourceVerificationError,
    )
  } finally {
    await fixture.cleanup()
  }
})

test('rejects a resource pathname swap after reading a matching file descriptor', async () => {
  const fixture = await createPackageFixture()
  let swapped = false
  try {
    await assert.rejects(
      verifyPackageResourcesForTesting(
        {
          executableModuleUrl: fixture.executableModuleUrl,
        },
        {
          async afterFileRead(resource) {
            if (
              swapped ||
              resource !== 'resources/runtime/manifest.json'
            ) {
              return
            }
            swapped = true
            const current = path.join(fixture.root, resource)
            const replacement = path.join(
              fixture.root,
              'resources',
              'runtime',
              'replacement.json',
            )
            await writeFile(
              replacement,
              await readFile(current),
            )
            await rename(replacement, current)
          },
        },
      ),
      PackageResourceVerificationError,
    )
    assert.equal(swapped, true)
  } finally {
    await fixture.cleanup()
  }
})

async function createPackageFixture() {
  const root = await realpath(
    await mkdtemp(path.join(tmpdir(), 'ay-ple-package-')),
  )
  await chmod(root, 0o700)
  const executable = path.join(root, 'dist', 'cli.js')
  const packageDescriptorPath = path.join(
    root,
    'resources',
    'package-resources.json',
  )
  await mkdir(path.dirname(executable), { mode: 0o700 })
  await mkdir(path.dirname(packageDescriptorPath), {
    mode: 0o700,
    recursive: true,
  })
  await mkdir(path.join(root, 'resources', 'runtime'), {
    mode: 0o700,
  })
  await mkdir(path.join(root, 'resources', 'workspace'), {
    mode: 0o700,
  })
  await mkdir(path.join(root, 'public', 'assets'), {
    mode: 0o700,
    recursive: true,
  })
  await writeFile(executable, 'export {}\n')

  const workspace = await captureCanonicalWorkspaceBundleSource()
  for (const file of workspace.files) {
    const target = path.join(
      root,
      'resources',
      'workspace',
      file.relativePath,
    )
    await mkdir(path.dirname(target), {
      mode: 0o700,
      recursive: true,
    })
    await writeFile(target, file.bytes, { mode: 0o644 })
  }
  const workspaceDescriptorBytes = Buffer.from(
    JSON.stringify(workspace.descriptor),
  )
  const workspaceDescriptorResource =
    'resources/workspace-bundle.json'
  await writeFile(
    path.join(root, workspaceDescriptorResource),
    workspaceDescriptorBytes,
  )

  const manifestBytes = runtimeManifestBytes()
  const runtimeManifestResource =
    'resources/runtime/manifest.json'
  await writeFile(
    path.join(root, runtimeManifestResource),
    manifestBytes,
  )
  const runtimeDescriptor = {
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
      packageResource: runtimeManifestResource,
      schemaVersion: 2,
      bytes: manifestBytes.byteLength,
      sha256: sha256(manifestBytes),
    },
  }
  const runtimeDescriptorBytes = Buffer.from(
    JSON.stringify(runtimeDescriptor),
  )
  const runtimeDescriptorResource =
    'resources/runtime/release.json'
  await writeFile(
    path.join(root, runtimeDescriptorResource),
    runtimeDescriptorBytes,
  )

  const compatibility = {
    schemaVersion: 1,
    application: {
      packageName: 'ay-ple',
      version: '0.1.0-preview.1',
    },
    platform: {
      os: 'darwin',
      arch: 'arm64',
      minimumMacosVersion: '13.5',
    },
    node: { range: '>=22.12 <23' },
    npm: { range: '>=10 <11' },
    browsers: [
      {
        name: 'Google Chrome',
        bundleId: 'com.google.Chrome',
        candidateLocations: {
          system: '/Applications/Google Chrome.app',
          userHomeRelative: 'Applications/Google Chrome.app',
        },
        minimumMajor: 130,
      },
      {
        name: 'Chromium',
        bundleId: 'org.chromium.Chromium',
        candidateLocations: {
          system: '/Applications/Chromium.app',
          userHomeRelative: 'Applications/Chromium.app',
        },
        minimumMajor: 130,
      },
    ],
    workspaceBundle: {
      descriptorResource: workspaceDescriptorResource,
      descriptorSha256: sha256(workspaceDescriptorBytes),
    },
  }
  const compatibilityBytes = Buffer.from(JSON.stringify(compatibility))
  const compatibilityResource =
    'resources/application-compatibility.json'
  await writeFile(
    path.join(root, compatibilityResource),
    compatibilityBytes,
  )

  const staticFiles = new Map<string, Buffer>([
    ['assets/app.js', Buffer.from('console.log("original")\n')],
    ['index.html', Buffer.from('<!doctype html><main>AY-PLE</main>\n')],
  ])
  for (const [relativePath, bytes] of staticFiles) {
    await writeFile(path.join(root, 'public', relativePath), bytes, {
      mode: 0o644,
    })
  }
  const staticEntries = [...staticFiles]
    .map(([relativePath, bytes]) => ({
      relativePath,
      type: 'file',
      mode: '0644',
      bytes: bytes.byteLength,
      sha256: sha256(bytes),
    }))
    .sort((left, right) =>
      left.relativePath < right.relativePath ? -1 : 1,
    )

  const packageDescriptor = {
    schemaVersion: 1,
    compatibilityDescriptor: fileDescriptor(
      compatibilityResource,
      compatibilityBytes,
    ),
    runtimeRelease: {
      descriptor: fileDescriptor(
        runtimeDescriptorResource,
        runtimeDescriptorBytes,
      ),
      canonicalManifest: fileDescriptor(
        runtimeManifestResource,
        manifestBytes,
      ),
    },
    workspaceBundle: {
      sourceRoot: 'resources/workspace',
      descriptor: fileDescriptor(
        workspaceDescriptorResource,
        workspaceDescriptorBytes,
      ),
    },
    staticSite: {
      sourceRoot: 'public',
      entries: staticEntries,
      completeTreeSha256: sha256(
        JSON.stringify({ entries: staticEntries }),
      ),
    },
  }
  await writeFile(
    packageDescriptorPath,
    JSON.stringify(packageDescriptor),
  )

  return {
    root,
    executableModuleUrl: pathToFileURL(executable),
    packageDescriptorPath,
    runtimeDescriptorSha256: sha256(runtimeDescriptorBytes),
    cleanup: () => rm(root, { recursive: true, force: true }),
  }
}

function fileDescriptor(resource: string, bytes: Uint8Array) {
  return {
    resource,
    type: 'file',
    mode: '0644',
    bytes: bytes.byteLength,
    sha256: sha256(bytes),
  } as const
}

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

function runtimeManifestBytes(): Buffer {
  type Entry = {
    readonly bytes: number
    readonly mode: '100644' | '100755'
    readonly path: string
    readonly sha256: string
    readonly type: 'file'
  }
  const entries: Entry[] = [
    file('NOTICE', 12, '1'),
    file('THIRD_PARTY_NOTICES.md', 18, '2'),
    file('bundle/bridge/worker.py', 7, '3'),
    file('bundle/python/bin/python3.10', 9, '4', '100755'),
    file(
      'bundle/site-packages/codex_cli_bin/bin/codex',
      11,
      '5',
      '100755',
    ),
    file('licenses/openai/LICENSE', 20, '6'),
    file('provenance/inputs.json', 30, '7'),
    file('sbom.spdx.json', 22, '8'),
  ]
  const bundleEntries = entries.filter((entry) =>
    entry.path.startsWith('bundle/'),
  )
  const treeEvidence = (tree: readonly Entry[]) => ({
    file_count: tree.length,
    regular_file_bytes: tree.reduce(
      (total, entry) => total + entry.bytes,
      0,
    ),
    roster_sha256: sha256(JSON.stringify({ entries: tree })),
    symlink_count: 0,
  })
  return Buffer.from(
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
    }),
  )

  function file(
    entryPath: string,
    bytes: number,
    digest: string,
    mode: '100644' | '100755' = '100644',
  ): Entry {
    return {
      bytes,
      mode,
      path: entryPath,
      sha256: digest.repeat(64),
      type: 'file',
    }
  }
}
