import { describe, expect, it } from 'vitest'
import { mapMistakeNote } from './supabaseMistakeNoteRepository.mjs'

describe('supabaseMistakeNoteRepository', () => {
  it('normalizes database timestamps to stable ISO strings', () => {
    expect(mapMistakeNote({
      id: 'note-1',
      source: 'workspace',
      lesson_id: 'mission-1',
      lesson_title: 'HTTP 실습',
      command: 'npm test',
      reason: '실패 이유',
      correction: '수정 힌트',
      created_at: '2026-07-28T12:06:40.22+00:00',
      reviewed_at: '2026-07-28T12:07:41.3+00:00',
      status: 'resolved',
    })).toMatchObject({
      createdAt: '2026-07-28T12:06:40.220Z',
      reviewedAt: '2026-07-28T12:07:41.300Z',
    })
  })
})
