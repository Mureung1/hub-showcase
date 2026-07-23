import assert from 'node:assert/strict'
import test from 'node:test'

import * as landing from './index.js'

test('Landing workspace exposes no rendering behavior in Spine S0', () => {
  assert.deepEqual(Object.keys(landing), [])
})
