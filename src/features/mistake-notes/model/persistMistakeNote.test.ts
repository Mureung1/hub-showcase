import { describe, expect, it, vi } from 'vitest'
import type { MistakeNote, MistakeNoteInput } from './useMistakeNoteStore'
import { persistMistakeNote } from './persistMistakeNote'

const input: MistakeNoteInput = {
  source: 'workspace',
  lessonId: 'mission-1',
  lessonTitle: '상태 관리',
  command: 'npm test',
  reason: '테스트 실패',
  correction: '상태 갱신 로직 수정',
}

const serverNote: MistakeNote = {
  ...input,
  id: 'server-note-1',
  createdAt: '2026-07-28T00:00:00.000Z',
  reviewedAt: null,
  status: 'open',
}

describe('persistMistakeNote', () => {
  it('stores only the server-confirmed note in server mode', async () => {
    const addLocal = vi.fn()
    const upsert = vi.fn()

    await expect(persistMistakeNote(input, {
      serverMode: true,
      createServer: async () => ({ note: serverNote }),
      addLocal,
      upsert,
    })).resolves.toEqual(serverNote)

    expect(addLocal).not.toHaveBeenCalled()
    expect(upsert).toHaveBeenCalledWith(serverNote)
  })

  it('surfaces server failures without adding a local placeholder', async () => {
    const addLocal = vi.fn()
    const upsert = vi.fn()

    await expect(persistMistakeNote(input, {
      serverMode: true,
      createServer: async () => { throw new Error('repository unavailable') },
      addLocal,
      upsert,
    })).rejects.toThrow('repository unavailable')

    expect(addLocal).not.toHaveBeenCalled()
    expect(upsert).not.toHaveBeenCalled()
  })

  it('keeps local creation for explicit mock mode', async () => {
    const localNote = { ...serverNote, id: 'local-note-1' }
    const addLocal = vi.fn(() => localNote)
    const createServer = vi.fn()

    await expect(persistMistakeNote(input, {
      serverMode: false,
      createServer,
      addLocal,
      upsert: vi.fn(),
    })).resolves.toEqual(localNote)

    expect(createServer).not.toHaveBeenCalled()
  })
})
