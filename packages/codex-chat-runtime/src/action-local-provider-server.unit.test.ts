import assert from 'node:assert/strict'
import { connect } from 'node:net'
import test from 'node:test'

import { startActionLocalProvider } from './action-local-provider-server.js'
import { withinDuration } from './local-provider-test-support.js'

test('force closes an incomplete action provider connection during cleanup', async () => {
  const provider = await startActionLocalProvider()
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
      'Action provider test socket did not connect',
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
      'Action provider did not force-close its incomplete connection',
    )
    await withinDuration(
      new Promise<void>((resolve) => {
        if (socket.destroyed) resolve()
        else socket.once('close', () => resolve())
      }),
      1_000,
      'Action provider test socket remained open',
    )
    assert.equal(socket.destroyed, true)
  } finally {
    socket.destroy()
    await provider.dispose()
  }
})
