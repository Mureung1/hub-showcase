import { createCorsHeaders } from '../shared/http.mjs'

export const healthCheckPath = '/api/health'

export async function handleHealthApiRequest({ method, url, repositoryMode = 'in-memory' }) {
  if (url !== healthCheckPath) {
    return null
  }

  if (method === 'OPTIONS') {
    return { status: 204, body: null, headers: createCorsHeaders() }
  }

  if (method !== 'GET') {
    return {
      status: 405,
      body: { error: 'method_not_allowed', message: 'GET 요청만 지원합니다.' },
      headers: { ...createCorsHeaders(), Allow: 'GET, OPTIONS' },
    }
  }

  return {
    status: 200,
    body: { status: 'ok', repositoryMode },
    headers: createCorsHeaders(),
  }
}
