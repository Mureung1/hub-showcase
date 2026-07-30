import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createMistakeNote,
  deleteMistakeNote,
  mistakeNoteEndpoint,
  resetMistakeNotes,
  updateMistakeNoteContent,
  updateMistakeNoteStatus,
} from './mistakeNoteClient'

const input = {
  source: 'workspace' as const,
  lessonId: 'mission-1',
  lessonTitle: 'HTTP practice',
  command: 'npm test',
  reason: 'Test failed',
  correction: 'Fix the status code.',
}

describe('mistakeNoteClient', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('creates a mistake note through the server API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8787')
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ note: { ...input, id: 'n1', status: 'open' } }),
    })) as unknown as typeof fetch

    await createMistakeNote(input, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith('http://localhost:8787/api/mistake-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })

  it('updates a mistake note status', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ note: { id: 'n1', status: 'resolved' } }),
    })) as unknown as typeof fetch

    await updateMistakeNoteStatus('n1', 'resolved', fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(mistakeNoteEndpoint('n1'), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved' }),
    })
  })

  it('updates all editable mistake note content', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ note: { ...input, id: 'n/1' } }),
    })) as unknown as typeof fetch

    await updateMistakeNoteContent('n/1', input, fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith('/api/mistake-notes/n%2F1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  })

  it('throws when a content update fails', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof fetch

    await expect(updateMistakeNoteContent('missing', input, fetchImpl)).rejects.toThrow('(404)')
  })

  it('deletes one note and resets all notes', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch

    await deleteMistakeNote('n1', fetchImpl)
    await resetMistakeNotes(fetchImpl)

    expect(fetchImpl).toHaveBeenCalledWith(mistakeNoteEndpoint('n1'), { method: 'DELETE' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/mistake-notes', { method: 'DELETE' })
  })
})
