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

    expect(created).toMatchObject({
      status: 201,
      body: { note: { source: 'workspace', status: 'open' } },
    })
    const noteId = created.body.note.id

    await expect(
      handleMistakeNoteApiRequest({
        method: 'GET',
        url: '/api/mistake-notes',
        bodyText: '',
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 200, body: { notes: [{ id: noteId }] } })

    await expect(
      handleMistakeNoteApiRequest({
        method: 'PATCH',
        url: `/api/mistake-notes/${noteId}`,
        bodyText: JSON.stringify({ status: 'resolved' }),
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 200, body: { note: { id: noteId, status: 'resolved' } } })

    const contentUpdate = {
      source: 'algorithm',
      lessonId: 'bfs-1',
      lessonTitle: 'BFS 기초',
      command: 'visited 배열 누락',
      reason: '방문 상태를 기록하지 않았습니다.',
      correction: '큐에 넣을 때 방문 처리합니다.',
    }
    const updated = await handleMistakeNoteApiRequest({
      method: 'PATCH',
      url: `/api/mistake-notes/${noteId}`,
      bodyText: JSON.stringify(contentUpdate),
      mistakeNoteRepository,
    })

    expect(updated).toMatchObject({
      status: 200,
      body: {
        note: {
          ...contentUpdate,
          id: noteId,
          status: 'resolved',
          createdAt: created.body.note.createdAt,
          reviewedAt: expect.any(String),
        },
      },
    })

    await expect(
      handleMistakeNoteApiRequest({
        method: 'DELETE',
        url: `/api/mistake-notes/${noteId}`,
        bodyText: '',
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 200, body: { id: noteId } })
  })

  it('rejects invalid content and distinguishes missing notes', async () => {
    const mistakeNoteRepository = createInMemoryMistakeNoteRepository()

    await expect(
      handleMistakeNoteApiRequest({
        method: 'PATCH',
        url: '/api/mistake-notes/missing',
        bodyText: JSON.stringify(input),
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 404, body: { error: 'mistake_note_not_found' } })

    const created = await handleMistakeNoteApiRequest({
      method: 'POST',
      url: '/api/mistake-notes',
      bodyText: JSON.stringify(input),
      mistakeNoteRepository,
    })

    await expect(
      handleMistakeNoteApiRequest({
        method: 'PATCH',
        url: `/api/mistake-notes/${created.body.note.id}`,
        bodyText: JSON.stringify({ ...input, lessonTitle: '' }),
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 400, body: { error: 'invalid_mistake_note' } })

    await expect(
      handleMistakeNoteApiRequest({
        method: 'PATCH',
        url: `/api/mistake-notes/${created.body.note.id}`,
        bodyText: JSON.stringify({ ...input, status: 'resolved' }),
        mistakeNoteRepository,
      }),
    ).resolves.toMatchObject({ status: 400, body: { error: 'invalid_mistake_note' } })
  })
})
