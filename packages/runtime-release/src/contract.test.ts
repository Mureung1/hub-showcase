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
    applicationReleaseTag: 'application-v0.1.0-preview.1',
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
