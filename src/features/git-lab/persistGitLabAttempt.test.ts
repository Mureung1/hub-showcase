import { describe, expect, it, vi } from 'vitest'
import { persistGitLabAttempt } from './persistGitLabAttempt'

const request = {
  lessonId: '1-1',
  command: 'git commit -m "완료"',
  result: 'passed' as const,
  reason: '',
}

describe('persistGitLabAttempt', () => {
  it('confirms completion after the server saves the attempt', async () => {
    const onConfirmed = vi.fn()

    await persistGitLabAttempt(request, {
      serverMode: true,
      record: vi.fn().mockResolvedValue({ attempt: {}, mistakeNote: null }),
      onConfirmed,
    })

    expect(onConfirmed).toHaveBeenCalledOnce()
  })

  it('does not confirm completion when the server save fails', async () => {
    const onConfirmed = vi.fn()

    await expect(persistGitLabAttempt(request, {
      serverMode: true,
      record: vi.fn().mockRejectedValue(new Error('attempt unavailable')),
      onConfirmed,
    })).rejects.toThrow('attempt unavailable')

    expect(onConfirmed).not.toHaveBeenCalled()
  })
})
