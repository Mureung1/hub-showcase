/* global fetch */
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCurriculumAgentServer } from './server.mjs'
import { RepositoryUnavailableError } from '../shared/repositoryError.mjs'

const servers = []
const temporaryDirectories = []
const fetchBlockedPorts = new Set([6000, 6665, 6666, 6667, 6668, 6669, 6697, 10080])

function createTestServer(options = {}) {
  const server = createCurriculumAgentServer({
    tracks: [],
    config: {},
    logger: { error: vi.fn(), log: vi.fn() },
    ...options,
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
    temporaryDirectories.splice(0).map((directory) =>
      fs.rm(directory, { recursive: true, force: true }),
    ),
  )
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
  it('serves profile API responses through Express', async () => {
    const baseUrl = await listen(createTestServer())

    const saveResponse = await fetch(`${baseUrl}/api/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: '예린',
        learningGoal: 'React 앱 완성하기',
        preferredTracks: ['frontend'],
        dailyStudyMinutes: 60,
        level: 'beginner',
      }),
    })
    const loadResponse = await fetch(`${baseUrl}/api/profile`)

    expect(saveResponse.status).toBe(200)
    await expect(loadResponse.json()).resolves.toMatchObject({ profile: { displayName: '예린' } })
  })

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

  it('serves static assets and falls back to the SPA entry for browser routes', async () => {
    const staticRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'icu-static-'))
    temporaryDirectories.push(staticRoot)
    await fs.writeFile(path.join(staticRoot, 'index.html'), '<main>ICU app</main>')
    await fs.writeFile(path.join(staticRoot, 'asset.txt'), 'asset')
    const baseUrl = await listen(createTestServer({ staticRoots: [staticRoot] }))

    const assetResponse = await fetch(`${baseUrl}/asset.txt`)
    const routeResponse = await fetch(`${baseUrl}/today/deep-link`)

    expect(await assetResponse.text()).toBe('asset')
    expect(routeResponse.status).toBe(200)
    expect(await routeResponse.text()).toContain('ICU app')
  })

  it('returns repository mode through the health endpoint', async () => {
    const baseUrl = await listen(createTestServer({ repositoryMode: 'sqlite' }))

    const response = await fetch(`${baseUrl}/api/health`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', repositoryMode: 'sqlite' })
  })

  it('returns the shared not found response for unknown API paths', async () => {
    const baseUrl = await listen(createTestServer())

    const response = await fetch(`${baseUrl}/api/unknown`)
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toMatchObject({ error: 'not_found' })
  })

  it('does not expose code execution from the Core API', async () => {
    const baseUrl = await listen(createTestServer())

    const response = await fetch(`${baseUrl}/api/code/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '1 + 1', language: 'javascript' }),
    })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body).toMatchObject({ error: 'not_found' })
  })

  it('returns 503 when a repository operation is unavailable', async () => {
    const progressRepository = {
      async listMissions() {
        throw new RepositoryUnavailableError({
          resource: 'learning_progress',
          operation: 'list',
          cause: { code: 'PGRST000' },
        })
      },
    }
    const baseUrl = await listen(createTestServer({ progressRepository }))

    const response = await fetch(`${baseUrl}/api/progress/today`)

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      error: 'repository_unavailable',
      message: '학습 데이터를 저장하거나 불러오지 못했습니다.',
    })
  })
})
