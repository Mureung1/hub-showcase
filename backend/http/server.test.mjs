/* global fetch */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCurriculumAgentServer } from './server.mjs'

const servers = []
const fetchBlockedPorts = new Set([6000, 6665, 6666, 6667, 6668, 6669, 6697, 10080])

function createTestServer() {
  const server = createCurriculumAgentServer({
    tracks: [],
    config: {},
    logger: { error: vi.fn(), log: vi.fn() },
  })
  servers.push(server)
  return server
}

function listen(server) {
  return new Promise((resolve) => {
    const listenOnAvailablePort = () => server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (fetchBlockedPorts.has(address.port)) {
        server.close(listenOnAvailablePort)
        return
      }

      resolve(`http://${address.address}:${address.port}`)
    })

    listenOnAvailablePort()
  })
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
    ),
  )
})

describe('curriculum agent Express server', () => {
  it('serves progress API responses through Express', async () => {
    const baseUrl = await listen(createTestServer())

    const response = await fetch(`${baseUrl}/api/progress/today`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(body).toMatchObject({ missions: {} })
  })

  it('keeps route-level method handling and Allow headers', async () => {
    const baseUrl = await listen(createTestServer())

    const response = await fetch(`${baseUrl}/api/progress/today`, { method: 'POST' })
    const body = await response.json()

    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, OPTIONS')
    expect(body).toMatchObject({ error: 'method_not_allowed' })
  })

  it('returns CORS preflight responses', async () => {
    const baseUrl = await listen(createTestServer())

    const response = await fetch(`${baseUrl}/api/mistake-notes`, { method: 'OPTIONS' })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-methods')).toContain('PATCH')
  })

  it('returns the shared not found response for unknown API paths', async () => {
    const baseUrl = await listen(createTestServer())

    const response = await fetch(`${baseUrl}/api/unknown`)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toMatchObject({ error: 'not_found' })
  })
})