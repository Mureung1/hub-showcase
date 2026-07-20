import { describe, expect, it } from 'vitest'
import { createInMemoryMistakeNoteRepository } from '../modules/mistake-notes/adapters/inMemoryMistakeNoteRepository.mjs'
import { handleMistakeNoteApiRequest } from './mistakeNoteRoutes.mjs'

const input = {
  source: 'workspace',
  lessonId: 'mission-1',
  lessonTitle: 'HTTP 실습',
  command: 'npm test',
  reason: '상태 코드가 다릅니다.',
  correction: '201 대신 200을 반환합니다.',
}

describe('mistake note routes', () => {
  it('creates, lists, updates, and deletes mistake notes', async () => {
    const mistakeNoteRepository = createInMemoryMistakeNoteRepository()

    const created = await handleMistakeNoteApiRequest({
      method: 'POST',
      url: '/api/mistake-notes',
      bodyText: JSON.stringify(input),
      mistakeNoteRepository,
    })

    expect(created).toMatchObject({ status: 201, body: { note: { source: 'workspace', status: 'open' } } })
    const noteId = created.body.note.id

    await expect(
      handleMistakeNoteApiRequest({ method: 'GET', url: '/api/mistake-notes', bodyText: '', mistakeNoteRepository }),
    ).resolves.toMatchObject({ status: 200, body: { notes: [{ id: noteId }] } })

    await expect(
      handleMistakeNoteApiRequest({
        method: 'PATCH',
        url: `/api/mistake-notes/${noteId}`,
        bodyText: JSON.stringify({ status: 'resolved' }),
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 200, body: { note: { id: noteId, status: 'resolved' } } })

    await expect(
      handleMistakeNoteApiRequest({ method: 'DELETE', url: `/api/mistake-notes/${noteId}`, bodyText: '', mistakeNoteRepository }),
    ).resolves.toMatchObject({ status: 200, body: { id: noteId } })
  })
})