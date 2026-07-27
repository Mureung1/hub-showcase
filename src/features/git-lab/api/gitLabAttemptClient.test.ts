import { afterEach, describe, expect, it, vi } from 'vitest'
import { gitLabAttemptsEndpoint, recordGitLabAttempt } from './gitLabAttemptClient'

describe('gitLabAttemptClient', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('records Git Lab attempts through the server API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8787')
    const request = { lessonId: 'git-1', command: 'git status', result: 'passed' as const }
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ attempt: { ...request, id: 'a1', reason: '', createdAt: 'now' }, mistakeNote: null }) })) as unknown as typeof fetch

    await recordGitLabAttempt(request, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(`http://localhost:8787${gitLabAttemptsEndpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  })
})
