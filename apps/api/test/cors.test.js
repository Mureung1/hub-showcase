import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'

import { createApp } from '../src/app.js'
import { readAllowedOrigins } from '../src/lib/cors.js'

const allowedOrigin = 'https://teamflow.example'
let server
let baseUrl

before(async () => {
  server = createApp({ allowedOrigins: [allowedOrigin] }).listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()))
  })
})

test('allowed web origins receive CORS headers and preflight support', async () => {
  const response = await fetch(`${baseUrl}/api/bootstrap`, {
    method: 'OPTIONS',
    headers: {
      origin: allowedOrigin,
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'authorization',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(response.headers.get('access-control-allow-origin'), allowedOrigin)
  assert.match(response.headers.get('access-control-allow-methods'), /PATCH/)
  assert.match(response.headers.get('access-control-allow-headers'), /Authorization/i)
})

test('unknown browser origins are not granted readable cross-origin responses', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { origin: 'https://untrusted.example' },
  })

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('access-control-allow-origin'), null)
})

test('origin-less health checks keep working and configured origins are normalized', async () => {
  const response = await fetch(`${baseUrl}/health`)

  assert.equal(response.status, 200)
  assert.deepEqual(
    readAllowedOrigins({ TEAMFLOW_ALLOWED_ORIGINS: ' https://teamflow.example/,http://localhost:5173 ' }),
    ['https://teamflow.example', 'http://localhost:5173'],
  )
})
