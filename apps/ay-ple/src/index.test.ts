import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import * as ayPleApplication from './index.js'

test('AY-PLE application workspace exposes no host behavior in Spine S0', () => {
  assert.deepEqual(Object.keys(ayPleApplication), [])
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
