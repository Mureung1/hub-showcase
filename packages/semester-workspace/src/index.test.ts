import assert from 'node:assert/strict'
import test from 'node:test'

import * as semesterWorkspace from './index.js'

test('semester workspace package exposes no product behavior in Spine S0', () => {
  assert.deepEqual(Object.keys(semesterWorkspace), [])
})
