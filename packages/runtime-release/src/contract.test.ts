import assert from 'node:assert/strict'
import test from 'node:test'

import {
  RuntimeReleaseContractError,
  decodeRuntimeReleaseDescriptor,
} from './contract.js'

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
    bytes: 512,
    sha256: 'b'.repeat(64),
  },
} as const

test('Runtime release descriptor exact-decodes its immutable identity', () => {
  assert.deepEqual(decodeRuntimeReleaseDescriptor(descriptor), descriptor)
  assert.throws(
    () => decodeRuntimeReleaseDescriptor({ ...descriptor, forceRepair: true }),
    RuntimeReleaseContractError,
  )
  assert.throws(
    () =>
      decodeRuntimeReleaseDescriptor({
        ...descriptor,
        distribution: {
          ...descriptor.distribution,
          applicationReleaseTag: 'preview-current',
        },
      }),
    RuntimeReleaseContractError,
  )
  assert.throws(
    () =>
      decodeRuntimeReleaseDescriptor({
        ...descriptor,
        archive: {
          ...descriptor.archive,
          assetName: 'runtime.tar.gz',
          url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/runtime.tar.gz',
        },
      }),
    RuntimeReleaseContractError,
  )
  assert.throws(
    () =>
      decodeRuntimeReleaseDescriptor({
        ...descriptor,
        archive: { ...descriptor.archive, sha256: 'not-a-digest' },
      }),
    RuntimeReleaseContractError,
  )
  assert.throws(
    () =>
      decodeRuntimeReleaseDescriptor({
        ...descriptor,
        distribution: {
          ...descriptor.distribution,
          runtimeAssetReleaseTag: 'runtime-v0.2.0',
        },
      }),
    RuntimeReleaseContractError,
  )
})

test('Runtime release descriptor rejects noncanonical GitHub repository URLs', async (t) => {
  const repositories = [
    {
      name: 'query',
      url: 'https://github.com/ay-ple/ay-ple?download=1',
    },
    {
      name: 'fragment',
      url: 'https://github.com/ay-ple/ay-ple#runtime',
    },
    {
      name: 'credentials',
      url: 'https://operator:secret@github.com/ay-ple/ay-ple',
    },
    {
      name: 'nondefault port',
      url: 'https://github.com:8443/ay-ple/ay-ple',
    },
    {
      name: 'dot segment normalization',
      url: 'https://github.com/ay-ple/..',
    },
    {
      name: 'percent segment normalization',
      url: 'https://github.com/%61y-ple/ay-ple',
    },
    {
      name: 'userinfo-like path segment',
      url: 'https://github.com/ay-ple@evil.test/ay-ple',
    },
  ] as const

  for (const repository of repositories) {
    await t.test(repository.name, () => {
      assertInvalidDescriptor(
        descriptorWithRepository(repository.url),
      )
    })
  }
})

test('Runtime release descriptor binds one exact canonical GitHub release URL', async (t) => {
  const archiveUrls = [
    {
      name: 'query',
      url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz?download=1',
    },
    {
      name: 'fragment',
      url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz#runtime',
    },
    {
      name: 'credentials',
      url: 'https://operator:secret@github.com/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'nondefault port',
      url: 'https://github.com:8443/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'dot segment normalization',
      url: 'https://github.com/ay-ple/ay-ple/releases/./download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'percent segment normalization',
      url: 'https://github.com/ay-ple/ay-ple/releases/%64ownload/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'different authority',
      url: 'https://evil.test/ay-ple/ay-ple/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'noncanonical release path',
      url: 'https://github.com/ay-ple/ay-ple/release/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'different repository binding',
      url: 'https://github.com/ay-ple/runtime-mirror/releases/download/runtime-v0.1.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
    {
      name: 'different release tag binding',
      url: 'https://github.com/ay-ple/ay-ple/releases/download/runtime-v0.2.0/ay-ple-runtime-0.1.0-darwin-arm64.tar.gz',
    },
  ] as const

  for (const archiveUrl of archiveUrls) {
    await t.test(archiveUrl.name, () => {
      assertInvalidDescriptor({
        ...descriptor,
        archive: {
          ...descriptor.archive,
          url: archiveUrl.url,
        },
      })
    })
  }
})

function descriptorWithRepository(repository: string) {
  return {
    ...descriptor,
    distribution: {
      ...descriptor.distribution,
      repository,
    },
    archive: {
      ...descriptor.archive,
      url:
        `${repository}/releases/download/` +
        `${descriptor.distribution.runtimeAssetReleaseTag}/` +
        descriptor.archive.assetName,
    },
  }
}

function assertInvalidDescriptor(value: unknown): void {
  assert.throws(
    () => decodeRuntimeReleaseDescriptor(value),
    (error: unknown) => {
      assert.equal(error instanceof RuntimeReleaseContractError, true)
      assert.equal(
        (error as RuntimeReleaseContractError).name,
        'RuntimeReleaseContractError',
      )
      assert.equal(
        (error as RuntimeReleaseContractError).message,
        'The Runtime release descriptor is invalid.',
      )
      return true
    },
  )
}
