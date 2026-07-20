import { describe, expect, it, vi } from 'vitest'
import { gitLabAttemptsEndpoint, recordGitLabAttempt } from './gitLabAttemptClient'

describe('gitLabAttemptClient', () => {
  it('records Git Lab attempts through the server API', async () => {
    const request = { lessonId: 'git-1', command: 'git status', result: 'passed' as const }
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ attempt: { ...request, id: 'a1', reason: '', createdAt: 'now' }, mistakeNote: null }) })) as unknown as typeof fetch

    await recordGitLabAttempt(request, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(gitLabAttemptsEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  })
})