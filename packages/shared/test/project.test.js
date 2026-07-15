import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeProgress } from '../src/project.js'

test('normalizeProgress rounds and clamps values', () => {
  assert.equal(normalizeProgress(40.4), 40)
  assert.equal(normalizeProgress(-10), 0)
  assert.equal(normalizeProgress(140), 100)
  assert.equal(normalizeProgress(Number.NaN), 0)
})
