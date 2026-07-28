import { describe, expect, it, vi } from 'vitest'
import type { MistakeNote } from './model/useMistakeNoteStore'
import {
  deleteServerMistakeNote,
  updateServerMistakeNoteStatus,
} from './persistMistakeNoteMutation'

const resolvedNote: MistakeNote = {
  id: 'note-1',
  source: 'git-lab',
  lessonId: '1-1',
  lessonTitle: 'Git 시작하기',
  command: 'git init',
  reason: '저장소가 없습니다.',
  correction: 'git init을 실행합니다.',
  createdAt: '2026-07-28T08:00:00.000Z',
  reviewedAt: '2026-07-28T08:05:00.000Z',
  status: 'resolved',
}

describe('persistMistakeNoteMutation', () => {
  it('upserts only the server-confirmed status response', async () => {
    const upsert = vi.fn()

    await updateServerMistakeNoteStatus('note-1', 'resolved', {
      update: vi.fn().mockResolvedValue({ note: resolvedNote }),
      upsert,
    })

    expect(upsert).toHaveBeenCalledWith(resolvedNote)
  })

  it('keeps the note when server deletion fails', async () => {
    const remove = vi.fn()

    await expect(deleteServerMistakeNote('note-1', {
      remove,
      delete: vi.fn().mockRejectedValue(new Error('delete unavailable')),
    })).rejects.toThrow('delete unavailable')

    expect(remove).not.toHaveBeenCalled()
  })
})
