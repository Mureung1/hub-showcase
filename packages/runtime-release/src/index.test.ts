import assert from 'node:assert/strict'
import test from 'node:test'

import * as runtimeRelease from './index.js'

test('runtime release workspace exposes no product behavior in Spine S0', () => {
  assert.deepEqual(Object.keys(runtimeRelease), [])
})
