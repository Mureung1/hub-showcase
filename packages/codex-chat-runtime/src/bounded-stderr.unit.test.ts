import assert from 'node:assert/strict'
import test from 'node:test'

import { BoundedStderrCapture } from './bounded-stderr.js'

test('retains only the newest copied stderr chunks within item and byte limits', () => {
  const capture = new BoundedStderrCapture({ maxFrames: 2, maxBytes: 5 })
  const first = Buffer.from('ab')
  capture.append(first)
  first.fill(0x78)
  capture.append(Buffer.from('cd'))
  capture.append(Buffer.from('ef'))

  assert.deepEqual(capture.snapshot(), {
    bytes: 4,
    frames: 2,
    text: 'cdef',
    truncated: true,
  })

  capture.append(Buffer.from('123456'))
  assert.deepEqual(capture.snapshot(), {
    bytes: 5,
    frames: 1,
    text: '23456',
    truncated: true,
  })
})
