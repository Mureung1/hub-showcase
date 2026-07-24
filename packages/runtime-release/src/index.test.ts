import assert from 'node:assert/strict'
import test from 'node:test'

import * as runtimeRelease from './index.js'
import type {
  RuntimeReleaseDescriptor,
  RuntimeResolveProgress,
  RuntimeResolutionError,
  RuntimeResolutionErrorCode,
  RuntimeReleaseScaffold,
  RuntimeResolver,
  RuntimeResolverBundleInput,
  RuntimeSpawnBoundary,
  VerifiedRuntime,
} from './index.js'

test('runtime release package root exposes only the production resolver seam', () => {
  assert.deepEqual(Object.keys(runtimeRelease).sort(), [
    'RuntimeReleaseAuthorityError',
    'createRuntimeResolverBundle',
    'decodeRuntimeReleaseDescriptor',
  ])
  assert.equal(
    typeof runtimeRelease.decodeRuntimeReleaseDescriptor,
    'function',
  )
  assert.equal(
    typeof runtimeRelease.RuntimeReleaseAuthorityError,
    'function',
  )
  assert.equal(
    typeof runtimeRelease.createRuntimeResolverBundle,
    'function',
  )
  assert.equal(
    'RuntimeReleaseContractError' in runtimeRelease,
    false,
  )
  assert.equal(
    'createRuntimeResolverBundleForTesting' in runtimeRelease,
    false,
  )
})

type ProductionRuntimeReleaseTypes = [
  RuntimeReleaseDescriptor,
  RuntimeResolveProgress,
  RuntimeResolutionError,
  RuntimeResolutionErrorCode,
  RuntimeReleaseScaffold,
  RuntimeResolver,
  RuntimeResolverBundleInput,
  RuntimeSpawnBoundary,
  VerifiedRuntime,
]

void (undefined as unknown as ProductionRuntimeReleaseTypes)
