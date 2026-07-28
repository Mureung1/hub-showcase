/* global fetch */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createJudgeServer } from './judgeServer.mjs'

const servers = []

function listen(server) {
  servers.push(server)
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      resolve(`http://${address.address}:${address.port}`)
    })
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

describe('isolated Judge server', () => {
  it('executes code through the Judge API', async () => {
    const baseUrl = await listen(
      createJudgeServer({ logger: { error: vi.fn(), log: vi.fn() } }),
    )

    const response = await fetch(`${baseUrl}/api/code/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: '1 + 1', language: 'javascript' }),
    })

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({ success: true, result: '2' })
  })

  it('identifies itself through the health endpoint', async () => {
    const baseUrl = await listen(
      createJudgeServer({ logger: { error: vi.fn(), log: vi.fn() } }),
    )

    const response = await fetch(`${baseUrl}/api/health`)

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ status: 'ok', service: 'judge' })
  })
})
