import { apiUrl } from '../../../app/apiUrl'
import type { MistakeNote } from '../../mistake-notes/model/useMistakeNoteStore'

export type GitLabAttemptResult = 'passed' | 'failed'

export type GitLabAttemptRequest = {
  lessonId: string
  command: string
  result: GitLabAttemptResult
  reason?: string
  mistakeNote?: {
    lessonTitle: string
    reason: string
    correction: string
  }
}

export type GitLabAttempt = {
  id: string
  lessonId: string
  command: string
  result: GitLabAttemptResult
  reason: string
  createdAt: string
}

export type GitLabAttemptResponse = {
  attempt: GitLabAttempt
  mistakeNote: MistakeNote | null
}

export type GitLabAttemptsResponse = {
  attempts: GitLabAttempt[]
}

export const gitLabAttemptsEndpoint = '/api/git-lab/attempts'

export async function listGitLabAttempts(
  fetchImpl: typeof fetch = fetch,
): Promise<GitLabAttemptsResponse> {
  const response = await fetchImpl(apiUrl(gitLabAttemptsEndpoint))
  if (!response.ok) throw new Error(`List Git Lab attempts failed (${response.status})`)

  return (await response.json()) as GitLabAttemptsResponse
}

export async function recordGitLabAttempt(
  request: GitLabAttemptRequest,
  fetchImpl: typeof fetch = fetch,
): Promise<GitLabAttemptResponse> {
  const response = await fetchImpl(apiUrl(gitLabAttemptsEndpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  if (!response.ok) throw new Error(`Record Git Lab attempt failed (${response.status})`)

  return (await response.json()) as GitLabAttemptResponse
}
