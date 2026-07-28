import assert from 'node:assert/strict'
import { connect } from 'node:net'
import test from 'node:test'

import {
  startFirstAssignmentConformanceProvider,
} from './first-assignment-conformance-provider.js'
import { withinDuration } from './local-provider-test-support.js'

test('force closes an incomplete First Assignment conformance provider connection during cleanup', async () => {
  const provider = await startFirstAssignmentConformanceProvider({
    expectedInputDigests: {
      'materials/lms-outline-notice.txt': '0'.repeat(64),
      'materials/problem-solving-syllabus.txt': '0'.repeat(64),
      'workspace-state.json': '0'.repeat(64),
    },
  })
  const url = new URL(provider.url)
  const socket = connect({
    host: url.hostname,
    port: Number(url.port),
  })
  try {
    await withinDuration(
      new Promise<void>((resolve, reject) => {
        socket.once('connect', resolve)
        socket.once('error', reject)
      }),
      1_000,
      'First Assignment conformance provider test socket did not connect',
    )
    socket.write(
      [
        'POST /v1/responses HTTP/1.1',
        `Host: ${url.host}`,
        'Content-Type: application/json',
        'Content-Length: 100',
        '',
        '{',
      ].join('\r\n'),
    )
    await withinDuration(
      provider.dispose(),
      5_000,
      'First Assignment conformance provider did not force-close its incomplete connection',
    )
    await withinDuration(
      new Promise<void>((resolve) => {
        if (socket.destroyed) resolve()
        else socket.once('close', () => resolve())
      }),
      1_000,
      'First Assignment conformance provider test socket remained open',
    )
    assert.equal(socket.destroyed, true)
  } finally {
    socket.destroy()
    await provider.dispose()
  }
})
