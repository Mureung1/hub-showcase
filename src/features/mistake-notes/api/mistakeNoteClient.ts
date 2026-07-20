import type { MistakeNote, MistakeNoteInput, MistakeNoteStatus } from '../model/useMistakeNoteStore'

export type MistakeNotesResponse = {
  notes: MistakeNote[]
}

export type MistakeNoteResponse = {
  note: MistakeNote
}

export const mistakeNotesEndpoint = '/api/mistake-notes'

export function mistakeNoteEndpoint(id: string) {
  return `/api/mistake-notes/${encodeURIComponent(id)}`
}

export async function getMistakeNotes(fetchImpl: typeof fetch = fetch): Promise<MistakeNotesResponse> {
  const response = await fetchImpl(mistakeNotesEndpoint)
  if (!response.ok) throw new Error(`Mistake notes request failed (${response.status})`)

  return (await response.json()) as MistakeNotesResponse
}

export async function createMistakeNote(
  request: MistakeNoteInput,
  fetchImpl: typeof fetch = fetch,
): Promise<MistakeNoteResponse> {
  const response = await fetchImpl(mistakeNotesEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(`Create mistake note failed (${response.status})`)

  return (await response.json()) as MistakeNoteResponse
}

export async function updateMistakeNoteStatus(
  id: string,
  status: MistakeNoteStatus,
  fetchImpl: typeof fetch = fetch,
): Promise<MistakeNoteResponse> {
  const response = await fetchImpl(mistakeNoteEndpoint(id), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw new Error(`Update mistake note failed (${response.status})`)

  return (await response.json()) as MistakeNoteResponse
}

export async function deleteMistakeNote(id: string, fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(mistakeNoteEndpoint(id), { method: 'DELETE' })
  if (!response.ok) throw new Error(`Delete mistake note failed (${response.status})`)
}

export async function resetMistakeNotes(fetchImpl: typeof fetch = fetch) {
  const response = await fetchImpl(mistakeNotesEndpoint, { method: 'DELETE' })
  if (!response.ok) throw new Error(`Reset mistake notes failed (${response.status})`)
}