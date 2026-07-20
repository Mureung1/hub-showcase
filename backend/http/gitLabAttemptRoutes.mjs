import { URL } from 'node:url'
import {
  listGitLabAttempts,
  recordGitLabAttempt,
  resetGitLabAttempts,
} from '../modules/git-lab/application/gitLabAttemptService.mjs'
import { createCorsHeaders, parseJsonBody } from '../shared/http.mjs'

export async function handleGitLabAttemptApiRequest({
  method,
  url,
  bodyText,
  gitLabAttemptRepository,
  mistakeNoteRepository,
}) {
  const pathname = new URL(url ?? '/', 'http://localhost').pathname

  if (method === 'OPTIONS' && pathname.startsWith('/api/git-lab/attempts')) {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (pathname !== '/api/git-lab/attempts') return null

  if (method === 'GET') {
    return { status: 200, body: listGitLabAttempts({ repository: gitLabAttemptRepository }), headers: createCorsHeaders() }
  }

  if (method === 'POST') {
    const parsedBody = parseJsonBody(bodyText)
    if (!parsedBody.ok) {
      return { status: 400, body: { error: 'invalid_json', message: '요청 JSON을 확인해주세요.' }, headers: createCorsHeaders() }
    }

    try {
      const result = recordGitLabAttempt({
        input: parsedBody.value,
        repository: gitLabAttemptRepository,
        mistakeNoteRepository,
      })

      return { status: 201, body: result, headers: createCorsHeaders() }
    } catch {
      return { status: 400, body: { error: 'invalid_git_lab_attempt', message: 'Git Lab 시도 정보를 확인해주세요.' }, headers: createCorsHeaders() }
    }
  }

  if (method === 'DELETE') {
    resetGitLabAttempts({ repository: gitLabAttemptRepository })

    return { status: 200, body: { attempts: [] }, headers: createCorsHeaders() }
  }

  return {
    status: 405,
    body: { error: 'method_not_allowed', message: '지원하지 않는 요청 방식입니다.' },
    headers: { ...createCorsHeaders(), Allow: 'GET, POST, DELETE, OPTIONS' },
  }
}