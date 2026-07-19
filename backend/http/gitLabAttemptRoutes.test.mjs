import { describe, expect, it } from 'vitest'
import { createInMemoryGitLabAttemptRepository } from '../modules/git-lab/adapters/inMemoryGitLabAttemptRepository.mjs'
import { createInMemoryMistakeNoteRepository } from '../modules/mistake-notes/adapters/inMemoryMistakeNoteRepository.mjs'
import { handleGitLabAttemptApiRequest } from './gitLabAttemptRoutes.mjs'

describe('git lab attempt routes', () => {
  it('records a failed attempt and creates a linked mistake note', async () => {
    const gitLabAttemptRepository = createInMemoryGitLabAttemptRepository()
    const mistakeNoteRepository = createInMemoryMistakeNoteRepository()

    await expect(
      handleGitLabAttemptApiRequest({
        method: 'POST',
        url: '/api/git-lab/attempts',
        bodyText: JSON.stringify({
          lessonId: 'git-branch-1',
          command: 'git merge main',
          result: 'failed',
          reason: '목표 그래프와 다릅니다.',
          mistakeNote: {
            lessonTitle: '브랜치 병합',
            reason: '잘못된 브랜치에서 병합했습니다.',
            correction: 'feature 브랜치로 이동한 뒤 병합합니다.',
          },
        }),
        gitLabAttemptRepository,
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({
      status: 201,
      body: {
        attempt: { lessonId: 'git-branch-1', result: 'failed' },
        mistakeNote: { source: 'git-lab', command: 'git merge main' },
      },
    })
  })
})