import { describe, expect, it } from 'vitest'
import { handleHealthApiRequest } from './healthRoutes.mjs'

describe('health routes', () => {
  it('returns ok with the current repository mode', async () => {
    await expect(
      handleHealthApiRequest({
        method: 'GET',
        url: '/api/health',
        repositoryMode: 'sqlite',
      }),
    ).resolves.toMatchObject({
      status: 200,
      body: { status: 'ok', repositoryMode: 'sqlite' },
    })
  })

  it('defaults repository mode to in-memory when not provided', async () => {
    await expect(
      handleHealthApiRequest({ method: 'GET', url: '/api/health' }),
    ).resolves.toMatchObject({
      status: 200,
      body: { status: 'ok', repositoryMode: 'in-memory' },
    })
  })

  it('returns null for unrelated paths', async () => {
    await expect(
      handleHealthApiRequest({ method: 'GET', url: '/api/curriculum/history' }),
    ).resolves.toBeNull()
  })

  it('rejects non-GET methods', async () => {
    await expect(
      handleHealthApiRequest({ method: 'POST', url: '/api/health' }),
    ).resolves.toMatchObject({ status: 405 })
  })
})
