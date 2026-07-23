import assert from 'node:assert/strict'
import test from 'node:test'

import * as ayPleApplication from './index.js'

test('AY-PLE application workspace exposes no host behavior in Spine S0', () => {
  assert.deepEqual(Object.keys(ayPleApplication), [])
})
