import { URL } from 'node:url'
import {
  listGitLabAttempts,
  recordGitLabAttempt,
  resetGitLabAttempts,
} from '../modules/git-lab/application/gitLabAttemptService.mjs'
import { createInMemoryGitLabAttemptRecorder } from '../modules/git-lab/adapters/inMemoryGitLabAttemptRecorder.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'
import { isRepositoryUnavailableError } from '../shared/repositoryError.mjs'

export async function handleGitLabAttemptApiRequest({
  method,
  url,
  bodyText,
  gitLabAttemptRepository,
  mistakeNoteRepository,
  gitLabAttemptRecorder,
}) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS' && pathname.startsWith('/api/git-lab/attempts')) {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname !== '/api/git-lab/attempts') return null

  if (method === 'GET') {
    return { status: 200, body: await listGitLabAttempts({ repository: gitLabAttemptRepository }), headers: createCorsHeaders() }
  }

  if (method === 'POST') {
    const parsedBody = parseJsonBody(bodyText)
    if (!parsedBody.ok) {
      return { status: 400, body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' }, headers: createCorsHeaders() }
    }

    try {
      const recorder = gitLabAttemptRecorder ?? createInMemoryGitLabAttemptRecorder({
        attemptRepository: gitLabAttemptRepository,
        mistakeNoteRepository,
      })
      const result = await recordGitLabAttempt({
        input: parsedBody.value,
        recorder,
      })

      return { status: 201, body: result, headers: createCorsHeaders() }
    } catch (error) {
      if (isRepositoryUnavailableError(error)) throw error

      return { status: 400, body: { error: 'invalid_git_lab_attempt', message: 'Git Lab 시도 정보를 확인해주세요.' }, headers: createCorsHeaders() }
    }
  }

  if (method === 'DELETE') {
    await resetGitLabAttempts({ repository: gitLabAttemptRepository })

    return { status: 200, body: { attempts: [] }, headers: createCorsHeaders() }
  }

  return {
    status: 405,
    body: { error: 'method_not_allowed', message: '지원하지 않는 요청 방식입니다.' },
    headers: { ...createCorsHeaders(), Allow: 'GET, POST, DELETE, OPTIONS' },
  }
}
