import assert from 'node:assert/strict'
import test from 'node:test'

import * as landing from './index.js'

test('Landing workspace exposes only its strict display adapter and renderer', () => {
  assert.deepEqual(Object.keys(landing).sort(), [
    'LandingReleaseDisplayError',
    'decodeLandingReleaseDisplay',
    'renderLandingDocument',
  ])
})
