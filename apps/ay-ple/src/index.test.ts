import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import * as ayPleApplication from './index.js'

test('AY-PLE application package root exposes only staged production startup', () => {
  assert.deepEqual(Object.keys(ayPleApplication).sort(), [
    'ApplicationStartupError',
    'admitApplicationStartup',
    'startDynamicLocalApplicationHost',
  ])
  assert.equal(
    'admitApplicationStartupForTesting' in ayPleApplication,
    false,
  )
  assert.equal(
    'verifyPackageResourcesForTesting' in ayPleApplication,
    false,
  )
  assert.equal(
    'runCompatibilityPreflightForTesting' in ayPleApplication,
    false,
  )
  assert.equal(
    'startDynamicLocalApplicationHostForTesting' in
      ayPleApplication,
    false,
  )
})

test('AY-PLE application locks its compile-only Module dependency direction', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { dependencies?: unknown }

  assert.deepEqual(packageJson.dependencies, {
    '@ay-ple/runtime-release': '0.0.0',
    '@ay-ple/semester-workspace': '0.0.0',
    '@ay-ple/server': '0.0.0',
  })
})
